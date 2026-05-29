const { AppError } = require("../shared/http/response");

function requirePermission(permission) {
    return (req, _res, next) => {
        if (!req.admin) {
            throw new AppError(401, "UNAUTHORIZED", "Authentication required");
        }

        if (req.admin.roles.includes("SUPER_ADMIN") || req.admin.permissions.includes(permission)) {
            return next();
        }

        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
    };
}

module.exports = requirePermission;
