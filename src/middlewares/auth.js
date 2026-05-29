const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const env = require("../config/env");
const { AppError } = require("../shared/http/response");

function normalizeToken(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim() || null;
    return raw;
}

function extractAccessToken(req) {
    const authHeader = req.get("authorization");
    const headerToken = normalizeToken(authHeader);
    if (headerToken) return headerToken;

    const xToken = normalizeToken(req.get("x-access-token"));
    if (xToken) return xToken;

    const bodyToken = normalizeToken(req.body && req.body.accessToken);
    if (bodyToken) return bodyToken;

    const queryToken = normalizeToken(req.query && req.query.accessToken);
    if (queryToken) return queryToken;

    return null;
}

async function auth(req, _res, next) {
    const token = extractAccessToken(req);

    if (!token) {
        throw new AppError(401, "UNAUTHORIZED", "Missing access token");
    }

    let payload;
    try {
        payload = jwt.verify(token, env.JWT_SECRET);
    } catch (_err) {
        throw new AppError(401, "UNAUTHORIZED", "Invalid or expired access token");
    }

    const adminId = Number(payload.sub);
    const admin = await prisma.adminUser.findUnique({
        where: { id: adminId },
        include: {
            adminUserRoles: {
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!admin || !admin.isActive) {
        throw new AppError(401, "UNAUTHORIZED", "Admin account is not active");
    }

    const roles = admin.adminUserRoles.map((r) => r.role.name);
    const roleDetails = admin.adminUserRoles.map((r) => ({
        name: r.role.name,
        title: r.role.title,
        icon: r.role.icon,
        color: r.role.color,
    }));
    const permissions = Array.from(new Set(admin.adminUserRoles.flatMap((r) => r.role.rolePermissions.map((rp) => rp.permission.key))));

    req.admin = {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        avatar: admin.avatar,
        roles,
        roleDetails,
        permissions,
    };

    next();
}

module.exports = auth;
