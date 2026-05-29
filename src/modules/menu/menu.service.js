const menuRegistry = require("./menu.registry");

function hasPermission(userPerms, neededPermission) {
    if (!neededPermission) {
        return true;
    }
    return Array.isArray(userPerms) && userPerms.includes(neededPermission);
}

function buildMenuForPermissions(userPerms) {
    return menuRegistry
        .map((group) => {
            const items = (group.items || [])
                .filter((item) => hasPermission(userPerms, item.permission))
                .sort((a, b) => a.order - b.order);

            return {
                ...group,
                items,
            };
        })
        .filter((group) => group.items.length > 0)
        .sort((a, b) => a.order - b.order);
}

module.exports = {
    buildMenuForPermissions,
    hasPermission,
};
