const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

async function createIfMissing(model, where, create) {
    const existing = await model.findUnique({ where });
    if (existing) {
        return existing;
    }

    return model.create({ data: create });
}

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
    const firstName = process.env.SEED_ADMIN_FIRST_NAME || "System";
    const lastName = process.env.SEED_ADMIN_LAST_NAME || "Admin";
    const avatar = process.env.SEED_ADMIN_AVATAR || null;

    const permissions = [
        "admin_users.read",
        "admin_users.create",
        "admin_users.update",
        "image_configs.read",
        "image_configs.create",
        "image_configs.update",
        "image_configs.delete",
        "uploads.create",
        "roles.read",
        "roles.create",
        "roles.update",
        "roles.delete",
        "permissions.read",
        "languages.read",
        "languages.create",
        "languages.update",
        "languages.delete",
        "slideshows.read",
        "slideshows.create",
        "slideshows.update",
        "slideshows.delete",
        "banners.read",
        "banners.create",
        "banners.update",
        "banners.delete",
        "audit_logs.read",
        "error_logs.read",
    ];

    for (const key of permissions) {
        await prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key },
        });
    }

    const superAdminRole = await createIfMissing(
        prisma.role,
        { name: "SUPER_ADMIN" },
        {
            name: "SUPER_ADMIN",
            title: "System Administrator",
            icon: "shield-check",
            color: "#DC2626",
            description: "Full access role",
        },
    );

    const dbPermissions = await prisma.permission.findMany({
        where: { key: { in: permissions } },
    });

    for (const permission of dbPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: permission.id,
            },
        });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await createIfMissing(
        prisma.adminUser,
        { email },
        {
            email,
            firstName,
            lastName,
            avatar,
            passwordHash,
            isActive: true,
        },
    );

    await prisma.adminUserRole.upsert({
        where: {
            adminUserId_roleId: {
                adminUserId: admin.id,
                roleId: superAdminRole.id,
            },
        },
        update: {},
        create: {
            adminUserId: admin.id,
            roleId: superAdminRole.id,
        },
    });

    const defaultLanguages = [
        { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: true },
        { code: "fa", name: "Persian", nativeName: "Persian", direction: "RTL", isDefault: false },
        { code: "ar", name: "Arabic", nativeName: "Arabic", direction: "RTL", isDefault: false },
        { code: "de", name: "German", nativeName: "Deutsch", direction: "LTR", isDefault: false },
    ];

    for (const item of defaultLanguages) {
        await createIfMissing(
            prisma.language,
            { code: item.code },
            {
                code: item.code,
                name: item.name,
                nativeName: item.nativeName,
                direction: item.direction,
                isActive: true,
                isDefault: item.isDefault,
            },
        );
    }

    await createIfMissing(
        prisma.imageConfig,
        { code: "admin_avatar" },
        {
            code: "admin_avatar",
            width: 800,
            height: 800,
            thumbnailWidth: 200,
            thumbnailHeight: 200,
            folderName: "admins",
        },
    );

    // eslint-disable-next-line no-console
    console.log("Seed complete.");
    // eslint-disable-next-line no-console
    console.log(`Super admin: ${email}`);
}

main()
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Seed failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
