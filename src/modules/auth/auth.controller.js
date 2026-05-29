const { ok } = require("../../shared/http/response");
const authService = require("./auth.service");

async function login(req, res) {
    const result = await authService.login(req.body, req);
    return ok(res, {
        code: "LOGIN_SUCCESS",
        data: result,
    });
}

async function refresh(req, res) {
    const result = await authService.refresh(req.body, req);
    return ok(res, {
        code: "REFRESH_SUCCESS",
        data: result,
    });
}

async function logout(req, res) {
    const result = await authService.logout(req.body, req);
    return ok(res, {
        code: "LOGOUT_SUCCESS",
        data: result,
    });
}

async function me(req, res) {
    const result = await authService.me(req.admin.id);
    return ok(res, {
        code: "ME_SUCCESS",
        data: result,
    });
}

async function updateMyProfile(req, res) {
    const result = await authService.updateMyProfile(req.admin.id, req.body, req);
    return ok(res, {
        code: "PROFILE_UPDATE_SUCCESS",
        data: result,
    });
}

async function changeMyPassword(req, res) {
    const result = await authService.changeMyPassword(req.admin.id, req.body, req);
    return ok(res, {
        code: "PASSWORD_CHANGE_SUCCESS",
        data: result,
    });
}

module.exports = {
    login,
    refresh,
    logout,
    me,
    updateMyProfile,
    changeMyPassword,
};
