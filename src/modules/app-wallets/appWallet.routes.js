const express = require('express');
const auth = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const controller = require('./appWallet.controller');
const {
  adjustWalletSchema,
  appUserIdParamSchema,
  listAppWalletsSchema,
  listWalletTransactionsSchema,
} = require('./appWallet.schemas');

const router = express.Router();

router.get('/', auth, requirePermission('app_wallets.read'), validate(listAppWalletsSchema, 'query'), controller.list);
router.get('/:appUserId', auth, requirePermission('app_wallets.read'), validate(appUserIdParamSchema, 'params'), controller.detail);
router.get('/:appUserId/transactions', auth, requirePermission('app_wallets.read'), validate(appUserIdParamSchema, 'params'), validate(listWalletTransactionsSchema, 'query'), controller.transactions);
router.post('/:appUserId/adjustments', auth, requirePermission('app_wallets.update'), validate(appUserIdParamSchema, 'params'), validate(adjustWalletSchema), controller.adjust);

module.exports = router;
