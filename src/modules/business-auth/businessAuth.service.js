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

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, scope: 'business', jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, scope: 'business', jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
}

function membershipInclude() {
  return {
    where: { isActive: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      business: {
        select: {
          id: true,
          slug: true,
          logoImage: true,
          coverImage: true,
          isActive: true,
          publicationStatus: true,
          translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } },
          serviceType: { select: { id: true, code: true, title: true, color: true, image: true } },
        },
      },
      role: {
        select: {
          id: true,
          code: true,
          title: true,
          color: true,
          isOwnerRole: true,
          isSystem: true,
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  };
}

function userInclude() {
  return { memberships: membershipInclude() };
}

function mapMembership(membership) {
  const permissions = Array.from(new Set((membership.role?.rolePermissions || []).map((entry) => entry.permission.key)));
  const translation = membership.business?.translations?.[0] || null;
  return {
    id: membership.id,
    businessId: membership.businessId,
    userId: membership.userId,
    roleId: membership.roleId,
    isActive: membership.isActive,
    role: membership.role ? {
      id: membership.role.id,
      code: membership.role.code,
      title: membership.role.title,
      color: membership.role.color,
      isOwnerRole: membership.role.isOwnerRole,
      isSystem: membership.role.isSystem,
    } : null,
    permissions,
    business: membership.business ? {
      ...membership.business,
      title: translation?.title || membership.business.slug,
      selectedTranslation: translation,
      translations: undefined,
    } : null,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

function businessUserProfile(user) {
  const memberships = (user.memberships || []).map(mapMembership);
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    memberships,
    businessIds: memberships.map((membership) => membership.businessId),
  };
}

async function findUserWithMemberships(id) {
  return prisma.businessUser.findUnique({
    where: { id },
    include: userInclude(),
  });
}

async function saveRefreshToken(userId, refreshToken, req) {
  const decoded = jwt.decode(refreshToken);
  await prisma.businessRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null,
      createdByIp: req.ip,
      userAgent: req.get('user-agent') || null,
    },
  });
}

async function login(input, req) {
  const user = await prisma.businessUser.findUnique({
    where: { email: input.email },
    include: userInclude(),
  });

  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await saveRefreshToken(user.id, refreshToken, req);

  await audit(req, { action: 'LOGIN', entity: 'BusinessUser', entityId: user.id, details: { email: user.email } });

  return { accessToken, refreshToken, user: businessUserProfile(user) };
}

async function refresh(input, req) {
  let payload;
  try {
    payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  if (payload.scope !== 'business') throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token scope');

  const oldHash = hashToken(input.refreshToken);
  const tokenRow = await prisma.businessRefreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!tokenRow || tokenRow.revokedAt) throw new AppError(401, 'UNAUTHORIZED', 'Refresh token revoked or not found');
  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() < Date.now()) throw new AppError(401, 'UNAUTHORIZED', 'Refresh token expired');

  const user = await findUserWithMemberships(Number(payload.sub));
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Business user account is not active');

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  const newHash = hashToken(newRefreshToken);

  await prisma.$transaction([
    prisma.businessRefreshToken.update({
      where: { tokenHash: oldHash },
      data: { revokedAt: new Date(), revokedReason: 'rotated', replacedByTokenHash: newHash },
    }),
    prisma.businessRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt: new Date(jwt.decode(newRefreshToken).exp * 1000),
        createdByIp: req.ip,
        userAgent: req.get('user-agent') || null,
      },
    }),
  ]);

  await audit(req, { action: 'REFRESH', entity: 'BusinessUser', entityId: user.id, details: { email: user.email } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: businessUserProfile(user) };
}

async function logout(input, req) {
  if (input.refreshToken) {
    await prisma.businessRefreshToken.updateMany({
      where: { tokenHash: hashToken(input.refreshToken), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  await audit(req, {
    action: 'LOGOUT',
    entity: 'BusinessUser',
    entityId: req.businessUser ? req.businessUser.id : null,
    details: { email: req.businessUser ? req.businessUser.email : null },
  });

  return { loggedOut: true };
}

async function me(userId) {
  const user = await findUserWithMemberships(userId);
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Business user account is not active');
  return businessUserProfile(user);
}

async function updateMyProfile(userId, data, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id: userId } });
  if (!existing || !existing.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Business user account is not active');

  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;

  await prisma.businessUser.update({
    where: { id: userId },
    data: updateData,
  });

  const updated = await me(userId);

  await audit(req, {
    action: 'UPDATE',
    entity: 'BusinessUser',
    entityId: userId,
    before: {
      firstName: existing.firstName,
      lastName: existing.lastName,
      phone: existing.phone,
      avatar: existing.avatar,
    },
    after: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatar: updated.avatar,
    },
    details: { scope: 'business_self_profile' },
  });

  return updated;
}

async function changeMyPassword(userId, data, req) {
  const existing = await prisma.businessUser.findUnique({ where: { id: userId } });
  if (!existing || !existing.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Business user account is not active');

  const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, existing.passwordHash);
  if (!isCurrentPasswordValid) throw new AppError(401, 'UNAUTHORIZED', 'Current password is invalid');

  await prisma.businessUser.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'BusinessUser',
    entityId: userId,
    details: { scope: 'business_self_password' },
  });

  return { changed: true };
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  businessUserProfile,
  updateMyProfile,
  changeMyPassword,
};
