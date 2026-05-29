const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const env = require('../../config/env');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(admin) {
  return jwt.sign(
    {
      sub: String(admin.id),
      email: admin.email,
      jti: crypto.randomUUID()
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function signRefreshToken(admin) {
  return jwt.sign(
    {
      sub: String(admin.id),
      email: admin.email,
      jti: crypto.randomUUID()
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

function adminProfile(admin) {
  const roleDetails = admin.adminUserRoles.map((r) => ({
    name: r.role.name,
    title: r.role.title,
    icon: r.role.icon,
    color: r.role.color
  }));

  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    avatar: admin.avatar,
    isActive: admin.isActive,
    roles: roleDetails.map((r) => r.name),
    roleDetails,
    permissions: Array.from(
      new Set(
        admin.adminUserRoles.flatMap((r) =>
          r.role.rolePermissions.map((rp) => rp.permission.key)
        )
      )
    )
  };
}

async function saveRefreshToken(adminId, refreshToken, req) {
  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : null;

  await prisma.refreshToken.create({
    data: {
      adminId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      createdByIp: req.ip,
      userAgent: req.get('user-agent') || null
    }
  });
}

async function login(input, req) {
  const admin = await prisma.adminUser.findUnique({
    where: { email: input.email },
    include: {
      adminUserRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!admin || !admin.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(input.password, admin.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  const accessToken = signAccessToken(admin);
  const refreshToken = signRefreshToken(admin);

  await saveRefreshToken(admin.id, refreshToken, req);

  await audit(req, {
    action: 'LOGIN',
    entity: 'AdminUser',
    entityId: admin.id,
    details: { email: admin.email }
  });

  return {
    accessToken,
    refreshToken,
    admin: adminProfile(admin)
  };
}

async function refresh(input, req) {
  let payload;
  try {
    payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const oldHash = hashToken(input.refreshToken);
  const tokenRow = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash }
  });

  if (!tokenRow || tokenRow.revokedAt) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token revoked or not found');
  }

  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token expired');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: Number(payload.sub) },
    include: {
      adminUserRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!admin || !admin.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Admin account is not active');
  }

  const newAccessToken = signAccessToken(admin);
  const newRefreshToken = signRefreshToken(admin);
  const newHash = hashToken(newRefreshToken);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash: oldHash },
      data: {
        revokedAt: new Date(),
        revokedReason: 'rotated',
        replacedByTokenHash: newHash
      }
    }),
    prisma.refreshToken.create({
      data: {
        adminId: admin.id,
        tokenHash: newHash,
        expiresAt: new Date(jwt.decode(newRefreshToken).exp * 1000),
        createdByIp: req.ip,
        userAgent: req.get('user-agent') || null
      }
    })
  ]);

  await audit(req, {
    action: 'REFRESH',
    entity: 'AdminUser',
    entityId: admin.id,
    details: { email: admin.email }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    admin: adminProfile(admin)
  };
}

async function logout(input, req) {
  if (input.refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(input.refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout'
      }
    });
  }

  await audit(req, {
    action: 'LOGOUT',
    entity: 'AdminUser',
    entityId: req.admin ? req.admin.id : null,
    details: { email: req.admin ? req.admin.email : null }
  });

  return { loggedOut: true };
}

async function me(adminId) {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    include: {
      adminUserRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!admin || !admin.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Admin account is not active');
  }

  return adminProfile(admin);
}

async function updateMyProfile(adminId, data, req) {
  const existing = await prisma.adminUser.findUnique({
    where: { id: adminId }
  });

  if (!existing || !existing.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Admin account is not active');
  }

  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;

  if (data.newPassword !== undefined) {
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, existing.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AppError(401, 'UNAUTHORIZED', 'Current password is invalid');
    }
    updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
  }

  await prisma.adminUser.update({
    where: { id: adminId },
    data: updateData
  });

  const updated = await me(adminId);

  await audit(req, {
    action: 'UPDATE',
    entity: 'AdminUser',
    entityId: adminId,
    before: {
      firstName: existing.firstName,
      lastName: existing.lastName,
      avatar: existing.avatar
    },
    after: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatar: updated.avatar
    },
    details: { scope: 'self_profile' }
  });

  return updated;
}

async function changeMyPassword(adminId, data, req) {
  const existing = await prisma.adminUser.findUnique({
    where: { id: adminId }
  });

  if (!existing || !existing.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Admin account is not active');
  }

  const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, existing.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new AppError(401, 'UNAUTHORIZED', 'Current password is invalid');
  }

  const nextPasswordHash = await bcrypt.hash(data.newPassword, 12);

  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      passwordHash: nextPasswordHash
    }
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'AdminUser',
    entityId: adminId,
    details: { scope: 'self_password' }
  });

  return { changed: true };
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  updateMyProfile,
  changeMyPassword
};
