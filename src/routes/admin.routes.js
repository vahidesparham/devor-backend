const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const authRoutes = require('../modules/auth/auth.routes');
const authController = require('../modules/auth/auth.controller');
const { updateMyProfileSchema, changeMyPasswordSchema } = require('../modules/auth/auth.schemas');
const adminUserRoutes = require('../modules/admins/admin.routes');
const roleRoutes = require('../modules/roles/role.routes');
const permissionRoutes = require('../modules/permissions/permission.routes');
const imageConfigRoutes = require('../modules/image-configs/imageConfig.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const languageRoutes = require('../modules/languages/language.routes');
const slideshowRoutes = require('../modules/slideshows/slideshow.routes');
const bannerRoutes = require('../modules/banners/banner.routes');
const auditLogRoutes = require('../modules/audit-logs/auditLog.routes');
const errorLogRoutes = require('../modules/error-logs/errorLog.routes');
const menuRoutes = require('../modules/menu/menu.routes');

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

router.use('/auth', authRateLimiter, authRoutes);
router.get('/me', auth, authController.me);
router.patch('/me/profile', auth, validate(updateMyProfileSchema), authController.updateMyProfile);
router.patch('/me/password', auth, validate(changeMyPasswordSchema), authController.changeMyPassword);
router.use('/admins', adminUserRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/image-configs', imageConfigRoutes);
router.use('/uploads', uploadRoutes);
router.use('/languages', languageRoutes);
router.use('/slideshows', slideshowRoutes);
router.use('/banners', bannerRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/error-logs', errorLogRoutes);
router.use('/menu', menuRoutes);

module.exports = router;

