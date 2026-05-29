const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function mapRole(role) {
  return {
    id: role.id,
    name: role.name,
    title: role.title,
    icon: role.icon,
    color: role.color,
    description: role.description,
    permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
    permissions: role.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      key: rp.permission.key,
      description: rp.permission.description
    })),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

async function ensurePermissionsExist(permissionIds) {
  if (!permissionIds || !permissionIds.length) return;

  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true }
  });

  if (permissions.length !== permissionIds.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'permissionIds', message: 'One or more permissions are invalid' }]
    });
  }
}

async function getRoleWithRelationsById(id) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });
}

async function listRoles(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }],
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    }),
    prisma.role.count({ where })
  ]);

  return {
    items: items.map(mapRole),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize)
    }
  };
}

async function getRoleById(id) {
  const role = await getRoleWithRelationsById(id);
  if (!role) {
    throw new AppError(404, 'NOT_FOUND', 'Role not found');
  }

  return mapRole(role);
}

async function createRole(data, req) {
  const permissionIds = data.permissionIds || [];
  await ensurePermissionsExist(permissionIds);

  const created = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name: data.name,
        title: data.title ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        description: data.description ?? null
      }
    });

    if (permissionIds.length) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true
      });
    }

    return role.id;
  });

  const result = await getRoleWithRelationsById(created);

  await audit(req, {
    action: 'CREATE',
    entity: 'Role',
    entityId: result.id,
    after: {
      id: result.id,
      name: result.name,
      title: result.title,
      icon: result.icon,
      color: result.color,
      permissionIds: result.rolePermissions.map((rp) => rp.permissionId)
    }
  });

  return mapRole(result);
}

async function updateRole(id, data, req) {
  const existing = await getRoleWithRelationsById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Role not found');
  }

  const permissionIds = data.permissionIds;
  if (permissionIds !== undefined) {
    await ensurePermissionsExist(permissionIds);
  }

  const before = {
    name: existing.name,
    title: existing.title,
    icon: existing.icon,
    color: existing.color,
    description: existing.description,
    permissionIds: existing.rolePermissions.map((rp) => rp.permissionId)
  };

  await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.description !== undefined) updateData.description = data.description;

    if (Object.keys(updateData).length) {
      await tx.role.update({ where: { id }, data: updateData });
    }

    if (permissionIds !== undefined) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          skipDuplicates: true
        });
      }
    }
  });

  const updated = await getRoleWithRelationsById(id);

  await audit(req, {
    action: 'UPDATE',
    entity: 'Role',
    entityId: id,
    before,
    after: {
      name: updated.name,
      title: updated.title,
      icon: updated.icon,
      color: updated.color,
      description: updated.description,
      permissionIds: updated.rolePermissions.map((rp) => rp.permissionId)
    }
  });

  return mapRole(updated);
}

async function deleteRole(id, req) {
  const existing = await getRoleWithRelationsById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Role not found');
  }

  const usedCount = await prisma.adminUserRole.count({
    where: { roleId: id }
  });

  if (usedCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Role is assigned to admins and cannot be deleted');
  }

  await prisma.role.delete({ where: { id } });

  await audit(req, {
    action: 'DELETE',
    entity: 'Role',
    entityId: id,
    before: {
      name: existing.name,
      title: existing.title,
      icon: existing.icon,
      color: existing.color,
      description: existing.description,
      permissionIds: existing.rolePermissions.map((rp) => rp.permissionId)
    }
  });
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
