const express = require('express');
const validate = require('../middlewares/validate');
const businessAuth = require('../middlewares/businessAuth');
const {
  requireBusinessPermission,
  requireBusinessPayloadPermission,
  byParamResource,
  byQueryOrBodyResource,
  byRequestBusinessId,
} = require('../middlewares/requireBusinessPermission');

const businessController = require('../modules/businesses/business.controller');
const businessSchemas = require('../modules/businesses/business.schemas');
const workingHourController = require('../modules/business-working-hours/businessWorkingHour.controller');
const workingHourSchemas = require('../modules/business-working-hours/businessWorkingHour.schemas');
const contactLinkController = require('../modules/business-contact-links/businessContactLink.controller');
const contactLinkSchemas = require('../modules/business-contact-links/businessContactLink.schemas');
const roleController = require('../modules/business-roles/businessRole.controller');
const roleSchemas = require('../modules/business-roles/businessRole.schemas');
const userController = require('../modules/business-users/businessUser.controller');
const userSchemas = require('../modules/business-users/businessUser.schemas');
const categoryController = require('../modules/business-offering-categories/businessOfferingCategory.controller');
const categorySchemas = require('../modules/business-offering-categories/businessOfferingCategory.schemas');
const offeringController = require('../modules/business-offerings/businessOffering.controller');
const offeringSchemas = require('../modules/business-offerings/businessOffering.schemas');
const optionGroupController = require('../modules/business-offering-option-groups/businessOfferingOptionGroup.controller');
const optionGroupSchemas = require('../modules/business-offering-option-groups/businessOfferingOptionGroup.schemas');
const optionController = require('../modules/business-offering-options/businessOfferingOption.controller');
const optionSchemas = require('../modules/business-offering-options/businessOfferingOption.schemas');

const router = express.Router();

router.use(businessAuth);

function hasMediaPayload(req) {
  return Array.isArray(req.body?.gallery) || Array.isArray(req.body?.slideshows);
}

function hasProfilePayload(req) {
  return Object.keys(req.body || {}).some((key) => !['gallery', 'slideshows'].includes(key));
}

router.get('/businesses/:id/readiness', validate(businessSchemas.idParamSchema, 'params'), requireBusinessPermission('business.profile.read', { resolveBusinessId: byParamResource('business') }), businessController.readiness);
router.get('/businesses/:id', validate(businessSchemas.idParamSchema, 'params'), requireBusinessPermission('business.profile.read', { resolveBusinessId: byParamResource('business') }), businessController.detail);
router.patch(
  '/businesses/:id',
  validate(businessSchemas.idParamSchema, 'params'),
  validate(businessSchemas.updateBusinessSchema),
  requireBusinessPermission('business.profile.read', { resolveBusinessId: byParamResource('business') }),
  requireBusinessPayloadPermission(hasProfilePayload, 'business.profile.update'),
  requireBusinessPayloadPermission(hasMediaPayload, 'business.media.manage'),
  businessController.update,
);

router.get('/working-hours/next-display-order', requireBusinessPermission('business.working_hours.read', { resolveBusinessId: byRequestBusinessId() }), workingHourController.nextDisplayOrder);
router.get('/working-hours', validate(workingHourSchemas.listBusinessWorkingHoursSchema, 'query'), requireBusinessPermission('business.working_hours.read', { resolveBusinessId: byRequestBusinessId() }), workingHourController.list);
router.get('/working-hours/:id', validate(workingHourSchemas.idParamSchema, 'params'), requireBusinessPermission('business.working_hours.read', { resolveBusinessId: byParamResource('workingHour') }), workingHourController.detail);
router.post('/working-hours', validate(workingHourSchemas.createBusinessWorkingHourSchema), requireBusinessPermission('business.working_hours.manage', { resolveBusinessId: byRequestBusinessId() }), workingHourController.create);
router.patch('/working-hours/:id', validate(workingHourSchemas.idParamSchema, 'params'), validate(workingHourSchemas.updateBusinessWorkingHourSchema), requireBusinessPermission('business.working_hours.manage', { resolveBusinessId: byParamResource('workingHour') }), workingHourController.update);
router.delete('/working-hours/:id', validate(workingHourSchemas.idParamSchema, 'params'), requireBusinessPermission('business.working_hours.manage', { resolveBusinessId: byParamResource('workingHour') }), workingHourController.remove);

router.get('/contact-links/next-display-order', requireBusinessPermission('business.contact_links.read', { resolveBusinessId: byRequestBusinessId() }), contactLinkController.nextDisplayOrder);
router.get('/contact-links', validate(contactLinkSchemas.listBusinessContactLinksSchema, 'query'), requireBusinessPermission('business.contact_links.read', { resolveBusinessId: byRequestBusinessId() }), contactLinkController.list);
router.get('/contact-links/:id', validate(contactLinkSchemas.idParamSchema, 'params'), requireBusinessPermission('business.contact_links.read', { resolveBusinessId: byParamResource('contactLink') }), contactLinkController.detail);
router.post('/contact-links', validate(contactLinkSchemas.createBusinessContactLinkSchema), requireBusinessPermission('business.contact_links.manage', { resolveBusinessId: byRequestBusinessId() }), contactLinkController.create);
router.patch('/contact-links/:id', validate(contactLinkSchemas.idParamSchema, 'params'), validate(contactLinkSchemas.updateBusinessContactLinkSchema), requireBusinessPermission('business.contact_links.manage', { resolveBusinessId: byParamResource('contactLink') }), contactLinkController.update);
router.delete('/contact-links/:id', validate(contactLinkSchemas.idParamSchema, 'params'), requireBusinessPermission('business.contact_links.manage', { resolveBusinessId: byParamResource('contactLink') }), contactLinkController.remove);

router.get('/roles/permissions', validate(roleSchemas.listBusinessPermissionsSchema, 'query'), requireBusinessPermission('business.roles.read', { resolveBusinessId: byRequestBusinessId() }), roleController.listPermissions);
router.get('/roles/next-display-order', requireBusinessPermission('business.roles.read', { resolveBusinessId: byRequestBusinessId() }), roleController.nextDisplayOrder);
router.get('/roles', validate(roleSchemas.listBusinessRolesSchema, 'query'), requireBusinessPermission('business.roles.read', { resolveBusinessId: byRequestBusinessId() }), roleController.list);
router.get('/roles/:id', validate(roleSchemas.idParamSchema, 'params'), requireBusinessPermission('business.roles.read', { resolveBusinessId: byParamResource('role') }), roleController.detail);
router.post('/roles', validate(roleSchemas.createBusinessRoleSchema), requireBusinessPermission('business.roles.manage', { resolveBusinessId: byRequestBusinessId() }), roleController.create);
router.patch('/roles/:id', validate(roleSchemas.idParamSchema, 'params'), validate(roleSchemas.updateBusinessRoleSchema), requireBusinessPermission('business.roles.manage', { resolveBusinessId: byParamResource('role') }), roleController.update);
router.delete('/roles/:id', validate(roleSchemas.idParamSchema, 'params'), requireBusinessPermission('business.roles.manage', { resolveBusinessId: byParamResource('role') }), roleController.remove);

router.get('/members', validate(userSchemas.listBusinessUsersSchema, 'query'), requireBusinessPermission('business.members.read', { resolveBusinessId: byRequestBusinessId() }), userController.list);
router.get(
  '/member-accounts',
  validate(userSchemas.listBusinessUsersSchema, 'query'),
  requireBusinessPermission('business.members.manage', { resolveBusinessId: byRequestBusinessId() }),
  (req, _res, next) => {
    delete req.query.businessId;
    next();
  },
  userController.listAccounts,
);
router.get('/members/:id', validate(userSchemas.idParamSchema, 'params'), requireBusinessPermission('business.members.read', { resolveBusinessId: byParamResource('membership') }), userController.detail);
router.post('/members', validate(userSchemas.createBusinessMembershipSchema), requireBusinessPermission('business.members.manage', { resolveBusinessId: byRequestBusinessId() }), userController.createMembership);
router.patch('/members/:id', validate(userSchemas.idParamSchema, 'params'), validate(userSchemas.updateBusinessMembershipSchema), requireBusinessPermission('business.members.manage', { resolveBusinessId: byParamResource('membership') }), userController.updateMembership);
router.delete('/members/:id', validate(userSchemas.idParamSchema, 'params'), requireBusinessPermission('business.members.manage', { resolveBusinessId: byParamResource('membership') }), userController.remove);

router.get('/offering-categories/next-display-order', requireBusinessPermission('business.offerings.read', { resolveBusinessId: byRequestBusinessId() }), categoryController.nextDisplayOrder);
router.get('/offering-categories', validate(categorySchemas.listBusinessOfferingCategoriesSchema, 'query'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byRequestBusinessId() }), categoryController.list);
router.get('/offering-categories/:id', validate(categorySchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byParamResource('offeringCategory') }), categoryController.detail);
router.post('/offering-categories', validate(categorySchemas.createBusinessOfferingCategorySchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byRequestBusinessId() }), categoryController.create);
router.patch('/offering-categories/:id', validate(categorySchemas.idParamSchema, 'params'), validate(categorySchemas.updateBusinessOfferingCategorySchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('offeringCategory') }), categoryController.update);
router.delete('/offering-categories/:id', validate(categorySchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('offeringCategory') }), categoryController.remove);

router.get('/offerings/next-display-order', requireBusinessPermission('business.offerings.read', { resolveBusinessId: byRequestBusinessId() }), offeringController.nextDisplayOrder);
router.get('/offerings', validate(offeringSchemas.listBusinessOfferingsSchema, 'query'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byRequestBusinessId() }), offeringController.list);
router.get('/offerings/:id', validate(offeringSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byParamResource('offering') }), offeringController.detail);
router.post('/offerings', validate(offeringSchemas.createBusinessOfferingSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byRequestBusinessId() }), offeringController.create);
router.patch('/offerings/:id', validate(offeringSchemas.idParamSchema, 'params'), validate(offeringSchemas.updateBusinessOfferingSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('offering') }), offeringController.update);
router.delete('/offerings/:id', validate(offeringSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('offering') }), offeringController.remove);

router.get('/offering-option-groups/next-display-order', requireBusinessPermission('business.offerings.read', { resolveBusinessId: byQueryOrBodyResource('offering', 'offeringId') }), optionGroupController.nextDisplayOrder);
router.get('/offering-option-groups', validate(optionGroupSchemas.listBusinessOfferingOptionGroupsSchema, 'query'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byQueryOrBodyResource('offering', 'offeringId') }), optionGroupController.list);
router.get('/offering-option-groups/:id', validate(optionGroupSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byParamResource('optionGroup') }), optionGroupController.detail);
router.post('/offering-option-groups', validate(optionGroupSchemas.createBusinessOfferingOptionGroupSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byQueryOrBodyResource('offering', 'offeringId') }), optionGroupController.create);
router.patch('/offering-option-groups/:id', validate(optionGroupSchemas.idParamSchema, 'params'), validate(optionGroupSchemas.updateBusinessOfferingOptionGroupSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('optionGroup') }), optionGroupController.update);
router.delete('/offering-option-groups/:id', validate(optionGroupSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('optionGroup') }), optionGroupController.remove);

router.get('/offering-options/next-display-order', requireBusinessPermission('business.offerings.read', { resolveBusinessId: byQueryOrBodyResource('optionGroup', 'groupId') }), optionController.nextDisplayOrder);
router.get('/offering-options', validate(optionSchemas.listBusinessOfferingOptionsSchema, 'query'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byQueryOrBodyResource('optionGroup', 'groupId') }), optionController.list);
router.get('/offering-options/:id', validate(optionSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.read', { resolveBusinessId: byParamResource('option') }), optionController.detail);
router.post('/offering-options', validate(optionSchemas.createBusinessOfferingOptionSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byQueryOrBodyResource('optionGroup', 'groupId') }), optionController.create);
router.patch('/offering-options/:id', validate(optionSchemas.idParamSchema, 'params'), validate(optionSchemas.updateBusinessOfferingOptionSchema), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('option') }), optionController.update);
router.delete('/offering-options/:id', validate(optionSchemas.idParamSchema, 'params'), requireBusinessPermission('business.offerings.manage', { resolveBusinessId: byParamResource('option') }), optionController.remove);

module.exports = router;
