const prisma = require('../src/prisma');

const businesses = {
  mahestan: {
    title: 'رستوران مهستان شاندیز',
    summary: 'رستوران ایرانی لوکس با فضای خانوادگی',
    description: 'مهستان شاندیز با منوی ایرانی، کباب‌های ممتاز، سالن پذیرایی شیک و سرویس حرفه‌ای برای تست کامل پنل آماده شده است.',
    address: 'تهران، تجریش، خیابان شهرداری',
  },
  'narenj-cafe': {
    title: 'کافه رستوران نارنج',
    summary: 'کافه مدرن با غذاهای سبک و نوشیدنی‌های خاص',
    description: 'نارنج برای تست کافه، منوی نوشیدنی، اسلایدشو، گالری و خدمات قابل سفارش آماده شده است.',
    address: 'تهران، خیابان ولیعصر، بالاتر از پارک ساعی',
  },
  'luna-beauty': {
    title: 'سالن زیبایی لونا',
    summary: 'سالن تخصصی رنگ مو، ناخن و مراقبت پوست',
    description: 'لونا یک سالن زیبایی کامل برای تست رزرو، خدمات، اعضا، گالری و ویژگی‌های اختصاصی است.',
    address: 'تهران، سعادت‌آباد، میدان کاج',
  },
  'ruby-nails': {
    title: 'استودیو ناخن روبی',
    summary: 'خدمات تخصصی ناخن و طراحی لاک',
    description: 'روبی برای تست خدمات زیبایی، زمان‌بندی، قیمت‌گذاری و پیش‌نمایش موبایلی آماده شده است.',
    address: 'تهران، نیاوران، خیابان باهنر',
  },
  'darband-garden': {
    title: 'باغ گردشگری دربند',
    summary: 'فضای گردشگری خانوادگی در شمال تهران',
    description: 'باغ دربند برای تست مکان گردشگری، گالری، اسلایدشو و امکانات بازدید تعریف شده است.',
    address: 'تهران، دربند، مسیر کوهستانی',
  },
  'atlas-museum': {
    title: 'موزه اطلس',
    summary: 'موزه شهری با تورهای راهنما',
    description: 'موزه اطلس برای تست مکان فرهنگی، ساعات کاری، خدمات راهنما و پیش‌نمایش اپلیکیشن ساخته شده است.',
    address: 'تهران، ولیعصر، نزدیک میدان ولیعصر',
  },
};

const categories = [
  { slug: 'mahestan', en: 'Main dishes', fa: 'غذاهای اصلی' },
  { slug: 'narenj-cafe', en: 'Cafe menu', fa: 'کافه و غذا' },
  { slug: 'luna-beauty', en: 'Beauty services', fa: 'خدمات زیبایی' },
  { slug: 'ruby-nails', en: 'Nail services', fa: 'خدمات ناخن' },
  { slug: 'darband-garden', en: 'Visits and tours', fa: 'بازدید و تور' },
  { slug: 'atlas-museum', en: 'Tickets and tours', fa: 'بلیط و تور' },
];

const offerings = [
  {
    slug: 'mahestan',
    en: 'Soltani Kebab',
    fa: 'چلوکباب سلطانی',
    shortDescription: 'کباب برگ و کوبیده با برنج ایرانی',
    description: 'چلوکباب سلطانی با گوشت تازه، برنج ایرانی، کره و دورچین کامل سرو می‌شود.',
  },
  {
    slug: 'mahestan',
    en: 'Pepperoni Pizza',
    fa: 'پیتزا پپرونی',
    shortDescription: 'پیتزای تند با پنیر فراوان',
    description: 'پیتزا پپرونی با خمیر تازه، سس مخصوص و پنیر کش‌دار آماده می‌شود.',
  },
  {
    slug: 'narenj-cafe',
    en: 'Caramel Latte',
    fa: 'لاته کارامل',
    shortDescription: 'لاته گرم با کارامل دست‌ساز',
    description: 'لاته کارامل با اسپرسوی تازه و شیر بخار داده شده سرو می‌شود.',
  },
  {
    slug: 'narenj-cafe',
    en: 'Narenj Burger',
    fa: 'برگر نارنج',
    shortDescription: 'برگر گوشت با سس اختصاصی نارنج',
    description: 'برگر مخصوص نارنج همراه سیب‌زمینی و سس اختصاصی ارائه می‌شود.',
  },
  {
    slug: 'luna-beauty',
    en: 'Hair Color and Highlights',
    fa: 'رنگ و لایت مو',
    shortDescription: 'رنگ تخصصی با مشاوره رنگ‌شناسی',
    description: 'خدمات رنگ و لایت با مواد حرفه‌ای و مشاوره قبل از اجرا انجام می‌شود.',
  },
  {
    slug: 'luna-beauty',
    en: 'Facial Cleansing',
    fa: 'پاکسازی پوست',
    shortDescription: 'پاکسازی عمیق و آبرسانی پوست',
    description: 'پاکسازی پوست شامل بخور، تخلیه، ماسک و آبرسانی است.',
  },
  {
    slug: 'ruby-nails',
    en: 'Gel Polish',
    fa: 'ژلیش ناخن',
    shortDescription: 'ژلیش ماندگار با طراحی ساده',
    description: 'ژلیش ناخن با رنگ‌بندی متنوع و طراحی ظریف انجام می‌شود.',
  },
  {
    slug: 'ruby-nails',
    en: 'Classic Nail Extension',
    fa: 'کاشت ناخن کلاسیک',
    shortDescription: 'کاشت تمیز و طبیعی ناخن',
    description: 'کاشت ناخن کلاسیک با فرم‌دهی دقیق و مواد باکیفیت انجام می‌شود.',
  },
  {
    slug: 'darband-garden',
    en: 'Darband Walking Tour',
    fa: 'تور پیاده‌روی دربند',
    shortDescription: 'بازدید گروهی همراه راهنما',
    description: 'تور پیاده‌روی دربند شامل مسیرگردی، معرفی نقاط دیدنی و توقف عکاسی است.',
  },
  {
    slug: 'atlas-museum',
    en: 'Museum Entry Ticket',
    fa: 'بلیط بازدید موزه',
    shortDescription: 'بلیط ورودی بازدید عمومی',
    description: 'بلیط بازدید عمومی موزه اطلس برای تست خدمات مکان گردشگری ثبت شده است.',
  },
];

const areas = [
  { code: 'tajrish', fa: 'تجریش' },
  { code: 'valiasr', fa: 'ولیعصر' },
  { code: 'saadatabad', fa: 'سعادت‌آباد' },
  { code: 'niavaran', fa: 'نیاوران' },
];

const optionTranslations = {
  'Extra cheese': 'پنیر اضافه',
  'Extra sauce': 'سس اضافه',
  'Extra mushroom': 'قارچ اضافه',
  'Special sauce': 'سس مخصوص',
  Options: 'افزودنی‌ها',
};

async function main() {
  for (const [slug, data] of Object.entries(businesses)) {
    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) continue;
    await prisma.businessTranslation.upsert({
      where: { businessId_lang: { businessId: business.id, lang: 'fa' } },
      update: { ...data, isActive: true },
      create: { businessId: business.id, lang: 'fa', ...data, isActive: true },
    });
    await prisma.businessGallery.updateMany({ where: { businessId: business.id }, data: { alt: data.title } });
  }

  for (const item of categories) {
    const business = await prisma.business.findUnique({ where: { slug: item.slug } });
    if (!business) continue;
    const category = await prisma.businessOfferingCategory.findFirst({ where: { businessId: business.id, title: item.en } });
    if (!category) continue;
    await prisma.businessOfferingCategoryTranslation.upsert({
      where: { categoryId_lang: { categoryId: category.id, lang: 'fa' } },
      update: { title: item.fa, isActive: true },
      create: { categoryId: category.id, lang: 'fa', title: item.fa, isActive: true },
    });
  }

  for (const item of offerings) {
    const business = await prisma.business.findUnique({ where: { slug: item.slug } });
    if (!business) continue;
    const offering = await prisma.businessOffering.findFirst({ where: { businessId: business.id, title: item.en } });
    if (!offering) continue;
    await prisma.businessOfferingTranslation.upsert({
      where: { offeringId_lang: { offeringId: offering.id, lang: 'fa' } },
      update: { title: item.fa, shortDescription: item.shortDescription, description: item.description, isActive: true },
      create: { offeringId: offering.id, lang: 'fa', title: item.fa, shortDescription: item.shortDescription, description: item.description, isActive: true },
    });
  }

  for (const areaData of areas) {
    const area = await prisma.area.findFirst({ where: { code: areaData.code } });
    if (!area) continue;
    await prisma.areaTranslation.upsert({
      where: { areaId_lang: { areaId: area.id, lang: 'fa' } },
      update: { title: areaData.fa, isActive: true },
      create: { areaId: area.id, lang: 'fa', title: areaData.fa, isActive: true },
    });
  }

  for (const [en, fa] of Object.entries(optionTranslations)) {
    await prisma.businessOfferingOptionTranslation.updateMany({ where: { lang: 'fa', option: { title: en } }, data: { title: fa, isActive: true } });
    await prisma.businessOfferingOptionGroupTranslation.updateMany({ where: { lang: 'fa', group: { title: en } }, data: { title: fa, isActive: true } });
  }

  const samples = await prisma.business.findMany({
    where: { slug: { in: Object.keys(businesses) } },
    include: {
      translations: { where: { lang: 'fa' } },
      offerings: { include: { translations: { where: { lang: 'fa' } } }, orderBy: { displayOrder: 'asc' } },
    },
    orderBy: { displayOrder: 'asc' },
  });
  console.log(JSON.stringify(samples.map((business) => ({
    slug: business.slug,
    title: business.translations[0]?.title,
    offerings: business.offerings.map((offering) => offering.translations[0]?.title),
  })), null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
