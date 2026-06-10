const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const env = require('../config/env');
const { AppError } = require('../shared/http/response');
const { appUserProfile } = require('../modules/app-public/appAuth.service');

async function appAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (_error) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  if (payload.scope !== 'app') throw new AppError(401, 'UNAUTHORIZED', 'Invalid token scope');

  const user = await prisma.appUser.findUnique({ where: { id: Number(payload.sub) } });
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'User account is not active');

  req.appUser = appUserProfile(user);
  next();
}

module.exports = appAuth;
