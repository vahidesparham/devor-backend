const bcrypt = require('bcryptjs');
const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function mapAdmin(admin) {
  const roleDetails = admin.adminUserRoles.map((r) => ({
    id: r.role.id,
    name: r.role.name,
    title: r.role.title,
    icon: r.role.icon,
    color: r.role.color
  }));

  const permissions = Array.from(
    new Set(
      admin.adminUserRoles.flatMap((r) =>
        r.role.rolePermissions.map((rp) => rp.permission.key)
      )
    )
  );

  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    avatar: admin.avatar,
    isActive: admin.isActive,
    roles: roleDetails.map((r) => r.name),
    roleDetails,
    permissions,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };
}

async function getAdminWithRelationsById(id) {
  return prisma.adminUser.findUnique({
    where: { id },
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
}

async function ensureRolesExist(roleIds) {
  if (!roleIds || !roleIds.length) return;

  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true }
  });

  if (roles.length !== roleIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'roleIds', message: 'One or more roles are invalid' }]
    });
  }
}


async function getAdminById(id) {
  const admin = await getAdminWithRelationsById(id);
  if (!admin) {
    throw new AppError(404, 'NOT_FOUND', 'Admin user not found');
  }

  return mapAdmin(admin);
}
async function listAdmins(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.q) {
    where.OR = [
      { email: { contains: query.q } },
      { firstName: { contains: query.q } },
      { lastName: { contains: query.q } },
      {
        adminUserRoles: {
          some: {
            role: {
              name: { contains: query.q }
            }
          }
        }
      }
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.adminUser.count({ where })
  ]);

  return {
    items: rows.map(mapAdmin),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize)
    }
  };
}

async function createAdmin(data, req) {
  const roleIds = data.roleIds || [];
  await ensureRolesExist(roleIds);

  const passwordHash = await bcrypt.hash(data.password, 12);

  const created = await prisma.$transaction(async (tx) => {
    const admin = await tx.adminUser.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        avatar: data.avatar ?? null,
        isActive: data.isActive
      }
    });

    if (roleIds.length) {
      await tx.adminUserRole.createMany({
        data: roleIds.map((roleId) => ({
          adminUserId: admin.id,
          roleId
        })),
        skipDuplicates: true
      });
    }

    return admin;
  });

  const result = await getAdminWithRelationsById(created.id);

  await audit(req, {
    action: 'CREATE',
    entity: 'AdminUser',
    entityId: created.id,
    after: {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      avatar: result.avatar,
      isActive: result.isActive,
      roles: result.adminUserRoles.map((r) => r.role.name)
    }
  });

  return mapAdmin(result);
}

async function updateAdmin(id, data, req) {
  const existing = await getAdminWithRelationsById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Admin user not found');
  }

  if (existing.id === req.admin.id && data.isActive === false) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'isActive', message: 'You cannot deactivate your own account' }]
    });
  }

  const roleIds = data.roleIds;
  if (roleIds !== undefined) {
    await ensureRolesExist(roleIds);
  }

  const updateData = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const before = {
    id: existing.id,
    email: existing.email,
    firstName: existing.firstName,
    lastName: existing.lastName,
    avatar: existing.avatar,
    isActive: existing.isActive,
    roles: existing.adminUserRoles.map((r) => r.role.name)
  };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length) {
      await tx.adminUser.update({
        where: { id },
        data: updateData
      });
    }

    if (roleIds !== undefined) {
      await tx.adminUserRole.deleteMany({ where: { adminUserId: id } });

      if (roleIds.length) {
        await tx.adminUserRole.createMany({
          data: roleIds.map((roleId) => ({ adminUserId: id, roleId })),
          skipDuplicates: true
        });
      }
    }
  });

  const updated = await getAdminWithRelationsById(id);

  await audit(req, {
    action: 'UPDATE',
    entity: 'AdminUser',
    entityId: id,
    before,
    after: {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      avatar: updated.avatar,
      isActive: updated.isActive,
      roles: updated.adminUserRoles.map((r) => r.role.name)
    }
  });

  return mapAdmin(updated);
}

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin
};

