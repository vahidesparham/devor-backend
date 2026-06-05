const express = require('express');
const validate = require('../../middlewares/validate');
const businessAuth = require('../../middlewares/businessAuth');
const controller = require('./businessAuth.controller');
const { loginSchema, refreshSchema, logoutSchema, updateMyProfileSchema, changeMyPasswordSchema } = require('./businessAuth.schemas');

const router = express.Router();

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', businessAuth, validate(logoutSchema), controller.logout);
router.get('/me', businessAuth, controller.me);
router.patch('/me/profile', businessAuth, validate(updateMyProfileSchema), controller.updateMyProfile);
router.patch('/me/password', businessAuth, validate(changeMyPasswordSchema), controller.changeMyPassword);

module.exports = router;
