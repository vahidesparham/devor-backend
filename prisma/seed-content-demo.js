const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

const LANGUAGES = [
  { code: "tj", name: "Tajik", nativeName: "Тоҷикӣ", direction: "LTR", isDefault: false },
  { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: false },
  { code: "fa", name: "Persian", nativeName: "فارسی", direction: "RTL", isDefault: true },
];

const FAQ_CATEGORIES = [
  {
    order: 10,
    title: {
      tj: "Ҳисоб ва воридшавӣ",
      en: "Account and Login",
      fa: "حساب کاربری و ورود",
    },
    faqs: [
      faq(10, {
        tj: ["Чӣ тавр ба барнома ворид шавам؟", "Барои воридшавӣ рақами мобилии худро интихоб карда, рамзи якдафъаинаро ворид кунед."],
        en: ["How do I log in to the app?", "Choose your country code, enter your mobile number, then confirm the one-time password sent to you."],
        fa: ["چطور وارد اپلیکیشن شوم؟", "کد کشور را انتخاب کنید، شماره موبایل را وارد کنید و سپس کد یکبار مصرف ارسال‌شده را تایید کنید."],
      }),
      faq(20, {
        tj: ["Агар рамзи OTP наояд чӣ кор кунам؟", "Пас аз анҷоми таймер тугмаи ارسال مجدد را بزنید و дуруст بودن شماره را بررسی کنید."],
        en: ["What should I do if the OTP does not arrive?", "Wait for the resend timer to finish, request a new code, and make sure your phone number is correct."],
        fa: ["اگر کد ورود ارسال نشد چه کار کنم؟", "بعد از پایان تایمر، ارسال مجدد را بزنید و مطمئن شوید شماره موبایل درست وارد شده است."],
      }),
    ],
  },
  {
    order: 20,
    title: {
      tj: "Кашфи ҷойҳо",
      en: "Discovering Places",
      fa: "کشف مکان‌ها",
    },
    faqs: [
      faq(10, {
        tj: ["Чӣ тавр ҷойҳои наздикро мебинам؟", "Агар иҷозати موقعیت را بدهید، барнома шаҳр ва کسب‌وکارهای نزدیک را بر اساس فاصله نمایش می‌دهد."],
        en: ["How can I see nearby places?", "Allow location access so the app can find your nearest city and show nearby businesses based on distance."],
        fa: ["چطور مکان‌های نزدیک را ببینم؟", "اجازه دسترسی به موقعیت را بدهید تا اپ شهر نزدیک و کسب‌وکارهای اطراف را بر اساس فاصله نمایش دهد."],
      }),
      faq(20, {
        tj: ["Оё метавонам шаҳрро дастӣ интихоб кунам؟", "Бале، аз болои саҳифаи асосӣ номи шаҳрро пахш кунед ва аз لیست شهرها انتخاب کنید."],
        en: ["Can I choose the city manually?", "Yes. Tap the city name in the main app bar and select another city from the list."],
        fa: ["آیا می‌توانم شهر را دستی انتخاب کنم؟", "بله. روی نام شهر در نوار بالای صفحه اصلی بزنید و شهر مورد نظر را از لیست انتخاب کنید."],
      }),
    ],
  },
  {
    order: 30,
    title: {
      tj: "Кسب‌وکارҳо ва محتوا",
      en: "Businesses and Content",
      fa: "کسب‌وکارها و محتوا",
    },
    faqs: [
      faq(10, {
        tj: ["Маълумоти کسب‌وکار از куҷо меояд؟", "Маълумот аз پنل مدیریت وارد می‌شود و شامل معرفی، تصاویر، ساعات کاری، خدمات و ویژگی‌هاست."],
        en: ["Where does business information come from?", "Business content is managed from the admin panel, including profile, images, working hours, services, and attributes."],
        fa: ["اطلاعات کسب‌وکار از کجا می‌آید؟", "محتوا از پنل مدیریت وارد می‌شود و شامل پروفایل، تصاویر، ساعات کاری، خدمات و ویژگی‌هاست."],
      }),
      faq(20, {
        tj: ["Оё ҳама کسب‌وکارها قابل سفارش هستند؟", "Не، баъзе کسب‌وکارҳо فقط برای معرفی و نمایش خدمات ثبت می‌شوند و سفارش‌گیری در فاز جدا فعال می‌شود."],
        en: ["Are all businesses orderable?", "No. Some businesses are informational only; ordering and booking can be enabled in later phases."],
        fa: ["آیا همه کسب‌وکارها قابل سفارش هستند؟", "خیر. بعضی کسب‌وکارها فقط برای معرفی هستند و سفارش یا رزرو در فازهای بعدی فعال می‌شود."],
      }),
    ],
  },
  {
    order: 40,
    title: {
      tj: "Дастгирӣ",
      en: "Support",
      fa: "پشتیبانی",
    },
    faqs: [
      faq(10, {
        tj: ["Чӣ тавр با پشتیبانی تماس بگیرم؟", "از صفحه پشتیبانی می‌توانید شماره تماس، ایمیل و شبکه‌های اجتماعی را ببینید."],
        en: ["How can I contact support?", "Open the support page to see phone, email, and social contact channels."],
        fa: ["چطور با پشتیبانی تماس بگیرم؟", "از صفحه پشتیبانی می‌توانید شماره تماس، ایمیل و شبکه‌های اجتماعی را مشاهده کنید."],
      }),
      faq(20, {
        tj: ["Чӣ тавр گزارش مشکل بدهم؟", "در نسخه فعلی از اطلاعات تماس پشتیبانی استفاده کنید؛ بخش گزارش مستقیم در فازهای بعدی اضافه می‌شود."],
        en: ["How do I report a problem?", "For now, use the support contact details. A direct issue-reporting flow can be added later."],
        fa: ["چطور مشکل را گزارش کنم؟", "فعلاً از راه‌های تماس پشتیبانی استفاده کنید؛ ثبت گزارش مستقیم در فازهای بعدی اضافه می‌شود."],
      }),
    ],
  },
];

const BLOG_POSTS = [
  blog(6, {
    tj: ["Роҳنمای انتخاب тарабхона дар Душанбе", "چند نکته برای پیدا کردن رستوران مناسب در شهر.", "Дар Душанбе انتخاب тарабхона فقط به منو محدود нест. موقعیت، فضای داخلی، سطح قیمت، امکانات و تجربه کاربران هم مهم هستند. بهتر است قبل از رفتن، ساعات کاری، تصاویر و دسته‌بندی غذا را بررسی کنید."],
    en: ["How to Choose a Restaurant in Dushanbe", "A practical guide for finding the right restaurant.", "Choosing a restaurant in Dushanbe is not only about the menu. Location, atmosphere, price level, amenities, and user reviews matter. Before visiting, check working hours, images, food categories, and available facilities."],
    fa: ["راهنمای انتخاب رستوران در دوشنبه", "چند نکته برای پیدا کردن رستوران مناسب.", "انتخاب رستوران در دوشنبه فقط به منو مربوط نیست. موقعیت، فضای رستوران، سطح قیمت، امکانات و نظر کاربران اهمیت دارد. بهتر است قبل از مراجعه، ساعت کاری، تصاویر، دسته‌بندی غذا و امکانات را بررسی کنید."],
  }),
  blog(5, {
    tj: ["Чаро گالری تصاویر مهم аст؟", "تصاویر خوب اعتماد کاربر را بیشتر می‌کند.", "Галереяи تصاویر به کاربر کمک می‌کند قبل از مراجعه حس واقعی‌تری از فضا، کیفیت و سبک کسب‌وکار داشته باشد. برای رستوران، سالن زیبایی، هتل و باشگاه، تصویر واضح یکی از مهم‌ترین عوامل تصمیم‌گیری است."],
    en: ["Why Image Galleries Matter", "Good images help users trust a business faster.", "A strong image gallery helps users understand the real atmosphere, quality, and style of a business before visiting. For restaurants, salons, hotels, and sport centers, clear photos can strongly influence the decision."],
    fa: ["چرا گالری تصاویر مهم است؟", "تصاویر خوب اعتماد کاربر را بیشتر می‌کند.", "گالری تصاویر کمک می‌کند کاربر قبل از مراجعه، حس واقعی‌تری از فضا، کیفیت و سبک کسب‌وکار داشته باشد. برای رستوران، سالن زیبایی، هتل و باشگاه، تصویر واضح یکی از مهم‌ترین عوامل تصمیم‌گیری است."],
  }),
  blog(7, {
    tj: ["ساعت کاری دقیق چه کمکی می‌کند؟", "اطلاعات درست باعث تجربه بهتر کاربر می‌شود.", "وقتی ساعات کاری دقیق ثبت شود، کاربر می‌داند چه زمانی مراجعه کند و احتمال تماس یا مراجعه بی‌نتیجه کمتر می‌شود. برای کسب‌وکارهایی مثل کافه، سالن زیبایی و باشگاه، این بخش بسیار کاربردی است."],
    en: ["Why Accurate Working Hours Help", "Clear hours improve the user experience.", "Accurate working hours help users plan their visit and reduce failed calls or unnecessary trips. This is especially important for cafes, beauty salons, gyms, hotels, and service businesses."],
    fa: ["اهمیت ساعت کاری دقیق", "اطلاعات درست باعث تجربه بهتر کاربر می‌شود.", "وقتی ساعات کاری دقیق ثبت شود، کاربر می‌داند چه زمانی مراجعه کند و احتمال تماس یا مراجعه بی‌نتیجه کمتر می‌شود. برای کافه، سالن زیبایی، باشگاه، هتل و کسب‌وکارهای خدماتی، این بخش بسیار کاربردی است."],
  }),
  blog(6, {
    tj: ["ویژگی‌های اختصاصی چه هستند؟", "فیلترهای دقیق‌تر برای پیدا کردن مکان مناسب.", "ویژگی‌های اختصاصی مثل امکانات، فضای رستوران، نوع اتاق یا نوع ورزش کمک می‌کند کاربر دقیق‌تر جستجو کند. این ویژگی‌ها باید برای هر نوع سرویس به‌صورت جداگانه تعریف شوند."],
    en: ["What Are Custom Attributes?", "Better filters for finding the right place.", "Custom attributes such as amenities, restaurant atmosphere, room types, or sport types help users search more accurately. They should be defined per service type so every business has relevant fields."],
    fa: ["ویژگی‌های اختصاصی چیست؟", "فیلترهای دقیق‌تر برای پیدا کردن مکان مناسب.", "ویژگی‌های اختصاصی مثل امکانات، فضای رستوران، نوع اتاق یا نوع ورزش کمک می‌کند کاربر دقیق‌تر جستجو کند. این ویژگی‌ها باید برای هر نوع سرویس به‌صورت جداگانه تعریف شوند."],
  }),
  blog(5, {
    tj: ["معرفی کسب‌وکار بدون سفارش‌گیری", "همه کسب‌وکارها نیاز به فروش آنلاین ندارند.", "بعضی کسب‌وکارها فقط می‌خواهند معرفی شوند، خدمات خود را نمایش دهند و راه‌های تماس را در اختیار کاربر بگذارند. این مدل برای شروع بسیار سبک‌تر است و قبل از ورود به سفارش یا رزرو، ارزش زیادی ایجاد می‌کند."],
    en: ["Business Profiles Without Ordering", "Not every business needs online orders first.", "Some businesses only need a strong profile, service presentation, images, and contact channels. This model is lighter to launch and creates value before adding ordering or booking flows."],
    fa: ["معرفی کسب‌وکار بدون سفارش‌گیری", "همه کسب‌وکارها نیاز به فروش آنلاین ندارند.", "بعضی کسب‌وکارها فقط می‌خواهند معرفی شوند، خدمات خود را نمایش دهند و راه‌های تماس را در اختیار کاربر بگذارند. این مدل برای شروع سبک‌تر است و قبل از ورود به سفارش یا رزرو، ارزش زیادی ایجاد می‌کند."],
  }),
  blog(8, {
    tj: ["چطور محتوای چندزبانه بهتر بنویسیم؟", "عنوان، خلاصه و متن باید برای هر زبان طبیعی باشد.", "در اپلیکیشن چندزبانه، ترجمه فقط جایگزینی کلمه‌ها نیست. هر زبان باید عنوان واضح، خلاصه کوتاه و متن روان خودش را داشته باشد. بهتر است متن‌ها کوتاه، دقیق و قابل اسکن باشند تا در موبایل خوب خوانده شوند."],
    en: ["Writing Better Multilingual Content", "Each language needs natural title, summary, and body copy.", "In a multilingual app, translation is not just word replacement. Each language should have a clear title, short summary, and readable body text. Keep content concise, precise, and easy to scan on mobile screens."],
    fa: ["چطور محتوای چندزبانه بهتر بنویسیم؟", "عنوان، خلاصه و متن باید برای هر زبان طبیعی باشد.", "در اپلیکیشن چندزبانه، ترجمه فقط جایگزینی کلمه‌ها نیست. هر زبان باید عنوان واضح، خلاصه کوتاه و متن روان خودش را داشته باشد. بهتر است متن‌ها کوتاه، دقیق و قابل اسکن باشند تا در موبایل خوب خوانده شوند."],
  }),
];

function faq(displayOrder, translations) {
  return { displayOrder, translations };
}

function blog(readingMinutes, translations) {
  return { readingMinutes, translations };
}

async function seedLanguages() {
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: {
        name: language.name,
        nativeName: language.nativeName,
        direction: language.direction,
        isActive: true,
        isDefault: language.isDefault,
      },
      create: { ...language, isActive: true },
    });
  }
}

async function findFaqCategoryByEnglishTitle(title) {
  const translation = await prisma.faqCategoryTranslation.findFirst({
    where: { lang: "en", title },
    select: { faqCategoryId: true },
  });
  return translation?.faqCategoryId || null;
}

async function findFaqByEnglishQuestion(question, categoryId) {
  const translation = await prisma.faqTranslation.findFirst({
    where: { lang: "en", question, faq: { categoryId } },
    select: { faqId: true },
  });
  return translation?.faqId || null;
}

async function findBlogByEnglishTitle(title) {
  const translation = await prisma.blogPostTranslation.findFirst({
    where: { lang: "en", title },
    select: { blogPostId: true },
  });
  return translation?.blogPostId || null;
}

async function upsertFaqCategory(item) {
  const existingId = await findFaqCategoryByEnglishTitle(item.title.en);
  const category = existingId
    ? await prisma.faqCategory.update({
        where: { id: existingId },
        data: { displayOrder: item.order, isActive: true },
      })
    : await prisma.faqCategory.create({
        data: { displayOrder: item.order, isActive: true },
      });

  for (const [lang, title] of Object.entries(item.title)) {
    await prisma.faqCategoryTranslation.upsert({
      where: { faqCategoryId_lang: { faqCategoryId: category.id, lang } },
      update: { title, isActive: true },
      create: { faqCategoryId: category.id, lang, title, isActive: true },
    });
  }

  return category;
}

async function upsertFaq(categoryId, item) {
  const existingId = await findFaqByEnglishQuestion(item.translations.en[0], categoryId);
  const faqRecord = existingId
    ? await prisma.faq.update({
        where: { id: existingId },
        data: { categoryId, displayOrder: item.displayOrder, isActive: true },
      })
    : await prisma.faq.create({
        data: { categoryId, displayOrder: item.displayOrder, isActive: true },
      });

  for (const [lang, values] of Object.entries(item.translations)) {
    await prisma.faqTranslation.upsert({
      where: { faqId_lang: { faqId: faqRecord.id, lang } },
      update: { question: values[0], answer: values[1], isActive: true },
      create: { faqId: faqRecord.id, lang, question: values[0], answer: values[1], isActive: true },
    });
  }
}

async function seedFaqs() {
  for (const item of FAQ_CATEGORIES) {
    const category = await upsertFaqCategory(item);
    for (const faqItem of item.faqs) {
      await upsertFaq(category.id, faqItem);
    }
  }
}

async function upsertBlogPost(item) {
  const existingId = await findBlogByEnglishTitle(item.translations.en[0]);
  const post = existingId
    ? await prisma.blogPost.update({
        where: { id: existingId },
        data: { readingMinutes: item.readingMinutes, isActive: true },
      })
    : await prisma.blogPost.create({
        data: { readingMinutes: item.readingMinutes, isActive: true },
      });

  for (const [lang, values] of Object.entries(item.translations)) {
    await prisma.blogPostTranslation.upsert({
      where: { blogPostId_lang: { blogPostId: post.id, lang } },
      update: {
        title: values[0],
        shortDescription: values[1],
        body: values[2],
        isActive: true,
      },
      create: {
        blogPostId: post.id,
        lang,
        title: values[0],
        shortDescription: values[1],
        body: values[2],
        isActive: true,
      },
    });
  }
}

async function seedBlogs() {
  for (const item of BLOG_POSTS) {
    await upsertBlogPost(item);
  }
}

async function main() {
  await seedLanguages();
  await seedFaqs();
  await seedBlogs();
  console.log("Content demo seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
