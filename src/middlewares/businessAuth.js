const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const env = require('../config/env');
const { AppError } = require('../shared/http/response');
const { businessUserProfile } = require('../modules/business-auth/businessAuth.service');

function normalizeToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || null;
  return raw;
}

function extractAccessToken(req) {
  return normalizeToken(req.get('authorization'))
    || normalizeToken(req.get('x-access-token'))
    || normalizeToken(req.body && req.body.accessToken)
    || normalizeToken(req.query && req.query.accessToken);
}

async function businessAuth(req, _res, next) {
  const token = extractAccessToken(req);
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Missing access token');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
  }

  if (payload.scope !== 'business') throw new AppError(401, 'UNAUTHORIZED', 'Invalid access token scope');

  const user = await prisma.businessUser.findUnique({
    where: { id: Number(payload.sub) },
    include: {
      memberships: {
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
      },
    },
  });

  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Business user account is not active');

  req.businessUser = businessUserProfile(user);
  next();
}

module.exports = businessAuth;
