const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./faq.controller');
const {
  createFaqSchema,
  updateFaqSchema,
  listFaqsSchema,
  idParamSchema,
} = require('./faq.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('faqs.read'), validate(listFaqsSchema, 'query'), controller.listFaqs);
router.get('/next-display-order', auth, requirePermission('faqs.create'), controller.getNextDisplayOrder);
router.get('/:id', auth, requirePermission('faqs.read'), validate(idParamSchema, 'params'), controller.getFaqById);
router.post('/', auth, requirePermission('faqs.create'), validate(createFaqSchema), controller.createFaq);
router.patch('/:id', auth, requirePermission('faqs.update'), validate(idParamSchema, 'params'), validate(updateFaqSchema), controller.updateFaq);
router.delete('/:id', auth, requirePermission('faqs.delete'), validate(idParamSchema, 'params'), controller.deleteFaq);

module.exports = router;
