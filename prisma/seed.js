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
        "attribute_groups.read",
        "attribute_groups.create",
        "attribute_groups.update",
        "attribute_groups.delete",
        "businesses.read",
        "businesses.create",
        "businesses.update",
        "businesses.delete",
        "business_users.read",
        "business_users.create",
        "business_users.update",
        "business_users.delete",
        "business_working_hours.read",
        "business_working_hours.create",
        "business_working_hours.update",
        "business_working_hours.delete",
        "offering_categories.read",
        "offering_categories.create",
        "offering_categories.update",
        "offering_categories.delete",
        "offerings.read",
        "offerings.create",
        "offerings.update",
        "offerings.delete",
        "offering_option_groups.read",
        "offering_option_groups.create",
        "offering_option_groups.update",
        "offering_option_groups.delete",
        "offering_options.read",
        "offering_options.create",
        "offering_options.update",
        "offering_options.delete",
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
    await prisma.permission.deleteMany({ where: { key: { startsWith: "feature_definitions." } } });

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
        { code: "business_logo", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "business-logos" },
        { code: "business_cover", width: 1200, height: 800, thumbnailWidth: 360, thumbnailHeight: 240, folderName: "business-covers" },
        { code: "business_gallery", width: 1600, height: 1000, thumbnailWidth: 400, thumbnailHeight: 250, folderName: "business-gallery" },
        { code: "offering_category_image", width: 800, height: 600, thumbnailWidth: 240, thumbnailHeight: 180, folderName: "offering-categories" },
        { code: "business_offering_image", width: 1000, height: 750, thumbnailWidth: 300, thumbnailHeight: 225, folderName: "business-offerings" },
        { code: "service_type_icon", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "service-types" },
        { code: "attribute_group_icon", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "attribute-groups" },
        { code: "attribute_option_image", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "attribute-options" },
        { code: "banner", width: 1440, height: 480, thumbnailWidth: 480, thumbnailHeight: 160, folderName: "banners" },
        { code: "slideshow", width: 1600, height: 700, thumbnailWidth: 480, thumbnailHeight: 210, folderName: "slideshows" },
    ];

    await prisma.imageConfig.deleteMany({ where: { code: "business_primary" } });

    for (const config of marketplaceImageConfigs) {
        await createIfMissing(prisma.imageConfig, { code: config.code }, config);
    }

    const serviceTypes = [
        {
            code: "restaurant",
            title: "Restaurant",
            color: "#ef4444",
            description: "Restaurants, cafes, and food ordering services.",
            displayOrder: 10,
            translations: {
                en: { title: "Restaurant", description: "Restaurants, cafes, and food ordering services." },
                fa: { title: "رستوران", description: "رستوران‌ها، کافه‌ها و سرویس‌های سفارش غذا." },
                ar: { title: "مطعم", description: "المطاعم والمقاهي وخدمات طلب الطعام." },
                de: { title: "Restaurant", description: "Restaurants, Cafes und Essensbestellungen." },
            },
        },
        {
            code: "beauty_salon",
            title: "Beauty Salon",
            color: "#ec4899",
            description: "Beauty salons, appointment booking, and personal care services.",
            displayOrder: 20,
            translations: {
                en: { title: "Beauty Salon", description: "Beauty salons, appointment booking, and personal care services." },
                fa: { title: "سالن زیبایی", description: "سالن‌های زیبایی، رزرو وقت و خدمات مراقبت شخصی." },
                ar: { title: "صالون تجميل", description: "صالونات التجميل وحجز المواعيد وخدمات العناية الشخصية." },
                de: { title: "Schönheitssalon", description: "Schönheitssalons, Terminbuchung und persönliche Pflege." },
            },
        },
        {
            code: "tourist_place",
            title: "Tourist Place",
            color: "#14b8a6",
            description: "Attractions, trip destinations, tickets, and visit booking.",
            displayOrder: 30,
            translations: {
                en: { title: "Tourist Place", description: "Attractions, trip destinations, tickets, and visit booking." },
                fa: { title: "مکان گردشگری", description: "جاذبه‌ها، مقصدهای سفر، بلیت و رزرو بازدید." },
                ar: { title: "مكان سياحي", description: "المعالم والوجهات والتذاكر وحجز الزيارات." },
                de: { title: "Touristischer Ort", description: "Sehenswürdigkeiten, Reiseziele, Tickets und Besuchsbuchungen." },
            },
        },
    ];

    for (const item of serviceTypes) {
        const { translations, ...serviceTypeData } = item;
        const serviceType = await prisma.serviceType.upsert({
            where: { code: item.code },
            update: serviceTypeData,
            create: { ...serviceTypeData, isActive: true },
        });

        for (const [lang, translation] of Object.entries(translations)) {
            await prisma.serviceTypeTranslation.upsert({
                where: { serviceTypeId_lang: { serviceTypeId: serviceType.id, lang } },
                update: {
                    title: translation.title,
                    description: translation.description,
                    isActive: true,
                },
                create: {
                    serviceTypeId: serviceType.id,
                    lang,
                    title: translation.title,
                    description: translation.description,
                    isActive: true,
                },
            });
        }
    }

    const serviceTypeRows = await prisma.serviceType.findMany({
        where: { code: { in: serviceTypes.map((item) => item.code) } },
        select: { id: true, code: true },
    });
    const serviceTypeMap = new Map(serviceTypeRows.map((item) => [item.code, item.id]));

    const attributeGroups = [
        {
            serviceCode: "restaurant",
            code: "amenities",
            title: "Amenities",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 5,
            options: [
                ["wifi", "Wi-Fi", "#6366f1", "hgi-wifi-01", 10],
                ["wheelchair_access", "Wheelchair access", "#14b8a6", "hgi-disability-01", 20],
                ["parking", "Parking", "#0ea5e9", "hgi-car-parking-02", 30],
                ["outdoor_seating", "Outdoor seating", "#22c55e", "hgi-chair-02", 40],
            ],
        },
        {
            serviceCode: "restaurant",
            code: "atmosphere",
            title: "Atmosphere",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["romantic", "Romantic", "#ef4444", null, 10],
                ["calm", "Calm", "#14b8a6", null, 20],
                ["modern", "Modern", "#6366f1", null, 30],
                ["family_friendly", "Family friendly", "#f59e0b", null, 40],
            ],
        },
        {
            serviceCode: "restaurant",
            code: "cuisine",
            title: "Cuisine",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 20,
            options: [
                ["iranian", "Iranian", "#22c55e", null, 10],
                ["italian", "Italian", "#ef4444", null, 20],
                ["fast_food", "Fast food", "#f97316", null, 30],
            ],
        },
        {
            serviceCode: "beauty_salon",
            code: "amenities",
            title: "Amenities",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 5,
            options: [
                ["online_booking", "Online booking", "#6366f1", "hgi-calendar-03", 10],
                ["private_room", "Private room", "#ec4899", "hgi-door-01", 20],
                ["parking", "Parking", "#0ea5e9", "hgi-car-parking-02", 30],
            ],
        },
        {
            serviceCode: "beauty_salon",
            code: "specialty",
            title: "Specialty",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["hair_coloring", "Hair coloring", "#a855f7", null, 10],
                ["nails", "Nails", "#ec4899", null, 20],
                ["makeup", "Makeup", "#f43f5e", null, 30],
                ["skincare", "Skincare", "#14b8a6", null, 40],
            ],
        },
        {
            serviceCode: "tourist_place",
            code: "amenities",
            title: "Amenities",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 5,
            options: [
                ["parking", "Parking", "#0ea5e9", "hgi-car-parking-02", 10],
                ["guided_tour", "Guided tour", "#6366f1", "hgi-user-speaking", 20],
                ["family_friendly", "Family friendly", "#f59e0b", "hgi-family", 30],
            ],
        },
        {
            serviceCode: "tourist_place",
            code: "visit_type",
            title: "Visit type",
            image: null,
            selectionMode: "MULTIPLE",
            displayOrder: 10,
            options: [
                ["nature", "Nature", "#22c55e", null, 10],
                ["historical", "Historical", "#f59e0b", null, 20],
                ["adventure", "Adventure", "#0ea5e9", null, 30],
            ],
        },
    ];

    const attributeGroupSeedTranslations = {
        amenities: { fa: "امکانات", ar: "المرافق", de: "Ausstattung" },
        atmosphere: { fa: "اتمسفر", ar: "الأجواء", de: "Atmosphäre" },
        cuisine: { fa: "نوع غذا", ar: "نوع المطبخ", de: "Küche" },
        specialty: { fa: "تخصص", ar: "التخصص", de: "Spezialität" },
        visit_type: { fa: "نوع بازدید", ar: "نوع الزيارة", de: "Besuchsart" },
    };

    const attributeOptionSeedTranslations = {
        wifi: { fa: "وای‌فای", ar: "واي فاي", de: "WLAN" },
        wheelchair_access: { fa: "ورودی با ویلچر", ar: "دخول بالكراسي المتحركة", de: "Rollstuhlgerecht" },
        parking: { fa: "پارکینگ", ar: "موقف سيارات", de: "Parkplatz" },
        outdoor_seating: { fa: "فضای باز", ar: "جلسات خارجية", de: "Außenbereich" },
        romantic: { fa: "رمانتیک", ar: "رومانسي", de: "Romantisch" },
        calm: { fa: "آرام", ar: "هادئ", de: "Ruhig" },
        modern: { fa: "مدرن", ar: "حديث", de: "Modern" },
        family_friendly: { fa: "مناسب خانواده", ar: "مناسب للعائلات", de: "Familienfreundlich" },
        iranian: { fa: "ایرانی", ar: "إيراني", de: "Iranisch" },
        italian: { fa: "ایتالیایی", ar: "إيطالي", de: "Italienisch" },
        fast_food: { fa: "فست‌فود", ar: "وجبات سريعة", de: "Fast Food" },
        online_booking: { fa: "رزرو آنلاین", ar: "حجز عبر الإنترنت", de: "Online-Buchung" },
        private_room: { fa: "اتاق خصوصی", ar: "غرفة خاصة", de: "Privatraum" },
        hair_coloring: { fa: "رنگ مو", ar: "صبغ الشعر", de: "Haarfarbe" },
        nails: { fa: "ناخن", ar: "أظافر", de: "Nägel" },
        makeup: { fa: "میکاپ", ar: "مكياج", de: "Make-up" },
        skincare: { fa: "مراقبت پوست", ar: "العناية بالبشرة", de: "Hautpflege" },
        guided_tour: { fa: "تور راهنما", ar: "جولة مع مرشد", de: "Geführte Tour" },
        nature: { fa: "طبیعت", ar: "طبيعة", de: "Natur" },
        historical: { fa: "تاریخی", ar: "تاريخي", de: "Historisch" },
        adventure: { fa: "ماجراجویی", ar: "مغامرة", de: "Abenteuer" },
    };

    for (const group of attributeGroups) {
        const serviceTypeId = serviceTypeMap.get(group.serviceCode);
        if (!serviceTypeId) continue;
        const groupRow = await prisma.attributeGroup.upsert({
            where: { serviceTypeId_code: { serviceTypeId, code: group.code } },
            update: {
                title: group.title,
                image: group.image,
                selectionMode: group.selectionMode,
                displayOrder: group.displayOrder,
                isActive: true,
            },
            create: {
                serviceTypeId,
                code: group.code,
                title: group.title,
                image: group.image,
                selectionMode: group.selectionMode,
                displayOrder: group.displayOrder,
                isActive: true,
            },
        });

        for (const lang of defaultLanguages.map((item) => item.code)) {
            const translatedTitle = attributeGroupSeedTranslations[group.code]?.[lang] || group.title;
            await prisma.attributeGroupTranslation.upsert({
                where: { groupId_lang: { groupId: groupRow.id, lang } },
                update: { title: translatedTitle, isActive: true },
                create: { groupId: groupRow.id, lang, title: translatedTitle, isActive: true },
            });
        }

        for (const [key, title, color, _legacyIcon, displayOrder] of group.options) {
            const optionRow = await prisma.attributeOption.upsert({
                where: { groupId_key: { groupId: groupRow.id, key } },
                update: { title, color, image: null, displayOrder, isActive: true },
                create: {
                    groupId: groupRow.id,
                    key,
                    title,
                    color,
                    image: null,
                    displayOrder,
                    isActive: true,
                },
            });
            for (const lang of defaultLanguages.map((item) => item.code)) {
                const translatedTitle = attributeOptionSeedTranslations[key]?.[lang] || title;
                await prisma.attributeOptionTranslation.upsert({
                    where: { optionId_lang: { optionId: optionRow.id, lang } },
                    update: { title: translatedTitle, isActive: true },
                    create: { optionId: optionRow.id, lang, title: translatedTitle, isActive: true },
                });
            }
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
