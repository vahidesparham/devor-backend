const { ok } = require("../../shared/http/response");
const { buildMenuForPermissions } = require("./menu.service");

function getMenu(req, res) {
    const perms = Array.isArray(req.admin?.permissions) ? req.admin.permissions : [];
    const menu = buildMenuForPermissions(perms);

    return ok(res, {
        code: "MENU_OK",
        message: null,
        data: menu,
        meta: null,
        traceId: req.traceId,
    });
}

module.exports = {
    getMenu,
};
