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
const serviceTypeRoutes = require('../modules/service-types/serviceType.routes');
const attributeGroupRoutes = require('../modules/attribute-groups/attributeGroup.routes');
const locationRoutes = require('../modules/locations/location.routes');
const businessRoutes = require('../modules/businesses/business.routes');
const businessUserRoutes = require('../modules/business-users/businessUser.routes');
const businessWorkingHourRoutes = require('../modules/business-working-hours/businessWorkingHour.routes');
const offeringCategoryRoutes = require('../modules/business-offering-categories/businessOfferingCategory.routes');
const offeringRoutes = require('../modules/business-offerings/businessOffering.routes');
const offeringOptionGroupRoutes = require('../modules/business-offering-option-groups/businessOfferingOptionGroup.routes');
const offeringOptionRoutes = require('../modules/business-offering-options/businessOfferingOption.routes');
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
router.use('/service-types', serviceTypeRoutes);
router.use('/attribute-groups', attributeGroupRoutes);
router.use('/locations', locationRoutes);
router.use('/businesses', businessRoutes);
router.use('/business-users', businessUserRoutes);
router.use('/business-working-hours', businessWorkingHourRoutes);
router.use('/offering-categories', offeringCategoryRoutes);
router.use('/offerings', offeringRoutes);
router.use('/offering-option-groups', offeringOptionGroupRoutes);
router.use('/offering-options', offeringOptionRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/error-logs', errorLogRoutes);
router.use('/menu', menuRoutes);

module.exports = router;

