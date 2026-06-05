const prisma = require('../prisma');
const { AppError } = require('../shared/http/response');

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function getRequestBusinessId(req) {
  return toPositiveInt(req.params?.businessId)
    || toPositiveInt(req.query?.businessId)
    || toPositiveInt(req.body?.businessId)
    || toPositiveInt(req.get('x-business-id'));
}

function permissionSet(membership) {
  return new Set(membership?.permissions || []);
}

async function resolveBusinessIdFromResource(resource, id) {
  const numericId = toPositiveInt(id);
  if (!numericId) return null;

  if (resource === 'business') return numericId;
  if (resource === 'workingHour') {
    const row = await prisma.businessWorkingHour.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'contactLink') {
    const row = await prisma.businessContactLink.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'role') {
    const row = await prisma.businessRole.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'membership') {
    const row = await prisma.businessMembership.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'offeringCategory') {
    const row = await prisma.businessOfferingCategory.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'offering') {
    const row = await prisma.businessOffering.findUnique({ where: { id: numericId }, select: { businessId: true } });
    return row?.businessId || null;
  }
  if (resource === 'optionGroup') {
    const row = await prisma.businessOfferingOptionGroup.findUnique({
      where: { id: numericId },
      select: { offering: { select: { businessId: true } } },
    });
    return row?.offering?.businessId || null;
  }
  if (resource === 'option') {
    const row = await prisma.businessOfferingOption.findUnique({
      where: { id: numericId },
      select: { group: { select: { offering: { select: { businessId: true } } } } },
    });
    return row?.group?.offering?.businessId || null;
  }

  return null;
}

function byRequestBusinessId() {
  return async (req) => getRequestBusinessId(req);
}

function byParamResource(resource, param = 'id') {
  return async (req) => resolveBusinessIdFromResource(resource, req.params?.[param]);
}

function byQueryOrBodyResource(resource, key) {
  return async (req) => resolveBusinessIdFromResource(resource, req.query?.[key] || req.body?.[key]);
}

async function assertRelationBelongsToBusiness(modelName, where, businessId, path) {
  if (!where) return;
  const row = await prisma[modelName].findUnique({ where, select: { businessId: true } });
  if (!row || row.businessId !== businessId) {
    throw new AppError(403, 'BUSINESS_SCOPE_FORBIDDEN', 'Resource does not belong to the selected business', {
      errors: [{ path, message: 'Resource does not belong to the selected business' }],
    });
  }
}

async function assertNestedRelations(req, businessId) {
  const body = req.body || {};
  const query = req.query || {};

  const explicitBusinessIds = [body.businessId, query.businessId].map(toPositiveInt).filter(Boolean);
  if (explicitBusinessIds.some((id) => id !== businessId)) {
    throw new AppError(403, 'BUSINESS_SCOPE_FORBIDDEN', 'Business scope mismatch', {
      errors: [{ path: 'businessId', message: 'Business scope mismatch' }],
    });
  }

  const categoryId = toPositiveInt(body.categoryId || query.categoryId);
  if (categoryId) await assertRelationBelongsToBusiness('businessOfferingCategory', { id: categoryId }, businessId, 'categoryId');

  const offeringId = toPositiveInt(body.offeringId || query.offeringId);
  if (offeringId) await assertRelationBelongsToBusiness('businessOffering', { id: offeringId }, businessId, 'offeringId');

  const groupId = toPositiveInt(body.groupId || query.groupId);
  if (groupId) {
    const group = await prisma.businessOfferingOptionGroup.findUnique({
      where: { id: groupId },
      select: { offering: { select: { businessId: true } } },
    });
    if (!group || group.offering.businessId !== businessId) {
      throw new AppError(403, 'BUSINESS_SCOPE_FORBIDDEN', 'Resource does not belong to the selected business', {
        errors: [{ path: 'groupId', message: 'Resource does not belong to the selected business' }],
      });
    }
  }

  const roleId = toPositiveInt(body.roleId || query.roleId);
  if (roleId) await assertRelationBelongsToBusiness('businessRole', { id: roleId }, businessId, 'roleId');
}

function requireBusinessPermission(permissionKey, options = {}) {
  const resolveBusinessId = options.resolveBusinessId || byRequestBusinessId();

  return async (req, _res, next) => {
    const businessId = toPositiveInt(await resolveBusinessId(req));
    if (!businessId) throw new AppError(400, 'BUSINESS_CONTEXT_REQUIRED', 'Business context is required');

    const membership = (req.businessUser?.memberships || []).find((item) => item.businessId === businessId && item.isActive);
    if (!membership) {
      throw new AppError(403, 'BUSINESS_MEMBERSHIP_REQUIRED', 'You are not a member of this business');
    }

    const permissions = permissionSet(membership);
    if (!membership.role?.isOwnerRole && !permissions.has(permissionKey)) {
      throw new AppError(403, 'BUSINESS_PERMISSION_DENIED', 'Business permission denied', {
        requiredPermission: permissionKey,
      });
    }

    await assertNestedRelations(req, businessId);

    req.businessContext = {
      businessId,
      membershipId: membership.id,
      roleId: membership.roleId,
      role: membership.role,
      permissions: Array.from(permissions),
    };
    next();
  };
}

function requireBusinessContextPermission(permissionKey) {
  return (req, _res, next) => {
    if (!req.businessContext) throw new AppError(400, 'BUSINESS_CONTEXT_REQUIRED', 'Business context is required');
    const permissions = permissionSet(req.businessContext);
    if (!req.businessContext.role?.isOwnerRole && !permissions.has(permissionKey)) {
      throw new AppError(403, 'BUSINESS_PERMISSION_DENIED', 'Business permission denied', {
        requiredPermission: permissionKey,
      });
    }
    next();
  };
}

function requireBusinessPayloadPermission(predicate, permissionKey) {
  return (req, res, next) => {
    if (!predicate(req)) return next();
    return requireBusinessContextPermission(permissionKey)(req, res, next);
  };
}

module.exports = {
  requireBusinessPermission,
  requireBusinessPayloadPermission,
  byParamResource,
  byQueryOrBodyResource,
  byRequestBusinessId,
  resolveBusinessIdFromResource,
};
