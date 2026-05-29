class AppError extends Error {
    constructor(statusCode, code, message, options = {}) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.errors = options.errors || null;
        this.details = options.details || null;
    }
}

function ok(res, payload = {}, statusCode = 200) {
    return res.status(statusCode).json({
        ok: true,
        code: payload.code || "OK",
        message: payload.message ?? null,
        data: payload.data ?? null,
        meta: payload.meta ?? null,
        errors: null,
        traceId: res.req.traceId || null,
    });
}

function fail(res, payload = {}, statusCode = 400) {
    return res.status(statusCode).json({
        ok: false,
        code: payload.code || "BAD_REQUEST",
        message: payload.message || "Request failed",
        data: null,
        meta: null,
        errors: payload.errors || null,
        traceId: res.req.traceId || null,
    });
}

module.exports = {
    AppError,
    ok,
    fail,
};
