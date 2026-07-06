const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const env = require('../config/env');
const { appUserProfile } = require('../modules/app-public/appAuth.service');

async function optionalAppAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.scope !== 'app') return next();

    const user = await prisma.appUser.findUnique({ where: { id: Number(payload.sub) } });
    if (user?.isActive) req.appUser = appUserProfile(user);
  } catch (_error) {
    // Public endpoints stay public; invalid optional tokens are ignored here.
  }

  return next();
}

module.exports = optionalAppAuth;
