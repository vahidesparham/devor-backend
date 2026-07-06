const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

const adminPermissions = [
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
    "panel_settings.read",
    "panel_settings.update",
    "slideshows.read",
    "slideshows.create",
    "slideshows.update",
    "slideshows.delete",
    "banners.read",
    "banners.create",
    "banners.update",
    "banners.delete",
    "onboarding_pages.read",
    "onboarding_pages.create",
    "onboarding_pages.update",
    "onboarding_pages.delete",
    "content_pages.read",
    "content_pages.create",
    "content_pages.update",
    "content_pages.delete",
    "blog_posts.read",
    "blog_posts.create",
    "blog_posts.update",
    "blog_posts.delete",
    "faq_categories.read",
    "faq_categories.create",
    "faq_categories.update",
    "faq_categories.delete",
    "faqs.read",
    "faqs.create",
    "faqs.update",
    "faqs.delete",
    "contact_page.read",
    "contact_page.update",
    "service_types.read",
    "service_types.create",
    "service_types.update",
    "service_types.delete",
    "attribute_groups.read",
    "attribute_groups.create",
    "attribute_groups.update",
    "attribute_groups.delete",
    "locations.read",
    "locations.create",
    "locations.update",
    "locations.delete",
    "businesses.read",
    "businesses.create",
    "businesses.update",
    "businesses.publish",
    "businesses.delete",
    "business_users.read",
    "business_users.create",
    "business_users.update",
    "business_users.delete",
    "app_users.read",
    "app_users.update",
    "business_roles.read",
    "business_roles.create",
    "business_roles.update",
    "business_roles.delete",
    "business_working_hours.read",
    "business_working_hours.create",
    "business_working_hours.update",
    "business_working_hours.delete",
    "business_contact_links.read",
    "business_contact_links.create",
    "business_contact_links.update",
    "business_contact_links.delete",
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

const languages = [
    { code: "fa", name: "Persian", nativeName: "فارسی", direction: "RTL", isDefault: true },
    { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: false },
];

const imageConfigs = [
    { code: "admin_avatar", width: 800, height: 800, thumbnailWidth: 200, thumbnailHeight: 200, folderName: "admins" },
    { code: "language_image", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "languages" },
    { code: "business_user_avatar", width: 800, height: 800, thumbnailWidth: 200, thumbnailHeight: 200, folderName: "business-user-avatars" },
    { code: "app_user_avatar", width: 800, height: 800, thumbnailWidth: 200, thumbnailHeight: 200, folderName: "app-user-avatars" },
    { code: "business_logo", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "business-logos" },
    { code: "business_cover", width: 1200, height: 800, thumbnailWidth: 360, thumbnailHeight: 240, folderName: "business-covers" },
    { code: "business_vertical", width: 800, height: 1200, thumbnailWidth: 240, thumbnailHeight: 360, folderName: "business-verticals" },
    { code: "business_gallery", width: 1600, height: 1000, thumbnailWidth: 400, thumbnailHeight: 250, folderName: "business-gallery" },
    { code: "business_slideshow", width: 1600, height: 700, thumbnailWidth: 480, thumbnailHeight: 210, folderName: "business-slideshows" },
    { code: "business_offering_image", width: 1000, height: 750, thumbnailWidth: 300, thumbnailHeight: 225, folderName: "business-offerings" },
    { code: "offering_category_image", width: 800, height: 600, thumbnailWidth: 240, thumbnailHeight: 180, folderName: "offering-categories" },
    { code: "service_type_icon", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "service-types" },
    { code: "service_type_pin_icon", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "service-type-pin-icons" },
    { code: "attribute_group_icon", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "attribute-groups" },
    { code: "attribute_option_image", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "attribute-options" },
    { code: "country_flag", width: 512, height: 512, thumbnailWidth: 128, thumbnailHeight: 128, folderName: "country-flags" },
    { code: "panel_logo", width: 512, height: 160, thumbnailWidth: 256, thumbnailHeight: 80, folderName: "panel-brand" },
    { code: "panel_favicon", width: 128, height: 128, thumbnailWidth: 64, thumbnailHeight: 64, folderName: "panel-brand" },
    { code: "banner", width: 1440, height: 480, thumbnailWidth: 480, thumbnailHeight: 160, folderName: "banners" },
    { code: "slideshow", width: 1600, height: 700, thumbnailWidth: 480, thumbnailHeight: 210, folderName: "slideshows" },
    { code: "onboarding_page", width: 1080, height: 1080, thumbnailWidth: 320, thumbnailHeight: 320, folderName: "onboarding-pages" },
    { code: "content_page", width: 1200, height: 800, thumbnailWidth: 360, thumbnailHeight: 240, folderName: "content-pages" },
    { code: "blog_post", width: 1200, height: 800, thumbnailWidth: 360, thumbnailHeight: 240, folderName: "blog-posts" },
    { code: "faq_category", width: 800, height: 600, thumbnailWidth: 240, thumbnailHeight: 180, folderName: "faq-categories" },
];

const businessPermissions = [
    { key: "business.profile.read", groupName: "profile", title: "مشاهده پروفایل", description: "View business core profile", displayOrder: 10 },
    { key: "business.profile.update", groupName: "profile", title: "ویرایش پروفایل", description: "Update business core profile", displayOrder: 20 },
    { key: "business.media.read", groupName: "media", title: "مشاهده رسانه‌ها", description: "View gallery and slideshow", displayOrder: 30 },
    { key: "business.media.manage", groupName: "media", title: "مدیریت رسانه‌ها", description: "Manage gallery and slideshow", displayOrder: 40 },
    { key: "business.working_hours.read", groupName: "working_hours", title: "مشاهده ساعات کاری", description: "View working hours", displayOrder: 50 },
    { key: "business.working_hours.manage", groupName: "working_hours", title: "مدیریت ساعات کاری", description: "Manage working hours", displayOrder: 60 },
    { key: "business.contact_links.read", groupName: "contact_links", title: "مشاهده راه‌های ارتباطی", description: "View business contact and map links", displayOrder: 70 },
    { key: "business.contact_links.manage", groupName: "contact_links", title: "مدیریت راه‌های ارتباطی", description: "Manage business contact and map links", displayOrder: 80 },
    { key: "business.offerings.read", groupName: "offerings", title: "مشاهده آیتم‌ها", description: "View offerings and categories", displayOrder: 90 },
    { key: "business.offerings.manage", groupName: "offerings", title: "مدیریت آیتم‌ها", description: "Manage offerings, categories and options", displayOrder: 100 },
    { key: "business.members.read", groupName: "members", title: "مشاهده اعضا", description: "View business members", displayOrder: 110 },
    { key: "business.members.manage", groupName: "members", title: "مدیریت اعضا", description: "Manage business members", displayOrder: 120 },
    { key: "business.roles.read", groupName: "roles", title: "مشاهده نقش‌ها", description: "View business roles", displayOrder: 130 },
    { key: "business.roles.manage", groupName: "roles", title: "مدیریت نقش‌ها", description: "Manage business roles and permissions", displayOrder: 140 },
    { key: "business.preview.read", groupName: "preview", title: "مشاهده پیش‌نمایش", description: "View business app preview", displayOrder: 150 },
];

async function seedAdminPermissions() {
    for (const key of adminPermissions) {
        await prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key },
        });
    }

    await prisma.permission.deleteMany({ where: { key: { startsWith: "feature_definitions." } } });
}

async function seedSuperAdmin() {
    const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

    const role = await prisma.role.upsert({
        where: { name: "SUPER_ADMIN" },
        update: {
            title: "System Administrator",
            icon: "shield-check",
            color: "#DC2626",
            description: "Full access role",
        },
        create: {
            name: "SUPER_ADMIN",
            title: "System Administrator",
            icon: "shield-check",
            color: "#DC2626",
            description: "Full access role",
        },
    });

    const permissions = await prisma.permission.findMany({ where: { key: { in: adminPermissions } } });
    for (const permission of permissions) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
            update: {},
            create: { roleId: role.id, permissionId: permission.id },
        });
    }

    const admin = await prisma.adminUser.upsert({
        where: { email },
        update: {
            isActive: true,
        },
        create: {
            email,
            firstName: process.env.SEED_ADMIN_FIRST_NAME || "System",
            lastName: process.env.SEED_ADMIN_LAST_NAME || "Admin",
            avatar: process.env.SEED_ADMIN_AVATAR || null,
            passwordHash: await bcrypt.hash(password, 12),
            isActive: true,
        },
    });

    await prisma.adminUserRole.upsert({
        where: { adminUserId_roleId: { adminUserId: admin.id, roleId: role.id } },
        update: {},
        create: { adminUserId: admin.id, roleId: role.id },
    });

    return email;
}

async function seedLanguages() {
    for (const item of languages) {
        await prisma.language.upsert({
            where: { code: item.code },
            update: {
                name: item.name,
                nativeName: item.nativeName,
                direction: item.direction,
                isActive: true,
                isDefault: item.isDefault,
            },
            create: {
                ...item,
                isActive: true,
            },
        });
    }

    await prisma.language.updateMany({
        where: { code: { notIn: languages.map((item) => item.code) } },
        data: { isActive: false, isDefault: false },
    });
}

async function seedImageConfigs() {
    await prisma.imageConfig.deleteMany({ where: { code: "business_primary" } });

    for (const config of imageConfigs) {
        await prisma.imageConfig.upsert({
            where: { code: config.code },
            update: config,
            create: config,
        });
    }
}

async function seedPanelSettings() {
    await prisma.panelSetting.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            panelTitle: "Devor",
            panelLogo: null,
            panelFavicon: null,
        },
    });
}

async function seedContactPage() {
    await prisma.contactPage.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
    });
}

async function seedBusinessPermissions() {
    for (const permission of businessPermissions) {
        await prisma.businessPermission.upsert({
            where: { key: permission.key },
            update: { ...permission, isActive: true },
            create: { ...permission, isActive: true },
        });
    }
}

async function main() {
    await seedAdminPermissions();
    const adminEmail = await seedSuperAdmin();
    await seedLanguages();
    await seedImageConfigs();
    await seedPanelSettings();
    await seedContactPage();
    await seedBusinessPermissions();

    console.log("Seed complete.");
    console.log(`Super admin: ${adminEmail}`);
}

main()
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
