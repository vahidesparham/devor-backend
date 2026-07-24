const { ok } = require('../../shared/http/response');
const service = require('./appWallet.service');

async function list(req, res) {
  const result = await service.listAppWallets(req.query);
  return ok(res, { code: 'APP_WALLET_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function detail(req, res) {
  const item = await service.getAppWalletByUserId(req.params.appUserId);
  return ok(res, { code: 'APP_WALLET_DETAIL_SUCCESS', data: item });
}

async function transactions(req, res) {
  const result = await service.listWalletTransactions(req.params.appUserId, req.query);
  return ok(res, { code: 'APP_WALLET_TRANSACTION_LIST_SUCCESS', data: result.items, meta: result.meta });
}

async function adjust(req, res) {
  const result = await service.adjustAppWallet(req.params.appUserId, req.body, req);
  return ok(res, { code: 'APP_WALLET_ADJUST_SUCCESS', data: result });
}

module.exports = {
  adjust,
  detail,
  list,
  transactions,
};
