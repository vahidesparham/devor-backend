const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');

function mapPermission(permission) {
  return {
    id: permission.id,
    key: permission.key,
    groupName: permission.groupName,
    title: permission.title,
    description: permission.description,
    displayOrder: permission.displayOrder,
    isActive: permission.isActive,
  };
}

function mapRole(role) {
  return {
    id: role.id,
    businessId: role.businessId,
    code: role.code,
    title: role.title,
    description: role.description,
    icon: role.icon,
    color: role.color,
    isSystem: role.isSystem,
    isOwnerRole: role.isOwnerRole,
    displayOrder: role.displayOrder,
    isActive: role.isActive,
    permissionIds: (role.rolePermissions || []).map((item) => item.permissionId),
    permissions: (role.rolePermissions || []).map((item) => mapPermission(item.permission)),
    membershipCount: role._count?.memberships ?? 0,
    business: role.business || undefined,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function assertBusiness(id) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'businessId', message: 'Business not found' }],
    });
  }
}

async function ensurePermissionsExist(permissionIds = []) {
  if (!permissionIds.length) return;
  const existing = await prisma.businessPermission.findMany({
    where: { id: { in: permissionIds }, isActive: true },
    select: { id: true },
  });
  if (existing.length !== new Set(permissionIds).size) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'permissionIds', message: 'One or more business permissions are invalid' }],
    });
  }
}

function includeRoleRelations() {
  return {
    business: { select: { id: true, slug: true, translations: { take: 1, orderBy: { lang: 'asc' }, select: { title: true, lang: true } } } },
    rolePermissions: { include: { permission: true }, orderBy: { permissionId: 'asc' } },
    _count: { select: { memberships: true } },
  };
}

async function listBusinessPermissions(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.groupName) where.groupName = query.groupName;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { key: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.businessPermission.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ displayOrder: 'asc' }, { key: 'asc' }],
    }),
    prisma.businessPermission.count({ where }),
  ]);

  return { items: items.map(mapPermission), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function listBusinessRoles(query) {
  const skip = (query.page - 1) * query.pageSize;
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { title: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.businessRole.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: 'asc' }],
      include: includeRoleRelations(),
    }),
    prisma.businessRole.count({ where }),
  ]);

  return { items: items.map(mapRole), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
}

async function getBusinessRoleById(id) {
  const role = await prisma.businessRole.findUnique({ where: { id }, include: includeRoleRelations() });
  if (!role) throw new AppError(404, 'NOT_FOUND', 'Business role not found');
  return mapRole(role);
}

async function getDefaultBusinessRole(businessId) {
  const role = await prisma.businessRole.findFirst({
    where: { businessId, code: 'staff', isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
  if (role) return role;
  return prisma.businessRole.findFirst({ where: { businessId, isActive: true }, orderBy: [{ isOwnerRole: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }] });
}

async function createBusinessRole(data, req) {
  await assertBusiness(data.businessId);
  const permissionIds = [...new Set(data.permissionIds || [])];
  await ensurePermissionsExist(permissionIds);

  const createdId = await prisma.$transaction(async (tx) => {
    const role = await tx.businessRole.create({
      data: {
        businessId: data.businessId,
        code: data.code,
        title: data.title,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        isSystem: false,
        isOwnerRole: data.isOwnerRole ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    if (permissionIds.length) {
      await tx.businessRolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })), skipDuplicates: true });
    }
    return role.id;
  });

  const result = await prisma.businessRole.findUnique({ where: { id: createdId }, include: includeRoleRelations() });
  await audit(req, { action: 'CREATE', entity: 'BusinessRole', entityId: createdId, after: mapRole(result) });
  return mapRole(result);
}

async function updateBusinessRole(id, data, req) {
  const existing = await prisma.businessRole.findUnique({ where: { id }, include: includeRoleRelations() });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business role not found');
  if (data.businessId !== undefined) await assertBusiness(data.businessId);
  const nextBusinessId = data.businessId ?? existing.businessId;
  if (data.businessId !== undefined && data.businessId !== existing.businessId && existing._count.memberships > 0) {
    throw new AppError(409, 'BUSINESS_ROLE_IN_USE', 'Assigned roles cannot be moved to another business');
  }
  const permissionIds = data.permissionIds === undefined ? undefined : [...new Set(data.permissionIds || [])];
  if (permissionIds !== undefined) await ensurePermissionsExist(permissionIds);

  await prisma.$transaction(async (tx) => {
    const updateData = {};
    ['businessId', 'code', 'title', 'description', 'icon', 'color', 'isOwnerRole', 'displayOrder', 'isActive'].forEach((field) => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });
    if (Object.keys(updateData).length) await tx.businessRole.update({ where: { id }, data: updateData });
    if (permissionIds !== undefined) {
      await tx.businessRolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length) {
        await tx.businessRolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })), skipDuplicates: true });
      }
    }

    if ((data.isOwnerRole === false || data.isActive === false) && existing.isOwnerRole) {
      const ownerCount = await tx.businessRole.count({ where: { businessId: nextBusinessId, isOwnerRole: true, isActive: true, id: { not: id } } });
      if (ownerCount === 0) {
        throw new AppError(409, 'LAST_OWNER_ROLE', 'At least one active owner role is required for each business');
      }
    }
  });

  const updated = await prisma.businessRole.findUnique({ where: { id }, include: includeRoleRelations() });
  await audit(req, { action: 'UPDATE', entity: 'BusinessRole', entityId: id, before: mapRole(existing), after: mapRole(updated) });
  return mapRole(updated);
}

async function deleteBusinessRole(id, req) {
  const existing = await prisma.businessRole.findUnique({ where: { id }, include: includeRoleRelations() });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Business role not found');
  if (existing.isSystem || existing.isOwnerRole) {
    throw new AppError(409, 'PROTECTED_BUSINESS_ROLE', 'System and owner roles cannot be deleted');
  }
  if (existing._count.memberships > 0) {
    throw new AppError(409, 'BUSINESS_ROLE_IN_USE', 'Role is assigned to business members and cannot be deleted');
  }
  await prisma.businessRole.delete({ where: { id } });
  await audit(req, { action: 'DELETE', entity: 'BusinessRole', entityId: id, before: mapRole(existing) });
}

async function getNextDisplayOrder(businessId) {
  const where = businessId ? { businessId: Number(businessId) } : {};
  const aggregate = await prisma.businessRole.aggregate({ where, _max: { displayOrder: true } });
  return (aggregate._max.displayOrder || 0) + 10;
}

async function ensureDefaultBusinessRoles(businessId, tx = prisma) {
  const permissions = await tx.businessPermission.findMany({ where: { isActive: true }, select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
  const templates = [
    { code: 'owner', title: 'مالک', description: 'دسترسی کامل به همه بخش‌های کسب‌وکار', icon: 'hgi-crown', color: '#7367f0', isOwnerRole: true, displayOrder: 10, keys: permissions.map((item) => item.key) },
    { code: 'manager', title: 'مدیر', description: 'مدیریت محتوای اصلی کسب‌وکار بدون کنترل مالکیت', icon: 'hgi-user-shield-01', color: '#00bad1', isOwnerRole: false, displayOrder: 20, keys: ['business.profile.read', 'business.profile.update', 'business.media.read', 'business.media.manage', 'business.working_hours.read', 'business.working_hours.manage', 'business.contact_links.read', 'business.contact_links.manage', 'business.offerings.read', 'business.offerings.manage', 'business.members.read', 'business.preview.read'] },
    { code: 'staff', title: 'کارمند', description: 'دسترسی محدود برای مشاهده و مدیریت روزمره', icon: 'hgi-user-account', color: '#28c76f', isOwnerRole: false, displayOrder: 30, keys: ['business.profile.read', 'business.media.read', 'business.working_hours.read', 'business.contact_links.read', 'business.offerings.read', 'business.preview.read'] },
  ];
  for (const template of templates) {
    const role = await tx.businessRole.upsert({
      where: { businessId_code: { businessId, code: template.code } },
      update: { title: template.title, description: template.description, icon: template.icon ?? null, color: template.color, isSystem: true, isOwnerRole: template.isOwnerRole, displayOrder: template.displayOrder, isActive: true },
      create: { businessId, code: template.code, title: template.title, description: template.description, icon: template.icon ?? null, color: template.color, isSystem: true, isOwnerRole: template.isOwnerRole, displayOrder: template.displayOrder, isActive: true },
    });
    const rows = template.keys.map((key) => permissionIdByKey.get(key)).filter(Boolean).map((permissionId) => ({ roleId: role.id, permissionId }));
    if (rows.length) await tx.businessRolePermission.createMany({ data: rows, skipDuplicates: true });
  }
}

async function assertRoleBelongsToBusiness(roleId, businessId) {
  const role = await prisma.businessRole.findFirst({ where: { id: roleId, businessId, isActive: true }, select: { id: true } });
  if (!role) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'roleId', message: 'Business role does not belong to this business' }],
    });
  }
  return role;
}

module.exports = {
  listBusinessPermissions,
  listBusinessRoles,
  getBusinessRoleById,
  getDefaultBusinessRole,
  createBusinessRole,
  updateBusinessRole,
  deleteBusinessRole,
  getNextDisplayOrder,
  ensureDefaultBusinessRoles,
  assertRoleBelongsToBusiness,
};
