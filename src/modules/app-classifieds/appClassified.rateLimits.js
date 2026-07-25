const rateLimit = require('express-rate-limit');

function appUserKey(req) {
  return `app-user:${req.appUser.id}`;
}

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: appUserKey,
    handler(req, res) {
      return res.status(429).json({
        ok: false,
        code: 'CLASSIFIED_RATE_LIMITED',
        message,
        data: null,
        meta: null,
        errors: null,
        traceId: req.traceId || null,
      });
    },
  });
}

const createAdLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many classified drafts were created. Please try again later.',
});
const mutationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: 'Too many classified changes. Please try again later.',
});
const imageLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  message: 'Too many classified image operations. Please try again later.',
});
const actionLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  message: 'Too many classified lifecycle actions. Please try again later.',
});
const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many classified reports. Please try again later.',
});

module.exports = {
  actionLimiter,
  createAdLimiter,
  imageLimiter,
  mutationLimiter,
  reportLimiter,
};
