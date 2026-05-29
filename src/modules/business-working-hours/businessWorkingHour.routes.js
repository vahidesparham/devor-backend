const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./businessWorkingHour.controller');
const {
  createBusinessWorkingHourSchema,
  updateBusinessWorkingHourSchema,
  listBusinessWorkingHoursSchema,
  idParamSchema,
} = require('./businessWorkingHour.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('business_working_hours.read'), validate(listBusinessWorkingHoursSchema, 'query'), controller.list);
router.get('/next-display-order', auth, requirePermission('business_working_hours.read'), controller.nextDisplayOrder);
router.get('/:id', auth, requirePermission('business_working_hours.read'), validate(idParamSchema, 'params'), controller.detail);
router.post('/', auth, requirePermission('business_working_hours.create'), validate(createBusinessWorkingHourSchema), controller.create);
router.patch('/:id', auth, requirePermission('business_working_hours.update'), validate(idParamSchema, 'params'), validate(updateBusinessWorkingHourSchema), controller.update);
router.delete('/:id', auth, requirePermission('business_working_hours.delete'), validate(idParamSchema, 'params'), controller.remove);

module.exports = router;
