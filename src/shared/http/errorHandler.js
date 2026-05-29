const { ZodError } = require("zod");
const { Prisma } = require("../../generated/prisma-client");
const multer = require("multer");
const prisma = require("../../prisma");
const env = require("../../config/env");
const { AppError } = require("./response");
const { redactValue } = require("../utils/sanitize");

function getDurationMs(req) {
    if (typeof req.durationMs === "number") {
        return req.durationMs;
    }
    if (req._startAtHr) {
        return Number(process.hrtime.bigint() - req._startAtHr) / 1e6;
    }
    return null;
}

function normalizeError(err) {
    if (err instanceof ZodError) {
        return {
            statusCode: 400,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: err.issues.map((issue) => ({
                path: issue.path.join(".") || null,
                message: issue.message,
            })),
            details: null,
        };
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? err.meta.target : [];
        return {
            statusCode: 409,
            code: "UNIQUE_CONSTRAINT",
            message: "Unique constraint violation",
            errors: target.length ? target.map((item) => ({ path: item, message: "Must be unique" })) : null,
            details: { prismaCode: err.code },
        };
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        return {
            statusCode: 409,
            code: "FOREIGN_KEY_CONSTRAINT",
            message: "Operation violates foreign key constraint",
            errors: null,
            details: { prismaCode: err.code, field: err.meta?.field_name || null },
        };
    }

    if (err instanceof multer.MulterError) {
        return {
            statusCode: 400,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: [
                {
                    path: err.field || "image",
                    message: err.code === "LIMIT_FILE_SIZE" ? "Image is too large" : err.message,
                },
            ],
            details: { multerCode: err.code },
        };
    }

    if (err instanceof AppError) {
        return {
            statusCode: err.statusCode,
            code: err.code,
            message: err.message,
            errors: err.errors || null,
            details: err.details || null,
        };
    }

    return {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        errors: null,
        details: null,
    };
}

function shouldPersistError(normalized, err) {
    if (normalized.statusCode < 400) {
        return false;
    }

    if (env.ERROR_LOG_IGNORE_STATUS_CODES.includes(normalized.statusCode)) {
        return false;
    }

    if (normalized.code && env.ERROR_LOG_IGNORE_CODES.includes(normalized.code)) {
        return false;
    }

    if (normalized.statusCode === 404 && !env.LOG_404_ERRORS) {
        return false;
    }

    if (normalized.code === "VALIDATION_ERROR" && env.NODE_ENV === "development" && !env.LOG_VALIDATION_ERRORS) {
        return false;
    }

    return true;
}

async function persistError(req, normalized, err) {
    const stack = err && err.stack ? String(err.stack).slice(0, 4000) : null;

    await prisma.errorLog.create({
        data: {
            traceId: req.traceId || null,
            adminId: req.admin ? req.admin.id : null,
            method: req.method,
            path: req.originalUrl,
            query: redactValue(req.query || {}),
            ip: req.ip,
            userAgent: req.get("user-agent") || null,
            statusCode: normalized.statusCode,
            code: normalized.code,
            message: normalized.message,
            stack,
            details: redactValue({
                errors: normalized.errors,
                details: normalized.details,
                rawName: err?.name || null,
            }),
            durationMs: getDurationMs(req),
        },
    });
}

async function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const normalized = normalizeError(err);

    if (shouldPersistError(normalized, err)) {
        try {
            await persistError(req, normalized, err);
        } catch (_persistErr) {
            // Never block API response when logging fails.
        }
    }

    return res.status(normalized.statusCode).json({
        ok: false,
        code: normalized.code,
        message: normalized.message,
        data: null,
        meta: null,
        errors: normalized.errors,
        traceId: req.traceId || null,
    });
}

module.exports = errorHandler;
