const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

const option = (code, title, config = {}) => ({ code, title, ...config });

const select = (code, title, options, config = {}) => ({
  code,
  title,
  type: "SELECT",
  options,
  ...config,
});

const text = (code, title, config = {}) => ({
  code,
  title,
  type: "TEXT",
  ...config,
});

const number = (code, title, config = {}) => ({
  code,
  title,
  type: "NUMBER",
  ...config,
});

const boolean = (code, title, config = {}) => ({
  code,
  title,
  type: "BOOLEAN",
  ...config,
});

const node = (code, slug, title, children = [], config = {}) => ({
  code,
  slug,
  title,
  children,
  attributes: [],
  ...config,
});

const CONDITION_OPTIONS = [
  option("new", "نو"),
  option("like-new", "در حد نو"),
  option("used", "کارکرده"),
  option("needs-repair", "نیازمند تعمیر"),
];

const BEDROOM_OPTIONS = [
  option("studio", "بدون اتاق"),
  option("one", "یک اتاق"),
  option("two", "دو اتاق"),
  option("three", "سه اتاق"),
  option("four-plus", "چهار اتاق و بیشتر"),
];

const DEED_OPTIONS = [
  option("official", "سند رسمی"),
  option("contract", "قولنامه یا قرارداد"),
  option("cooperative", "تعاونی"),
  option("other", "سایر"),
];

const EMPLOYMENT_OPTIONS = [
  option("full-time", "تمام‌وقت"),
  option("part-time", "پاره‌وقت"),
  option("contract", "قراردادی"),
  option("project", "پروژه‌ای"),
  option("internship", "کارآموزی"),
];

const EXPERIENCE_OPTIONS = [
  option("none", "بدون سابقه"),
  option("under-two", "کمتر از ۲ سال"),
  option("two-five", "۲ تا ۵ سال"),
  option("over-five", "بیشتر از ۵ سال"),
];

const taxonomy = [
  node(
    "classified-real-estate",
    "real-estate",
    "املاک",
    [
      node(
        "classified-residential-sale",
        "residential-sale",
        "فروش مسکونی",
        [
          node("classified-apartments", "apartments-for-sale", "آپارتمان", [], {
            attributes: [
              number("floor", "طبقه", { minValue: -5, maxValue: 100 }),
              boolean("elevator", "آسانسور", { showInFilters: true }),
            ],
          }),
          node("classified-house-villa-sale", "house-villa-for-sale", "خانه و ویلا", [], {
            attributes: [
              number("land_area", "مساحت زمین", {
                unit: "متر مربع",
                minValue: 1,
                maxValue: 10000000,
              }),
            ],
          }),
        ],
        {
          attributes: [
            select("bedrooms", "تعداد اتاق", BEDROOM_OPTIONS, {
              isRequired: true,
              showInFilters: true,
            }),
            number("construction_year", "سال ساخت", {
              minValue: 1800,
              maxValue: 2100,
              showInFilters: true,
            }),
            select("deed_type", "نوع سند", DEED_OPTIONS, { showInFilters: true }),
            boolean("parking", "پارکینگ", { showInFilters: true }),
          ],
        },
      ),
      node(
        "classified-residential-rent",
        "residential-rent",
        "اجاره مسکونی",
        [
          node("classified-apartment-rent", "apartment-for-rent", "آپارتمان", [], {
            attributes: [
              number("floor", "طبقه", { minValue: -5, maxValue: 100 }),
              boolean("elevator", "آسانسور", { showInFilters: true }),
            ],
          }),
          node("classified-house-villa-rent", "house-villa-for-rent", "خانه و ویلا", [], {
            attributes: [
              number("land_area", "مساحت زمین", {
                unit: "متر مربع",
                minValue: 1,
                maxValue: 10000000,
              }),
            ],
          }),
          node("classified-room-rent", "room-shared-rent", "اتاق و هم‌خانه"),
        ],
        {
          attributes: [
            select("bedrooms", "تعداد اتاق", BEDROOM_OPTIONS, {
              isRequired: true,
              showInFilters: true,
            }),
            number("deposit", "ودیعه", {
              unit: "سامانی",
              minValue: 0,
              maxValue: 1000000000,
              showInFilters: true,
            }),
            boolean("furnished", "مبله", { showInFilters: true }),
            boolean("parking", "پارکینگ", { showInFilters: true }),
          ],
        },
      ),
      node(
        "classified-commercial",
        "commercial-property",
        "اداری و تجاری",
        [
          node(
            "classified-commercial-sale",
            "commercial-sale",
            "فروش",
            [
              node("classified-office-sale", "office-for-sale", "دفتر کار"),
              node("classified-shop-sale", "shop-for-sale", "مغازه و واحد تجاری"),
              node("classified-warehouse-sale", "warehouse-for-sale", "انبار و کارگاه"),
            ],
            {
              attributes: [
                select("deed_type", "نوع سند", DEED_OPTIONS, { showInFilters: true }),
              ],
            },
          ),
          node(
            "classified-commercial-rent",
            "commercial-rent",
            "اجاره",
            [
              node("classified-office-rent", "office-for-rent", "دفتر کار"),
              node("classified-shop-rent", "shop-for-rent", "مغازه و واحد تجاری"),
              node("classified-warehouse-rent", "warehouse-for-rent", "انبار و کارگاه"),
            ],
            {
              attributes: [
                number("deposit", "ودیعه", {
                  unit: "سامانی",
                  minValue: 0,
                  maxValue: 1000000000,
                  showInFilters: true,
                }),
              ],
            },
          ),
        ],
      ),
      node(
        "classified-land",
        "land",
        "زمین و ملک کلنگی",
        [
          node("classified-residential-land", "residential-land", "زمین مسکونی"),
          node("classified-commercial-land", "commercial-land", "زمین تجاری"),
          node("classified-agricultural-land", "agricultural-land", "زمین کشاورزی"),
          node("classified-old-property", "old-property", "ملک کلنگی"),
        ],
        {
          attributes: [
            select("deed_type", "نوع سند", DEED_OPTIONS, {
              isRequired: true,
              showInFilters: true,
            }),
          ],
        },
      ),
    ],
    {
      color: "#138574",
      image: "/uploads/content-pages/about-eqkz1lie.webp",
      attributes: [
        number("property_area", "متراژ", {
          unit: "متر مربع",
          isRequired: true,
          showInFilters: true,
          minValue: 1,
          maxValue: 10000000,
        }),
      ],
    },
  ),
  node(
    "classified-vehicles",
    "vehicles",
    "وسایل نقلیه",
    [
      node(
        "classified-cars",
        "cars",
        "خودرو",
        [
          node("classified-passenger-cars", "passenger-cars", "سواری"),
          node("classified-suv-pickup", "suv-pickup", "شاسی‌بلند و پیکاپ"),
          node("classified-vans", "vans", "ون و مینی‌بوس"),
          node("classified-trucks", "trucks", "کامیون و خودرو سنگین"),
        ],
        {
          attributes: [
            select(
              "car_brand",
              "برند",
              [
                option("toyota", "تویوتا"),
                option("hyundai", "هیوندای"),
                option("mercedes-benz", "مرسدس بنز"),
                option("opel", "اوپل"),
                option("bmw", "بی‌ام‌و"),
                option("lexus", "لکسوس"),
                option("kia", "کیا"),
                option("lada", "لادا"),
                option("chery", "چری"),
                option("byd", "BYD"),
                option("other", "سایر"),
              ],
              { isRequired: true, showInFilters: true },
            ),
            select(
              "car_model",
              "مدل",
              [
                option("corolla", "کرولا", { parentOptionCode: "toyota" }),
                option("camry", "کمری", { parentOptionCode: "toyota" }),
                option("rav4", "راوفور", { parentOptionCode: "toyota" }),
                option("elantra", "النترا", { parentOptionCode: "hyundai" }),
                option("sonata", "سوناتا", { parentOptionCode: "hyundai" }),
                option("tucson", "توسان", { parentOptionCode: "hyundai" }),
                option("c-class", "کلاس C", { parentOptionCode: "mercedes-benz" }),
                option("e-class", "کلاس E", { parentOptionCode: "mercedes-benz" }),
                option("gle", "GLE", { parentOptionCode: "mercedes-benz" }),
                option("astra", "آسترا", { parentOptionCode: "opel" }),
                option("insignia", "اینسینیـا", { parentOptionCode: "opel" }),
                option("3-series", "سری 3", { parentOptionCode: "bmw" }),
                option("5-series", "سری 5", { parentOptionCode: "bmw" }),
                option("x5", "X5", { parentOptionCode: "bmw" }),
                option("rx", "RX", { parentOptionCode: "lexus" }),
                option("lx", "LX", { parentOptionCode: "lexus" }),
                option("rio", "ریو", { parentOptionCode: "kia" }),
                option("k5", "K5", { parentOptionCode: "kia" }),
                option("sportage", "اسپورتیج", { parentOptionCode: "kia" }),
                option("niva", "نیوا", { parentOptionCode: "lada" }),
                option("vesta", "وستا", { parentOptionCode: "lada" }),
                option("tiggo-7", "تیگو 7", { parentOptionCode: "chery" }),
                option("arrizo-6", "آریزو 6", { parentOptionCode: "chery" }),
                option("song-plus", "Song Plus", { parentOptionCode: "byd" }),
                option("han", "Han", { parentOptionCode: "byd" }),
                option("other-model", "سایر", { parentOptionCode: "other" }),
              ],
              {
                dependsOnCode: "car_brand",
                isRequired: true,
                showInFilters: true,
              },
            ),
            number("production_year", "سال تولید", {
              isRequired: true,
              showInFilters: true,
              minValue: 1950,
              maxValue: 2100,
            }),
            number("mileage", "کارکرد", {
              unit: "کیلومتر",
              showInFilters: true,
              minValue: 0,
              maxValue: 10000000,
            }),
            select(
              "gearbox",
              "گیربکس",
              [option("automatic", "اتوماتیک"), option("manual", "دستی")],
              { showInFilters: true },
            ),
            select(
              "fuel",
              "نوع سوخت",
              [
                option("gasoline", "بنزین"),
                option("diesel", "دیزل"),
                option("hybrid", "هیبرید"),
                option("electric", "برقی"),
                option("gas", "گاز"),
              ],
              { showInFilters: true },
            ),
          ],
        },
      ),
      node(
        "classified-motorcycles",
        "motorcycles",
        "موتورسیکلت",
        [
          node("classified-standard-motorcycles", "standard-motorcycles", "موتورسیکلت"),
          node("classified-scooters", "scooters", "اسکوتر و موتورسیکلت برقی"),
        ],
        {
          attributes: [
            text("brand", "برند", { isRequired: true, maxLength: 80 }),
            number("production_year", "سال تولید", {
              showInFilters: true,
              minValue: 1950,
              maxValue: 2100,
            }),
            number("mileage", "کارکرد", {
              unit: "کیلومتر",
              showInFilters: true,
              minValue: 0,
              maxValue: 1000000,
            }),
            number("engine_capacity", "حجم موتور", {
              unit: "سی‌سی",
              minValue: 20,
              maxValue: 3000,
            }),
          ],
        },
      ),
      node(
        "classified-vehicle-parts",
        "vehicle-parts",
        "قطعات و لوازم نقلیه",
        [
          node("classified-car-parts", "car-parts", "قطعات خودرو"),
          node("classified-motorcycle-parts", "motorcycle-parts", "قطعات موتورسیکلت"),
          node("classified-tires-rims", "tires-rims", "لاستیک و رینگ"),
        ],
      ),
    ],
    {
      color: "#3267A8",
      image: "/uploads/onboarding-pages/on_2-1lkdllt9.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
      ],
    },
  ),
  node(
    "classified-digital",
    "digital",
    "موبایل و دیجیتال",
    [
      node(
        "classified-mobile-tablet",
        "mobile-tablet",
        "موبایل و تبلت",
        [
          node("classified-mobile", "mobile-phones", "گوشی موبایل"),
          node("classified-tablets", "tablets", "تبلت"),
          node("classified-mobile-accessories", "mobile-accessories", "لوازم جانبی"),
        ],
        {
          attributes: [
            select(
              "storage",
              "حافظه داخلی",
              [
                option("32", "۳۲ گیگابایت"),
                option("64", "۶۴ گیگابایت"),
                option("128", "۱۲۸ گیگابایت"),
                option("256", "۲۵۶ گیگابایت"),
                option("512-plus", "۵۱۲ گیگابایت و بیشتر"),
              ],
              { showInFilters: true },
            ),
          ],
        },
      ),
      node(
        "classified-computers",
        "computers",
        "رایانه",
        [
          node("classified-laptop", "laptops", "لپ‌تاپ"),
          node("classified-desktop", "desktop-computers", "رایانه رومیزی"),
          node("classified-monitors", "monitors", "مانیتور"),
          node("classified-computer-parts", "computer-parts", "قطعات و لوازم جانبی"),
        ],
        {
          attributes: [
            select(
              "ram",
              "حافظه رم",
              [
                option("4", "۴ گیگابایت"),
                option("8", "۸ گیگابایت"),
                option("16", "۱۶ گیگابایت"),
                option("32", "۳۲ گیگابایت"),
                option("64-plus", "۶۴ گیگابایت و بیشتر"),
              ],
              { showInFilters: true },
            ),
            text("processor", "پردازنده", { maxLength: 100 }),
          ],
        },
      ),
      node(
        "classified-audio-video",
        "audio-video",
        "صوتی و تصویری",
        [
          node("classified-televisions", "televisions", "تلویزیون"),
          node("classified-cameras", "cameras", "دوربین"),
          node("classified-speakers", "speakers", "اسپیکر و سیستم صوتی"),
          node("classified-headphones", "headphones", "هدفون و هندزفری"),
        ],
      ),
      node(
        "classified-gaming",
        "gaming",
        "بازی و سرگرمی دیجیتال",
        [
          node("classified-game-consoles", "game-consoles", "کنسول بازی"),
          node("classified-games-accessories", "games-accessories", "بازی و لوازم جانبی"),
        ],
      ),
    ],
    {
      color: "#6C56A5",
      image: "/uploads/onboarding-pages/on_4-4djb91ro.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
        text("brand", "برند", { maxLength: 80 }),
        boolean("warranty", "گارانتی دارد", { showInFilters: true }),
      ],
    },
  ),
  node(
    "classified-home",
    "home-and-kitchen",
    "خانه و آشپزخانه",
    [
      node(
        "classified-furniture",
        "furniture",
        "مبلمان",
        [
          node("classified-sofas", "sofas", "مبل و راحتی"),
          node("classified-bedroom-furniture", "bedroom-furniture", "سرویس خواب"),
          node("classified-tables-chairs", "tables-chairs", "میز و صندلی"),
        ],
      ),
      node(
        "classified-appliances",
        "home-appliances",
        "لوازم خانگی",
        [
          node("classified-refrigerators", "refrigerators", "یخچال و فریزر"),
          node("classified-washers", "washers", "لباسشویی و ظرفشویی"),
          node("classified-cooking-appliances", "cooking-appliances", "اجاق و لوازم پخت‌وپز"),
          node("classified-small-appliances", "small-appliances", "لوازم برقی کوچک"),
        ],
        {
          attributes: [text("brand", "برند", { maxLength: 80 })],
        },
      ),
      node(
        "classified-home-decor",
        "home-decor",
        "دکوراسیون",
        [
          node("classified-carpets", "carpets", "فرش و گلیم"),
          node("classified-curtains", "curtains", "پرده"),
          node("classified-lighting", "lighting", "روشنایی و لوستر"),
        ],
      ),
    ],
    {
      color: "#B56C31",
      image: "/uploads/business-covers/mahestan-cover-2eor1xv6.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
      ],
    },
  ),
  node(
    "classified-personal",
    "personal",
    "وسایل شخصی",
    [
      node(
        "classified-clothing",
        "clothing",
        "پوشاک",
        [
          node("classified-womens-clothing", "womens-clothing", "پوشاک زنانه"),
          node("classified-mens-clothing", "mens-clothing", "پوشاک مردانه"),
          node("classified-kids-clothing", "kids-clothing", "پوشاک کودک"),
        ],
        {
          attributes: [
            select(
              "clothing_size",
              "سایز",
              [
                option("xs", "XS"),
                option("s", "S"),
                option("m", "M"),
                option("l", "L"),
                option("xl", "XL"),
                option("xxl-plus", "XXL و بزرگ‌تر"),
              ],
              { showInFilters: true },
            ),
          ],
        },
      ),
      node(
        "classified-shoes-bags",
        "shoes-bags",
        "کفش و کیف",
        [
          node("classified-shoes", "shoes", "کفش"),
          node("classified-bags", "bags", "کیف"),
        ],
      ),
      node(
        "classified-personal-accessories",
        "personal-accessories",
        "اکسسوری و زیبایی",
        [
          node("classified-watches-jewelry", "watches-jewelry", "ساعت و زیورآلات"),
          node("classified-beauty-tools", "beauty-tools", "لوازم آرایشی و زیبایی"),
        ],
      ),
    ],
    {
      color: "#B0445A",
      image: "/uploads/blog-posts/splash_bg-bhf5zht6.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
      ],
    },
  ),
  node(
    "classified-jobs",
    "jobs",
    "استخدام و کاریابی",
    [
      node(
        "classified-job-vacancies",
        "job-vacancies",
        "فرصت‌های شغلی",
        [
          node("classified-sales-jobs", "sales-jobs", "فروش و بازاریابی"),
          node("classified-office-jobs", "office-jobs", "اداری و مالی"),
          node("classified-tech-jobs", "technology-jobs", "فناوری و مهندسی"),
          node("classified-service-jobs", "service-jobs", "خدمات و پذیرایی"),
          node("classified-construction-jobs", "construction-jobs", "فنی و ساختمانی"),
          node("classified-driver-jobs", "driver-jobs", "راننده و حمل‌ونقل"),
          node("classified-other-jobs", "other-jobs", "سایر مشاغل"),
        ],
        {
          attributes: [
            select("employment_type", "نوع همکاری", EMPLOYMENT_OPTIONS, {
              isRequired: true,
              showInFilters: true,
            }),
            select("experience_level", "سابقه موردنیاز", EXPERIENCE_OPTIONS, {
              showInFilters: true,
            }),
            number("salary", "حقوق پیشنهادی", {
              unit: "سامانی",
              minValue: 0,
              maxValue: 10000000,
              showInFilters: true,
            }),
            boolean("remote_work", "امکان دورکاری", { showInFilters: true }),
            text("employer_name", "نام کارفرما", { maxLength: 120 }),
          ],
        },
      ),
      node("classified-job-seekers", "job-seekers", "جویای کار", [], {
        attributes: [
          text("specialty", "تخصص", { isRequired: true, minLength: 2, maxLength: 120 }),
          select("experience_level", "سابقه کاری", EXPERIENCE_OPTIONS, {
            showInFilters: true,
          }),
          select("employment_type", "نوع همکاری دلخواه", EMPLOYMENT_OPTIONS, {
            showInFilters: true,
          }),
        ],
      }),
    ],
    {
      color: "#2F6F73",
      image: "/uploads/slideshows/picked-9bi119o2.webp",
    },
  ),
  node(
    "classified-services",
    "services",
    "خدمات",
    [
      node(
        "classified-home-services",
        "home-services",
        "خدمات خانه",
        [
          node("classified-repair-services", "repair-services", "تعمیرات و نصب"),
          node("classified-cleaning-services", "cleaning-services", "نظافت"),
          node("classified-moving-services", "moving-services", "اسباب‌کشی و باربری"),
        ],
      ),
      node(
        "classified-vehicle-services",
        "vehicle-services",
        "خدمات خودرو",
        [
          node("classified-auto-repair", "auto-repair", "تعمیر و سرویس"),
          node("classified-vehicle-transport", "vehicle-transport", "حمل‌ونقل و اجاره خودرو"),
        ],
      ),
      node(
        "classified-education-services",
        "education-services",
        "آموزش",
        [
          node("classified-school-tutoring", "school-tutoring", "تدریس خصوصی"),
          node("classified-language-training", "language-training", "آموزش زبان"),
          node("classified-skill-training", "skill-training", "کامپیوتر و مهارت‌های تخصصی"),
        ],
      ),
      node(
        "classified-business-services",
        "business-services",
        "خدمات کسب‌وکار",
        [
          node("classified-design-marketing", "design-marketing", "طراحی و بازاریابی"),
          node("classified-accounting-legal", "accounting-legal", "حسابداری و امور حقوقی"),
          node("classified-it-services", "it-services", "خدمات فناوری اطلاعات"),
        ],
      ),
    ],
    {
      color: "#3E6C9A",
      image: "/uploads/content-pages/chatgpt-image-jun-9-2026-10_09_10-pm-1kjpjb03.webp",
      attributes: [
        select(
          "provider_type",
          "ارائه‌دهنده",
          [option("person", "شخص"), option("business", "کسب‌وکار")],
          { isRequired: true, showInFilters: true },
        ),
        select(
          "service_location",
          "شیوه ارائه",
          [
            option("customer-location", "در محل مشتری"),
            option("provider-location", "در محل ارائه‌دهنده"),
            option("remote", "آنلاین"),
          ],
          { showInFilters: true },
        ),
      ],
    },
  ),
  node(
    "classified-sport",
    "sport-and-leisure",
    "ورزش و سرگرمی",
    [
      node(
        "classified-sport-equipment",
        "sport-equipment",
        "لوازم ورزشی",
        [
          node("classified-fitness-equipment", "fitness-equipment", "بدنسازی و تناسب اندام"),
          node("classified-bicycles", "bicycles", "دوچرخه"),
          node("classified-team-sports", "team-sports", "ورزش‌های تیمی"),
          node("classified-outdoor-sports", "outdoor-sports", "کوهنوردی و طبیعت‌گردی"),
        ],
      ),
      node(
        "classified-hobbies",
        "hobbies",
        "سرگرمی و مجموعه‌داری",
        [
          node("classified-books", "books", "کتاب و مجله"),
          node("classified-musical-instruments", "musical-instruments", "ساز و تجهیزات موسیقی"),
          node("classified-collectibles", "collectibles", "کلکسیون و اشیای قدیمی"),
          node("classified-board-games", "board-games", "بازی فکری"),
        ],
      ),
    ],
    {
      color: "#8C5B3F",
      image: "/uploads/banners/bg2-glvjymm7.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
        text("brand", "برند", { maxLength: 80 }),
      ],
    },
  ),
  node(
    "classified-baby",
    "baby-and-child",
    "کودک و نوزاد",
    [
      node("classified-baby-clothing", "baby-clothing", "پوشاک کودک"),
      node("classified-strollers-seats", "strollers-seats", "کالسکه و صندلی کودک"),
      node("classified-toys", "toys", "اسباب‌بازی"),
      node("classified-child-furniture", "child-furniture", "لوازم اتاق کودک"),
    ],
    {
      color: "#C06B72",
      image: "/uploads/slideshows/2578e016501843d97c7fd39abe56915c-fuvyw3j3.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
        select(
          "age_group",
          "گروه سنی",
          [
            option("newborn", "نوزاد"),
            option("one-three", "۱ تا ۳ سال"),
            option("four-seven", "۴ تا ۷ سال"),
            option("eight-twelve", "۸ تا ۱۲ سال"),
            option("teen", "نوجوان"),
          ],
          { showInFilters: true },
        ),
      ],
    },
  ),
  node(
    "classified-industrial",
    "industrial-agriculture",
    "صنعتی و کشاورزی",
    [
      node(
        "classified-industrial-equipment",
        "industrial-equipment",
        "تجهیزات صنعتی",
        [
          node("classified-tools", "tools", "ابزارآلات"),
          node("classified-machinery", "machinery", "ماشین‌آلات صنعتی"),
          node("classified-shop-equipment", "shop-equipment", "تجهیزات فروشگاه و کارگاه"),
        ],
      ),
      node(
        "classified-agriculture",
        "agriculture",
        "کشاورزی",
        [
          node("classified-agricultural-machinery", "agricultural-machinery", "ماشین‌آلات کشاورزی"),
          node("classified-irrigation-equipment", "irrigation-equipment", "آبیاری و گلخانه"),
          node("classified-farming-supplies", "farming-supplies", "نهاده و لوازم کشاورزی"),
        ],
      ),
    ],
    {
      color: "#667044",
      image: "/uploads/business-gallery/mahestan-cover-dmnvrvl4.webp",
      attributes: [
        select("condition", "وضعیت", CONDITION_OPTIONS, {
          isRequired: true,
          showInFilters: true,
        }),
        text("brand", "برند یا سازنده", { maxLength: 100 }),
        number("production_year", "سال تولید", {
          minValue: 1900,
          maxValue: 2100,
          showInFilters: true,
        }),
      ],
    },
  ),
];

const LEGACY_AD_TARGETS = {
  "classified-cars": "classified-passenger-cars",
  "classified-motorcycles": "classified-standard-motorcycles",
  "classified-commercial": "classified-office-sale",
  "classified-furniture": "classified-sofas",
  "classified-appliances": "classified-refrigerators",
  "classified-sport-equipment": "classified-fitness-equipment",
  "classified-hobbies": "classified-books",
};

function validateTaxonomy() {
  const codes = new Set();
  const slugs = new Set();

  function visit(category, inheritedAttributeTypes = new Map(), depth = 0) {
    if (codes.has(category.code)) throw new Error(`Duplicate category code: ${category.code}`);
    if (slugs.has(category.slug)) throw new Error(`Duplicate category slug: ${category.slug}`);
    if (depth === 0 && !category.children.length) {
      throw new Error(`Root category must not be a leaf: ${category.code}`);
    }
    codes.add(category.code);
    slugs.add(category.slug);

    const attributeTypes = new Map(inheritedAttributeTypes);
    const localCodes = new Set();
    for (const attribute of category.attributes || []) {
      if (localCodes.has(attribute.code)) {
        throw new Error(`Duplicate attribute ${attribute.code} on ${category.code}`);
      }
      localCodes.add(attribute.code);
      const inheritedType = attributeTypes.get(attribute.code);
      if (inheritedType && inheritedType !== attribute.type) {
        throw new Error(`Conflicting inherited attribute ${attribute.code} on ${category.code}`);
      }
      attributeTypes.set(attribute.code, attribute.type);

      if (attribute.type === "SELECT" || attribute.type === "MULTI_SELECT") {
        const optionCodes = new Set((attribute.options || []).map((item) => item.code));
        if (!attribute.options?.length || optionCodes.size !== attribute.options.length) {
          throw new Error(`Invalid options for ${category.code}.${attribute.code}`);
        }
      }
    }

    for (const child of category.children) visit(child, attributeTypes, depth + 1);
  }

  for (const root of taxonomy) visit(root);
}

function attributeData(attribute, displayOrder, dependsOnAttributeId = null) {
  return {
    dependsOnAttributeId,
    title: attribute.title,
    type: attribute.type,
    unit: attribute.unit || null,
    placeholder: attribute.placeholder || null,
    isRequired: attribute.isRequired === true,
    showInFilters: attribute.showInFilters === true,
    displayOrder,
    isActive: true,
    minValue: attribute.minValue ?? null,
    maxValue: attribute.maxValue ?? null,
    minLength: attribute.minLength ?? null,
    maxLength: attribute.maxLength ?? null,
  };
}

async function upsertAttribute(categoryId, definition, displayOrder, availableAttributes) {
  const dependency = definition.dependsOnCode
    ? availableAttributes.get(definition.dependsOnCode)
    : null;
  if (definition.dependsOnCode && !dependency) {
    throw new Error(`Missing dependency ${definition.dependsOnCode} for ${definition.code}`);
  }
  const data = attributeData(definition, displayOrder, dependency?.id || null);
  const attribute = await prisma.classifiedAttribute.upsert({
    where: {
      categoryId_code: {
        categoryId,
        code: definition.code,
      },
    },
    update: data,
    create: {
      categoryId,
      code: definition.code,
      ...data,
    },
  });

  availableAttributes.set(definition.code, attribute);
  if (definition.type !== "SELECT" && definition.type !== "MULTI_SELECT") return attribute;

  const parentOptionsByCode = dependency
    ? new Map(
      (await prisma.classifiedAttributeOption.findMany({
        where: { attributeId: dependency.id },
        select: { id: true, code: true },
      })).map((item) => [item.code, item.id]),
    )
    : new Map();

  const activeCodes = [];
  for (let index = 0; index < definition.options.length; index += 1) {
    const item = definition.options[index];
    const parentOptionId = item.parentOptionCode
      ? parentOptionsByCode.get(item.parentOptionCode)
      : null;
    if (item.parentOptionCode && !parentOptionId) {
      throw new Error(`Missing parent option ${item.parentOptionCode} for ${definition.code}.${item.code}`);
    }
    activeCodes.push(item.code);
    await prisma.classifiedAttributeOption.upsert({
      where: {
        attributeId_code: {
          attributeId: attribute.id,
          code: item.code,
        },
      },
      update: {
        title: item.title,
        parentOptionId,
        displayOrder: (index + 1) * 10,
        isActive: true,
      },
      create: {
        attributeId: attribute.id,
        code: item.code,
        title: item.title,
        parentOptionId,
        displayOrder: (index + 1) * 10,
        isActive: true,
      },
    });
  }

  await prisma.classifiedAttributeOption.updateMany({
    where: {
      attributeId: attribute.id,
      code: { notIn: activeCodes },
    },
    data: { isActive: false },
  });
  return attribute;
}

async function upsertCategoryTree(definitions, context = {}) {
  const {
    parentId = null,
    inheritedColor = null,
    depth = 0,
    categoryByCode = new Map(),
    inheritedAttributes = new Map(),
    counters = { categories: 0, leaves: 0, attributes: 0, options: 0 },
  } = context;

  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const isLeaf = definition.children.length === 0;
    const color = definition.color || inheritedColor;
    const categoryData = {
      parentId,
      slug: definition.slug,
      title: definition.title,
      description: definition.description || null,
      image: definition.image || null,
      color,
      displayOrder: (index + 1) * 10,
      isActive: true,
      allowAds: isLeaf,
    };
    const category = await prisma.classifiedCategory.upsert({
      where: { code: definition.code },
      update: categoryData,
      create: {
        code: definition.code,
        postingFee: definition.postingFee ?? 0,
        ...categoryData,
      },
    });

    categoryByCode.set(definition.code, category);
    counters.categories += 1;
    if (isLeaf) counters.leaves += 1;

    const availableAttributes = new Map(inheritedAttributes);
    for (let attributeIndex = 0; attributeIndex < definition.attributes.length; attributeIndex += 1) {
      const attribute = definition.attributes[attributeIndex];
      await upsertAttribute(
        category.id,
        attribute,
        (depth + 1) * 1000 + (attributeIndex + 1) * 10,
        availableAttributes,
      );
      counters.attributes += 1;
      counters.options += attribute.options?.length || 0;
    }

    await upsertCategoryTree(definition.children, {
      parentId: category.id,
      inheritedColor: color,
      depth: depth + 1,
      categoryByCode,
      inheritedAttributes: availableAttributes,
      counters,
    });
  }

  return { categoryByCode, counters };
}

async function moveLegacyAdsToLeaves(categoryByCode) {
  let moved = 0;
  for (const [sourceCode, targetCode] of Object.entries(LEGACY_AD_TARGETS)) {
    const source = categoryByCode.get(sourceCode);
    const target = categoryByCode.get(targetCode);
    if (!source || !target) continue;
    const result = await prisma.classifiedAd.updateMany({
      where: { categoryId: source.id },
      data: { categoryId: target.id },
    });
    moved += result.count;
  }
  return moved;
}

async function verifyLeafPolicy(categoryByCode) {
  const categories = [...categoryByCode.values()];
  const parentIds = new Set(
    categories
      .map((category) => category.parentId)
      .filter((parentId) => parentId != null),
  );
  const invalid = categories.filter((category) => {
    const isLeaf = !parentIds.has(category.id);
    return category.allowAds !== isLeaf;
  });
  if (invalid.length) {
    throw new Error(`Leaf policy mismatch: ${invalid.map((item) => item.code).join(", ")}`);
  }
}

async function main() {
  validateTaxonomy();
  const { categoryByCode, counters } = await upsertCategoryTree(taxonomy);
  const movedAds = await moveLegacyAdsToLeaves(categoryByCode);
  await verifyLeafPolicy(categoryByCode);

  console.log(
    [
      "Classified taxonomy seed complete.",
      `${counters.categories} categories`,
      `${counters.leaves} selectable leaves`,
      `${counters.attributes} attribute definitions`,
      `${counters.options} attribute options`,
      `${movedAds} legacy ads moved to leaves`,
    ].join(" | "),
  );
}

main()
  .catch((error) => {
    console.error("Classified taxonomy seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
