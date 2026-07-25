const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

const categories = [
  {
    code: "classified-vehicles",
    slug: "vehicles",
    title: "وسایل نقلیه",
    color: "#3267A8",
    image: "/uploads/onboarding-pages/on_2-1lkdllt9.webp",
    children: [
      ["classified-cars", "cars", "خودرو"],
      ["classified-motorcycles", "motorcycles", "موتورسیکلت"],
    ],
  },
  {
    code: "classified-real-estate",
    slug: "real-estate",
    title: "املاک",
    color: "#138574",
    image: "/uploads/content-pages/about-eqkz1lie.webp",
    children: [
      ["classified-apartments", "apartments", "آپارتمان"],
      ["classified-commercial", "commercial", "اداری و تجاری"],
    ],
  },
  {
    code: "classified-digital",
    slug: "digital",
    title: "موبایل و دیجیتال",
    color: "#6C56A5",
    image: "/uploads/onboarding-pages/on_4-4djb91ro.webp",
    children: [
      ["classified-mobile", "mobile", "موبایل"],
      ["classified-laptop", "laptop", "لپ‌تاپ"],
    ],
  },
  {
    code: "classified-home",
    slug: "home-and-kitchen",
    title: "خانه و آشپزخانه",
    color: "#B56C31",
    image: "/uploads/business-covers/mahestan-cover-2eor1xv6.webp",
    children: [
      ["classified-furniture", "furniture", "مبلمان"],
      ["classified-appliances", "appliances", "لوازم خانگی"],
    ],
  },
  {
    code: "classified-sport",
    slug: "sport-and-leisure",
    title: "ورزش و سرگرمی",
    color: "#B0445A",
    image: "/uploads/banners/bg2-glvjymm7.webp",
    children: [
      ["classified-sport-equipment", "sport-equipment", "لوازم ورزشی"],
      ["classified-hobbies", "hobbies", "سرگرمی و کلکسیون"],
    ],
  },
];

const adTemplates = [
  {
    category: "classified-cars",
    title: "تویوتا کمری تمیز و کم‌کار",
    description: "خودرو شخصی، سرویس‌شده و آماده بازدید در دوشنبه.",
    priceType: "FIXED",
    price: 138000,
    image: "/uploads/slideshows/picked-9bi119o2.webp",
  },
  {
    category: "classified-motorcycles",
    title: "موتورسیکلت شهری سالم",
    description: "مدارک کامل، مصرف پایین و مناسب رفت‌وآمد روزانه.",
    priceType: "NEGOTIABLE",
    price: 18500,
    image: "/uploads/onboarding-pages/on_2-1lkdllt9.webp",
  },
  {
    category: "classified-apartments",
    title: "آپارتمان دوخوابه نزدیک رودکی",
    description: "نورگیر، بازسازی‌شده و مناسب خانواده.",
    priceType: "CONTACT",
    price: null,
    image: "/uploads/content-pages/about-eqkz1lie.webp",
  },
  {
    category: "classified-commercial",
    title: "دفتر کار مبله در مرکز شهر",
    description: "آماده استفاده با دسترسی مناسب و پارکینگ.",
    priceType: "FIXED",
    price: 6200,
    image: "/uploads/content-pages/chatgpt-image-jun-9-2026-10_09_10-pm-1kjpjb03.webp",
  },
  {
    category: "classified-mobile",
    title: "گوشی هوشمند ۱۲۸ گیگ",
    description: "بدون خط و خش، همراه جعبه و لوازم کامل.",
    priceType: "NEGOTIABLE",
    price: 4200,
    image: "/uploads/onboarding-pages/on_4-4djb91ro.webp",
  },
  {
    category: "classified-laptop",
    title: "لپ‌تاپ مناسب کار و دانشگاه",
    description: "سالم، سریع و همراه کیف و شارژر اصلی.",
    priceType: "FIXED",
    price: 7800,
    image: "/uploads/slideshows/2578e016501843d97c7fd39abe56915c-fuvyw3j3.webp",
  },
  {
    category: "classified-furniture",
    title: "مبل راحتی هفت نفره",
    description: "تمیز و سالم، فروش به دلیل تغییر دکوراسیون.",
    priceType: "NEGOTIABLE",
    price: 3600,
    image: "/uploads/business-covers/mahestan-cover-2eor1xv6.webp",
  },
  {
    category: "classified-appliances",
    title: "یخچال فریزر کم‌مصرف",
    description: "کاملاً سالم و آماده تحویل.",
    priceType: "FIXED",
    price: 5100,
    image: "/uploads/business-gallery/mahestan-cover-dmnvrvl4.webp",
  },
  {
    category: "classified-sport-equipment",
    title: "ست دمبل خانگی",
    description: "مناسب تمرین در خانه و در وضعیت بسیار خوب.",
    priceType: "FIXED",
    price: 850,
    image: "/uploads/banners/bg2-glvjymm7.webp",
  },
  {
    category: "classified-hobbies",
    title: "کتاب‌های داستان برای هدیه",
    description: "مجموعه کتاب تمیز؛ تحویل رایگان در مرکز شهر.",
    priceType: "FREE",
    price: null,
    image: "/uploads/blog-posts/splash_bg-bhf5zht6.webp",
  },
];

async function seedCategories() {
  const byCode = new Map();
  for (let rootIndex = 0; rootIndex < categories.length; rootIndex += 1) {
    const definition = categories[rootIndex];
    const root = await prisma.classifiedCategory.upsert({
      where: { code: definition.code },
      update: {
        parentId: null,
        slug: definition.slug,
        title: definition.title,
        image: definition.image,
        color: definition.color,
        displayOrder: (rootIndex + 1) * 10,
        isActive: true,
        allowAds: false,
      },
      create: {
        code: definition.code,
        slug: definition.slug,
        title: definition.title,
        image: definition.image,
        color: definition.color,
        displayOrder: (rootIndex + 1) * 10,
        isActive: true,
        allowAds: false,
        postingFee: 0,
      },
    });
    byCode.set(definition.code, root);

    for (let childIndex = 0; childIndex < definition.children.length; childIndex += 1) {
      const [code, slug, title] = definition.children[childIndex];
      const child = await prisma.classifiedCategory.upsert({
        where: { code },
        update: {
          parentId: root.id,
          slug,
          title,
          color: definition.color,
          displayOrder: (childIndex + 1) * 10,
          isActive: true,
          allowAds: true,
        },
        create: {
          parentId: root.id,
          code,
          slug,
          title,
          color: definition.color,
          displayOrder: (childIndex + 1) * 10,
          isActive: true,
          allowAds: true,
          postingFee: code === "classified-apartments" ? 10 : 0,
        },
      });
      byCode.set(code, child);
    }
  }
  return byCode;
}

async function seedLocationAndOwner() {
  const country = await prisma.country.upsert({
    where: { code: "TJ" },
    update: { title: "تاجیکستان", phoneCode: "+992", isActive: true },
    create: { code: "TJ", title: "تاجیکستان", phoneCode: "+992", isActive: true },
  });
  const city = await prisma.city.upsert({
    where: { countryId_code: { countryId: country.id, code: "dushanbe" } },
    update: { title: "دوشنبه", isActive: true },
    create: { countryId: country.id, code: "dushanbe", title: "دوشنبه", isActive: true },
  });
  const area = await prisma.area.upsert({
    where: { cityId_code: { cityId: city.id, code: "classified_demo_center" } },
    update: { title: "مرکز شهر", isActive: true },
    create: {
      cityId: city.id,
      code: "classified_demo_center",
      title: "مرکز شهر",
      displayOrder: 10,
      isActive: true,
    },
  });
  const owner = await prisma.appUser.upsert({
    where: { phone: "+992900009900" },
    update: { firstName: "کاربر", lastName: "آگهی", isActive: true },
    create: {
      phone: "+992900009900",
      countryCode: "TJ",
      phoneCode: "+992",
      firstName: "کاربر",
      lastName: "آگهی",
      isActive: true,
    },
  });
  return { country, city, area, owner };
}

async function seedAds(categoryByCode, context) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  for (let index = 0; index < 30; index += 1) {
    const template = adTemplates[index % adTemplates.length];
    const sequence = index + 1;
    const publicCode = `DEMO${String(sequence).padStart(8, "0")}`;
    const publishedAt = new Date(now.getTime() - index * 20 * 60 * 1000);
    const category = categoryByCode.get(template.category);
    const title = index < adTemplates.length ? template.title : `${template.title} - ${Math.floor(index / adTemplates.length) + 1}`;
    const data = {
      categoryId: category.id,
      ownerType: "APP_USER",
      appUserId: context.owner.id,
      businessId: null,
      countryId: context.country.id,
      cityId: context.city.id,
      areaId: context.area.id,
      title,
      description: template.description,
      priceType: template.priceType,
      price: template.price,
      currency: "TJS",
      contactName: "کاربر آگهی",
      contactPhone: "+992 90 000 99 00",
      allowPhone: true,
      allowChat: false,
      status: "PUBLISHED",
      submittedAt: publishedAt,
      reviewedAt: publishedAt,
      publishedAt,
      expiresAt,
      deletedAt: null,
      viewCount: sequence * 3,
      favoriteCount: sequence % 7,
      version: 1,
    };
    const ad = await prisma.classifiedAd.upsert({
      where: { publicCode },
      update: data,
      create: { publicCode, ...data },
    });
    await prisma.classifiedAdImage.deleteMany({ where: { adId: ad.id } });
    await prisma.classifiedAdImage.create({
      data: {
        adId: ad.id,
        imageUrl: template.image,
        thumbnailUrl: template.image,
        displayOrder: 10,
        isCover: true,
      },
    });
  }
}

async function main() {
  const categoryByCode = await seedCategories();
  const context = await seedLocationAndOwner();
  await seedAds(categoryByCode, context);
  console.log("Classified demo seed complete: 5 root categories, 10 child categories and 30 published ads.");
}

main()
  .catch((error) => {
    console.error("Classified demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
