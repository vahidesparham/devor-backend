const express = require('express');
const rateLimit = require('express-rate-limit');
const businessAuthRoutes = require('../modules/business-auth/businessAuth.routes');
const businessAssetsRoutes = require('../modules/business-assets/businessAssets.routes');
const businessPanelRoutes = require('./business-panel.routes');

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use('/auth', authRateLimiter, businessAuthRoutes);
router.use('/', businessAssetsRoutes);
router.use('/panel', businessPanelRoutes);

module.exports = router;
