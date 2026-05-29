const prisma = require("../../prisma");
const { redactValue } = require("../utils/sanitize");

async function audit(req, payload) {
    if (payload.action === "REFRESH") {
        return;
    }

    const adminId = req.admin ? req.admin.id : null;

    await prisma.auditLog.create({
        data: {
            traceId: req.traceId || null,
            adminId,
            action: payload.action,
            entity: payload.entity,
            entityId: payload.entityId ? String(payload.entityId) : null,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get("user-agent") || null,
            before: payload.before ? redactValue(payload.before) : null,
            after: payload.after ? redactValue(payload.after) : null,
            details: payload.details ? redactValue(payload.details) : null,
        },
    });
}

module.exports = { audit };
