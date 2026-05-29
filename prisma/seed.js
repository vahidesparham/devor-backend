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
        "service_types.read",
        "service_types.create",
        "service_types.update",
        "service_types.delete",
        "feature_definitions.read",
        "feature_definitions.create",
        "feature_definitions.update",
        "feature_definitions.delete",
        "attribute_groups.read",
        "attribute_groups.create",
        "attribute_groups.update",
        "attribute_groups.delete",
        "businesses.read",
        "businesses.create",
        "businesses.update",
        "businesses.delete",
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

    const marketplaceImageConfigs = [
        { code: "business_primary", width: 1200, height: 800, thumbnailWidth: 360, thumbnailHeight: 240, folderName: "businesses" },
        { code: "business_gallery", width: 1600, height: 1000, thumbnailWidth: 400, thumbnailHeight: 250, folderName: "business-gallery" },
        { code: "banner", width: 1440, height: 480, thumbnailWidth: 480, thumbnailHeight: 160, folderName: "banners" },
        { code: "slideshow", width: 1600, height: 700, thumbnailWidth: 480, thumbnailHeight: 210, folderName: "slideshows" },
    ];

    for (const config of marketplaceImageConfigs) {
        await createIfMissing(prisma.imageConfig, { code: config.code }, config);
    }

    const serviceTypes = [
        { code: "restaurant", title: "Restaurant", icon: "hgi-restaurant-01", color: "#ef4444", description: "Restaurants, cafes, and food ordering services.", displayOrder: 10 },
        { code: "beauty_salon", title: "Beauty Salon", icon: "hgi-brush", color: "#ec4899", description: "Beauty salons, appointment booking, and personal care services.", displayOrder: 20 },
        { code: "tourist_place", title: "Tourist Place", icon: "hgi-mountain", color: "#14b8a6", description: "Attractions, trip destinations, tickets, and visit booking.", displayOrder: 30 },
    ];

    for (const item of serviceTypes) {
        await prisma.serviceType.upsert({
            where: { code: item.code },
            update: {},
            create: { ...item, isActive: true },
        });
    }

    const serviceTypeRows = await prisma.serviceType.findMany({
        where: { code: { in: serviceTypes.map((item) => item.code) } },
        select: { id: true, code: true },
    });
    const serviceTypeMap = new Map(serviceTypeRows.map((item) => [item.code, item.id]));

    const features = [
        ["restaurant", "wifi", "Wi-Fi", "hgi-wifi-01", 10],
        ["restaurant", "wheelchair_access", "Wheelchair access", "hgi-disability-01", 20],
        ["restaurant", "parking", "Parking", "hgi-car-parking-02", 30],
        ["restaurant", "outdoor_seating", "Outdoor seating", "hgi-chair-02", 40],
        ["beauty_salon", "online_booking", "Online booking", "hgi-calendar-03", 10],
        ["beauty_salon", "private_room", "Private room", "hgi-door-01", 20],
        ["beauty_salon", "parking", "Parking", "hgi-car-parking-02", 30],
        ["tourist_place", "parking", "Parking", "hgi-car-parking-02", 10],
        ["tourist_place", "guided_tour", "Guided tour", "hgi-user-speaking", 20],
        ["tourist_place", "family_friendly", "Family friendly", "hgi-family", 30],
    ];

    for (const [serviceCode, key, title, icon, displayOrder] of features) {
        const serviceTypeId = serviceTypeMap.get(serviceCode);
        if (!serviceTypeId) continue;
        await prisma.featureDefinition.upsert({
            where: { serviceTypeId_key: { serviceTypeId, key } },
            update: {},
            create: { serviceTypeId, key, title, icon, displayOrder, isActive: true },
        });
    }

    const attributeGroups = [
        {
            serviceCode: "restaurant",
            code: "atmosphere",
            title: "Atmosphere",
            icon: "hgi-sparkles",
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["romantic", "Romantic", "#ef4444", 10],
                ["calm", "Calm", "#14b8a6", 20],
                ["modern", "Modern", "#6366f1", 30],
                ["family_friendly", "Family friendly", "#f59e0b", 40],
            ],
        },
        {
            serviceCode: "restaurant",
            code: "cuisine",
            title: "Cuisine",
            icon: "hgi-restaurant-02",
            selectionMode: "MULTIPLE",
            displayOrder: 20,
            options: [
                ["iranian", "Iranian", "#22c55e", 10],
                ["italian", "Italian", "#ef4444", 20],
                ["fast_food", "Fast food", "#f97316", 30],
            ],
        },
        {
            serviceCode: "beauty_salon",
            code: "specialty",
            title: "Specialty",
            icon: "hgi-brush",
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["hair_coloring", "Hair coloring", "#a855f7", 10],
                ["nails", "Nails", "#ec4899", 20],
                ["makeup", "Makeup", "#f43f5e", 30],
                ["skincare", "Skincare", "#14b8a6", 40],
            ],
        },
        {
            serviceCode: "tourist_place",
            code: "visit_type",
            title: "Visit type",
            icon: "hgi-location-04",
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["nature", "Nature", "#22c55e", 10],
                ["historical", "Historical", "#f59e0b", 20],
                ["adventure", "Adventure", "#0ea5e9", 30],
            ],
        },
    ];

    for (const group of attributeGroups) {
        const serviceTypeId = serviceTypeMap.get(group.serviceCode);
        if (!serviceTypeId) continue;
        const groupRow = await prisma.attributeGroup.upsert({
            where: { serviceTypeId_code: { serviceTypeId, code: group.code } },
            update: {},
            create: {
                serviceTypeId,
                code: group.code,
                title: group.title,
                icon: group.icon,
                selectionMode: group.selectionMode,
                displayOrder: group.displayOrder,
                isActive: true,
            },
        });

        for (const [key, title, color, displayOrder] of group.options) {
            await prisma.attributeOption.upsert({
                where: { groupId_key: { groupId: groupRow.id, key } },
                update: {},
                create: {
                    groupId: groupRow.id,
                    key,
                    title,
                    color,
                    displayOrder,
                    isActive: true,
                },
            });
        }
    }

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
