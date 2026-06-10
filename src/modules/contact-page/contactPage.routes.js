const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./contactPage.controller');
const { updateContactPageSchema } = require('./contactPage.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('contact_page.read'), controller.getContactPage);
router.patch('/', auth, requirePermission('contact_page.update'), validate(updateContactPageSchema), controller.updateContactPage);

module.exports = router;
