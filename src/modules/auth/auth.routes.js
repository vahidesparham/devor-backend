const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const controller = require('./auth.controller');
const { loginSchema, refreshSchema, logoutSchema } = require('./auth.schemas');

const router = express.Router();

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', auth, validate(logoutSchema), controller.logout);

module.exports = router;
