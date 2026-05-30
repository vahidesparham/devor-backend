const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./location.controller');
const {
  createCountrySchema,
  updateCountrySchema,
  createCitySchema,
  updateCitySchema,
  createAreaSchema,
  updateAreaSchema,
  listSchema,
  idParamSchema,
} = require('./location.schemas');

function resourceRouter(type, createSchema, updateSchema) {
  const router = express.Router();
  router.use((req, _res, next) => {
    req.locationType = type;
    next();
  });
  router.get('/', auth, requirePermission('locations.read'), validate(listSchema, 'query'), controller.list);
  router.get('/next-display-order', auth, requirePermission('locations.read'), validate(listSchema.partial(), 'query'), controller.nextDisplayOrder);
  router.get('/:id', auth, requirePermission('locations.read'), validate(idParamSchema, 'params'), controller.detail);
  router.post('/', auth, requirePermission('locations.create'), validate(createSchema), controller.create);
  router.patch('/:id', auth, requirePermission('locations.update'), validate(idParamSchema, 'params'), validate(updateSchema), controller.update);
  router.delete('/:id', auth, requirePermission('locations.delete'), validate(idParamSchema, 'params'), controller.remove);
  return router;
}

const router = express.Router();

router.use('/countries', resourceRouter('country', createCountrySchema, updateCountrySchema));
router.use('/cities', resourceRouter('city', createCitySchema, updateCitySchema));
router.use('/areas', resourceRouter('area', createAreaSchema, updateAreaSchema));

module.exports = router;
