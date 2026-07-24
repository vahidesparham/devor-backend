const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();
const languages = [
  { code: "fa", name: "Persian", nativeName: "فارسی", direction: "RTL", isDefault: true },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", direction: "LTR", isDefault: false },
  { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: false },
];

const serviceTypes = [
  {
    code: "food-and-cafe",
    color: "#E4573D",
    image: "/uploads/slideshows/slide_2-lsiucgmc.webp",
    order: 10,
    title: { fa: "رستوران و کافه", tg: "Тарабхона ва қаҳвахона", en: "Food & Cafe" },
    children: [
      ["family-restaurant", { fa: "رستوران خانوادگی", tg: "Тарабхонаи оилавӣ", en: "Family Restaurant" }],
      ["coffee-shop", { fa: "کافی‌شاپ", tg: "Қаҳвахона", en: "Coffee Shop" }],
    ],
  },
  {
    code: "beauty-and-wellness",
    color: "#B05279",
    image: "/uploads/banners/chatgpt-image-jun-11-2026-12_41_47-pm-1-emgofdis.webp",
    order: 20,
    title: { fa: "زیبایی و سلامت", tg: "Зебоӣ ва саломатӣ", en: "Beauty & Wellness" },
    children: [
      ["beauty-studio", { fa: "سالن زیبایی", tg: "Салони зебоӣ", en: "Beauty Studio" }],
      ["wellness-spa", { fa: "اسپا و ماساژ", tg: "Спа ва масҳ", en: "Wellness Spa" }],
    ],
  },
  {
    code: "sport-and-fitness",
    color: "#148A78",
    image: "/uploads/banners/bg2-glvjymm7.webp",
    order: 30,
    title: { fa: "ورزش و تناسب اندام", tg: "Варзиш ва фитнес", en: "Sport & Fitness" },
    children: [
      ["fitness-club", { fa: "باشگاه بدنسازی", tg: "Клуби фитнес", en: "Fitness Club" }],
      ["yoga-studio", { fa: "استودیو یوگا", tg: "Студияи йога", en: "Yoga Studio" }],
    ],
  },
];

const businesses = [
  {
    slug: "cafe-rudaki",
    serviceType: "coffee-shop",
    area: "rudaki",
    order: 10,
    level: "MEDIUM",
    image: "/uploads/business-covers/mahestan-cover-2eor1xv6.webp",
    gallery: [
      "/uploads/business-gallery/mahestan-cover-dmnvrvl4.webp",
      "/uploads/slideshows/20250322_131942-am3rapku.webp",
    ],
    title: { fa: "کافه رودکی", tg: "Қаҳвахонаи Рӯдакӣ", en: "Cafe Rudaki" },
    summary: {
      fa: "قهوه تازه و صبحانه در قلب دوشنبه",
      tg: "Қаҳваи тоза ва субҳона дар маркази Душанбе",
      en: "Fresh coffee and breakfast in central Dushanbe",
    },
    address: { fa: "خیابان رودکی، نزدیک پارک مرکزی", tg: "Хиёбони Рӯдакӣ, назди боғи марказӣ", en: "Rudaki Avenue, near Central Park" },
    offerings: [
      ["کاپوچینو ویژه", "Капучинои махсус", "Signature Cappuccino", 28],
      ["صبحانه رودکی", "Субҳонаи Рӯдакӣ", "Rudaki Breakfast", 54],
    ],
  },
  {
    slug: "somon-family-restaurant",
    serviceType: "family-restaurant",
    area: "somoni",
    order: 20,
    level: "HIGH",
    image: "/uploads/slideshows/slide_2-lsiucgmc.webp",
    gallery: [
      "/uploads/slideshows/slide_2-qhunk0ue.webp",
      "/uploads/slideshows/20250322_131942-cz6acwcf.webp",
    ],
    title: { fa: "رستوران خانواده سامانی", tg: "Тарабхонаи оилавии Сомонӣ", en: "Somoni Family Restaurant" },
    summary: {
      fa: "غذاهای تاجیکی اصیل در محیطی آرام و خانوادگی",
      tg: "Таомҳои миллии тоҷикӣ дар муҳити орому оилавӣ",
      en: "Traditional Tajik cuisine in a calm family setting",
    },
    address: { fa: "ناحیه اسماعیل سامانی، خیابان بهار", tg: "Ноҳияи Исмоили Сомонӣ, кӯчаи Баҳор", en: "Ismoili Somoni district, Bahor Street" },
    offerings: [
      ["اوش مخصوص سامانی", "Оши махсуси Сомонӣ", "Somoni Signature Osh", 75],
      ["قابلی تاجیکی", "Қабилии тоҷикӣ", "Tajik Qabili", 82],
    ],
  },
  {
    slug: "zebo-beauty-studio",
    serviceType: "beauty-studio",
    area: "rudaki",
    order: 30,
    level: "MEDIUM",
    image: "/uploads/banners/chatgpt-image-jun-11-2026-12_41_47-pm-1-emgofdis.webp",
    gallery: [
      "/uploads/banners/chatgpt-image-jun-11-2026-12_41_47-pm-2-tbw151vm.webp",
      "/uploads/banners/chatgpt-image-jun-11-2026-12_41_48-pm-3-ut7hmrbz.webp",
    ],
    title: { fa: "استودیو زیبایی زیبا", tg: "Студияи зебоии Зебо", en: "Zebo Beauty Studio" },
    summary: {
      fa: "خدمات تخصصی مو، ناخن و آرایش با رزرو قبلی",
      tg: "Хидматҳои касбии мӯй, нохун ва ороиш бо фармоиши пешакӣ",
      en: "Professional hair, nail and makeup services by appointment",
    },
    address: { fa: "خیابان رودکی، مرکز تجاری مهرگان", tg: "Хиёбони Рӯдакӣ, маркази савдои Меҳргон", en: "Rudaki Avenue, Mehrgon Center" },
    offerings: [
      ["کوتاهی و استایل مو", "Тарош ва ороиши мӯй", "Haircut & Styling", 95],
      ["مانیکور حرفه‌ای", "Маникюри касбӣ", "Professional Manicure", 70],
    ],
  },
  {
    slug: "pamir-wellness-spa",
    serviceType: "wellness-spa",
    area: "somoni",
    order: 40,
    level: "HIGH",
    image: "/uploads/slideshows/slide_3-tc83qcs5.webp",
    gallery: [
      "/uploads/banners/chatgpt-image-jun-11-2026-12_41_48-pm-3-ut7hmrbz.webp",
      "/uploads/banners/chatgpt-image-jun-11-2026-12_41_47-pm-2-tbw151vm.webp",
    ],
    title: { fa: "اسپا و سلامت پامیر", tg: "Спа ва саломатии Помир", en: "Pamir Wellness Spa" },
    summary: {
      fa: "ماساژ درمانی و خدمات آرامش در فضای خصوصی",
      tg: "Масҳи табобатӣ ва истироҳат дар фазои хусусӣ",
      en: "Therapeutic massage and relaxation in a private setting",
    },
    address: { fa: "ناحیه سامانی، بلوار استقلال", tg: "Ноҳияи Сомонӣ, хиёбони Истиқлол", en: "Somoni district, Istiqlol Boulevard" },
    offerings: [
      ["ماساژ آرامش‌بخش", "Масҳи оромбахш", "Relaxation Massage", 180],
      ["پکیج اسپا دو نفره", "Бастаи спа барои ду нафар", "Couples Spa Package", 340],
    ],
  },
  {
    slug: "atlas-fitness-club",
    serviceType: "fitness-club",
    area: "sino",
    order: 50,
    level: "MEDIUM",
    image: "/uploads/banners/bg2-glvjymm7.webp",
    gallery: [
      "/uploads/banners/bg2-job2rcc0.webp",
      "/uploads/banners/bg2-glvjymm7.webp",
    ],
    title: { fa: "باشگاه فیتنس اطلس", tg: "Клуби фитнеси Атлас", en: "Atlas Fitness Club" },
    summary: {
      fa: "تجهیزات کامل بدنسازی و مربی خصوصی",
      tg: "Таҷҳизоти мукаммали фитнес ва мураббии шахсӣ",
      en: "Complete fitness equipment and personal coaching",
    },
    address: { fa: "ناحیه سینا، خیابان ورزش", tg: "Ноҳияи Сино, кӯчаи Варзиш", en: "Sino district, Varzish Street" },
    offerings: [
      ["عضویت یک‌ماهه", "Узвияти якмоҳа", "One-month Membership", 260],
      ["جلسه مربی خصوصی", "Машғулият бо мураббии шахсӣ", "Personal Training Session", 90],
    ],
  },
  {
    slug: "dushanbe-yoga-house",
    serviceType: "yoga-studio",
    area: "rudaki",
    order: 60,
    level: "LOW",
    image: "/uploads/banners/bg2-job2rcc0.webp",
    gallery: [
      "/uploads/banners/bg2-glvjymm7.webp",
      "/uploads/content-pages/chatgpt-image-jun-9-2026-10_09_10-pm-1kjpjb03.webp",
    ],
    title: { fa: "خانه یوگای دوشنبه", tg: "Хонаи йогаи Душанбе", en: "Dushanbe Yoga House" },
    summary: {
      fa: "کلاس‌های گروهی یوگا برای تمام سطوح",
      tg: "Дарсҳои гурӯҳии йога барои ҳама сатҳҳо",
      en: "Group yoga classes for every experience level",
    },
    address: { fa: "خیابان رودکی، کوچه گل‌ها", tg: "Хиёбони Рӯдакӣ, кӯчаи Гулҳо", en: "Rudaki Avenue, Gulho Lane" },
    offerings: [
      ["کلاس مقدماتی یوگا", "Дарси ибтидоии йога", "Beginner Yoga Class", 45],
      ["پکیج هشت جلسه‌ای", "Бастаи ҳашт машғулият", "Eight-class Package", 280],
    ],
  },
];

const areaTitles = {
  rudaki: { fa: "رودکی", tg: "Рӯдакӣ", en: "Rudaki" },
  somoni: { fa: "اسماعیل سامانی", tg: "Исмоили Сомонӣ", en: "Ismoili Somoni" },
  sino: { fa: "سینا", tg: "Сино", en: "Sino" },
};

async function upsertTranslations(model, uniqueKey, foreignKey, id, values) {
  for (const language of languages) {
    const lang = language.code;
    const data = { [foreignKey]: id, lang, ...values(lang), isActive: true };
    await model.upsert({
      where: { [uniqueKey]: { [foreignKey]: id, lang } },
      update: data,
      create: data,
    });
  }
}

async function seedLanguages() {
  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: { ...language, isActive: true },
      create: { ...language, isActive: true },
    });
  }
}

async function seedServiceTypes() {
  const byCode = new Map();
  for (const definition of serviceTypes) {
    const root = await prisma.serviceType.upsert({
      where: { code: definition.code },
      update: {
        title: definition.title.fa,
        image: definition.image,
        color: definition.color,
        displayOrder: definition.order,
        isActive: true,
      },
      create: {
        code: definition.code,
        title: definition.title.fa,
        image: definition.image,
        color: definition.color,
        displayOrder: definition.order,
        isActive: true,
      },
    });
    await upsertTranslations(
      prisma.serviceTypeTranslation,
      "serviceTypeId_lang",
      "serviceTypeId",
      root.id,
      (lang) => ({ title: definition.title[lang] }),
    );
    byCode.set(definition.code, root);

    for (let index = 0; index < definition.children.length; index += 1) {
      const [code, title] = definition.children[index];
      const child = await prisma.serviceType.upsert({
        where: { code },
        update: { parentId: root.id, title: title.fa, color: definition.color, displayOrder: (index + 1) * 10, isActive: true },
        create: { parentId: root.id, code, title: title.fa, color: definition.color, displayOrder: (index + 1) * 10, isActive: true },
      });
      await upsertTranslations(
        prisma.serviceTypeTranslation,
        "serviceTypeId_lang",
        "serviceTypeId",
        child.id,
        (lang) => ({ title: title[lang] }),
      );
      byCode.set(code, child);
    }
  }
  return byCode;
}

async function seedLocation() {
  const country = await prisma.country.upsert({
    where: { code: "TJ" },
    update: { title: "تاجیکستان", phoneCode: "+992", isActive: true },
    create: { code: "TJ", title: "تاجیکستان", phoneCode: "+992", displayOrder: 10, isActive: true },
  });
  const countryTitles = { fa: "تاجیکستان", tg: "Тоҷикистон", en: "Tajikistan" };
  await upsertTranslations(prisma.countryTranslation, "countryId_lang", "countryId", country.id, (lang) => ({ title: countryTitles[lang] }));

  const city = await prisma.city.upsert({
    where: { countryId_code: { countryId: country.id, code: "dushanbe" } },
    update: { title: "دوشنبه", latitude: 38.5598, longitude: 68.787, isActive: true },
    create: { countryId: country.id, code: "dushanbe", title: "دوشنبه", latitude: 38.5598, longitude: 68.787, displayOrder: 10, isActive: true },
  });
  const cityTitles = { fa: "دوشنبه", tg: "Душанбе", en: "Dushanbe" };
  await upsertTranslations(prisma.cityTranslation, "cityId_lang", "cityId", city.id, (lang) => ({ title: cityTitles[lang] }));

  const areas = new Map();
  let displayOrder = 10;
  for (const [code, title] of Object.entries(areaTitles)) {
    const area = await prisma.area.upsert({
      where: { cityId_code: { cityId: city.id, code } },
      update: { title: title.fa, displayOrder, isActive: true },
      create: { cityId: city.id, code, title: title.fa, displayOrder, isActive: true },
    });
    await upsertTranslations(prisma.areaTranslation, "areaId_lang", "areaId", area.id, (lang) => ({ title: title[lang] }));
    areas.set(code, area);
    displayOrder += 10;
  }
  return { country, city, areas };
}

async function seedReviewUsers() {
  return Promise.all([
    prisma.appUser.upsert({
      where: { phone: "+992900001101" },
      update: { firstName: "مریم", lastName: "رحمان", isActive: true },
      create: { phone: "+992900001101", countryCode: "TJ", phoneCode: "+992", firstName: "مریم", lastName: "رحمان", isActive: true },
    }),
    prisma.appUser.upsert({
      where: { phone: "+992900001102" },
      update: { firstName: "فرهاد", lastName: "نظری", isActive: true },
      create: { phone: "+992900001102", countryCode: "TJ", phoneCode: "+992", firstName: "فرهاد", lastName: "نظری", isActive: true },
    }),
  ]);
}

async function seedBusinessDetails(business, definition, reviewUsers) {
  await prisma.businessReview.deleteMany({ where: { businessId: business.id, appUserId: { in: reviewUsers.map((user) => user.id) } } });
  await prisma.businessOffering.deleteMany({ where: { businessId: business.id } });
  await prisma.businessOfferingCategory.deleteMany({ where: { businessId: business.id } });
  await prisma.businessContactLink.deleteMany({ where: { businessId: business.id } });
  await prisma.businessWorkingHour.deleteMany({ where: { businessId: business.id } });
  await prisma.businessGallery.deleteMany({ where: { businessId: business.id } });
  await prisma.businessSlideshow.deleteMany({ where: { businessId: business.id } });

  await prisma.businessContactLink.createMany({
    data: [
      { businessId: business.id, type: "PHONE", label: "تماس", value: "+992 90 700 20 30", displayOrder: 10, isPrimary: true, isActive: true },
      { businessId: business.id, type: "INSTAGRAM", label: "Instagram", value: `@${definition.slug.replace(/-/g, "_")}`, url: `https://instagram.com/${definition.slug.replace(/-/g, ".")}`, displayOrder: 20, isActive: true },
      { businessId: business.id, type: "MAP", label: "مسیریابی", url: `https://maps.google.com/?q=${business.latitude},${business.longitude}`, displayOrder: 30, isActive: true },
    ],
  });

  const days = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  await prisma.businessWorkingHour.createMany({
    data: days.map((dayOfWeek, index) => ({
      businessId: business.id,
      dayOfWeek,
      opensAt: dayOfWeek === "FRIDAY" ? null : "09:00",
      closesAt: dayOfWeek === "FRIDAY" ? null : "22:00",
      isClosed: dayOfWeek === "FRIDAY",
      note: dayOfWeek === "FRIDAY" ? "تعطیل" : null,
      displayOrder: (index + 1) * 10,
    })),
  });

  const media = [definition.image, ...definition.gallery];
  await prisma.businessSlideshow.createMany({
    data: media.map((image, index) => ({ businessId: business.id, image, displayOrder: (index + 1) * 10 })),
  });
  await prisma.businessGallery.createMany({
    data: definition.gallery.map((image, index) => ({ businessId: business.id, image, alt: definition.title.fa, displayOrder: (index + 1) * 10 })),
  });

  const category = await prisma.businessOfferingCategory.create({
    data: { businessId: business.id, title: "خدمات محبوب", displayOrder: 10, isActive: true },
  });
  const categoryTitles = { fa: "خدمات محبوب", tg: "Хидматҳои маъмул", en: "Popular Services" };
  await upsertTranslations(prisma.businessOfferingCategoryTranslation, "categoryId_lang", "categoryId", category.id, (lang) => ({ title: categoryTitles[lang] }));

  for (let index = 0; index < definition.offerings.length; index += 1) {
    const [fa, tg, en, price] = definition.offerings[index];
    const offering = await prisma.businessOffering.create({
      data: {
        businessId: business.id,
        categoryId: category.id,
        title: fa,
        image: definition.gallery[index % definition.gallery.length],
        basePrice: price,
        preparationMinutes: 45,
        isFeatured: index === 0,
        isPopular: true,
        displayOrder: (index + 1) * 10,
        isActive: true,
      },
    });
    const titles = { fa, tg, en };
    await upsertTranslations(
      prisma.businessOfferingTranslation,
      "offeringId_lang",
      "offeringId",
      offering.id,
      (lang) => ({ title: titles[lang], shortDescription: definition.summary[lang] }),
    );
  }

  await prisma.businessReview.createMany({
    data: [
      { businessId: business.id, appUserId: reviewUsers[0].id, rating: "4.80", comment: "محیط بسیار تمیز و برخورد کارکنان عالی بود.", isActive: true },
      { businessId: business.id, appUserId: reviewUsers[1].id, rating: "4.50", comment: "کیفیت خدمات خوب بود و دوباره مراجعه می‌کنم.", isActive: true },
    ],
  });
}

async function seedBusinesses(serviceTypeByCode, location) {
  const reviewUsers = await seedReviewUsers();
  const now = new Date();
  for (const definition of businesses) {
    const serviceType = serviceTypeByCode.get(definition.serviceType);
    const area = location.areas.get(definition.area);
    const business = await prisma.business.upsert({
      where: { slug: definition.slug },
      update: {
        serviceTypeId: serviceType.id,
        countryId: location.country.id,
        cityId: location.city.id,
        areaId: area.id,
        logoImage: definition.image,
        coverImage: definition.image,
        verticalImage: definition.image,
        phone: "+992 90 700 20 30",
        email: `${definition.slug}@devor.demo`,
        latitude: 38.5598 + definition.order / 10000,
        longitude: 68.787 + definition.order / 10000,
        economicLevel: definition.level,
        operationMode: "SHOWCASE",
        publicationStatus: "PUBLISHED",
        submittedAt: now,
        reviewedAt: now,
        publishedAt: now,
        displayOrder: definition.order,
        isActive: true,
        isFeatured: true,
        showInLatest: true,
      },
      create: {
        slug: definition.slug,
        serviceTypeId: serviceType.id,
        countryId: location.country.id,
        cityId: location.city.id,
        areaId: area.id,
        logoImage: definition.image,
        coverImage: definition.image,
        verticalImage: definition.image,
        phone: "+992 90 700 20 30",
        email: `${definition.slug}@devor.demo`,
        latitude: 38.5598 + definition.order / 10000,
        longitude: 68.787 + definition.order / 10000,
        economicLevel: definition.level,
        operationMode: "SHOWCASE",
        publicationStatus: "PUBLISHED",
        submittedAt: now,
        reviewedAt: now,
        publishedAt: now,
        displayOrder: definition.order,
        isActive: true,
        isFeatured: true,
        showInLatest: true,
      },
    });
    await upsertTranslations(
      prisma.businessTranslation,
      "businessId_lang",
      "businessId",
      business.id,
      (lang) => ({
        title: definition.title[lang],
        summary: definition.summary[lang],
        description: `${definition.summary[lang]}. ${lang === "fa" ? "اطلاعات کامل، ساعات کاری، راه‌های تماس و خدمات این مجموعه در پروفایل قابل مشاهده است." : lang === "tg" ? "Маълумоти пурра, соатҳои корӣ, роҳҳои тамос ва хидматҳо дар профил дастрасанд." : "Full information, opening hours, contact channels and services are available on this profile."}`,
        address: definition.address[lang],
      }),
    );
    await seedBusinessDetails(business, definition, reviewUsers);
  }
}

async function main() {
  await seedLanguages();
  const serviceTypeByCode = await seedServiceTypes();
  const location = await seedLocation();
  await seedBusinesses(serviceTypeByCode, location);
  console.log(`Super-app demo seed complete: ${serviceTypes.length} categories and ${businesses.length} businesses.`);
}

main()
  .catch((error) => {
    console.error("Super-app demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
