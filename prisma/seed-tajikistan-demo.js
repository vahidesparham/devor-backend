const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");
const { ensureDefaultBusinessRoles } = require("../src/modules/business-roles/businessRole.service");

dotenv.config();

const prisma = new PrismaClient();

const LANGS = [
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", direction: "LTR", isDefault: false },
  { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: false },
  { code: "fa", name: "Persian", nativeName: "فارسی", direction: "RTL", isDefault: true },
];

const weekDays = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const serviceTypes = [
  {
    code: "restaurant",
    color: "#ef4444",
    order: 10,
    title: { tg: "Тарабхонаҳо", en: "Restaurants", fa: "رستوران‌ها" },
    description: {
      tg: "Ҷойҳои хӯрок, қаҳвахона ва маҳсулоти ғизоӣ",
      en: "Food venues, cafes, and dining products",
      fa: "رستوران، کافه و سرویس‌های غذایی",
    },
    children: [
      ["restaurant", { tg: "Тарабхона", en: "Restaurant", fa: "رستوران" }],
      ["cafe", { tg: "Қаҳвахона", en: "Cafe", fa: "کافه" }],
      ["cafe_restaurant", { tg: "Кафе-ресторан", en: "Cafe Restaurant", fa: "کافه رستوران" }],
      ["fast_food", { tg: "Фастфуд", en: "Fast Food", fa: "فست‌فود" }],
      ["bakery", { tg: "Нонвойхона", en: "Bakery", fa: "نانوایی و شیرینی" }],
      ["juice_bar", { tg: "Афшурабар", en: "Juice Bar", fa: "آبمیوه و نوشیدنی" }],
    ],
  },
  {
    code: "beauty_salon",
    color: "#ec4899",
    order: 20,
    title: { tg: "Салонҳои зебоӣ", en: "Beauty Salons", fa: "سالن‌های زیبایی" },
    description: {
      tg: "Хизматрасонии мӯй, нохун, ороиш ва нигоҳубини пӯст",
      en: "Hair, nail, makeup, and skincare services",
      fa: "خدمات مو، ناخن، آرایش و مراقبت پوست",
    },
    children: [
      ["hair_salon", { tg: "Салони мӯй", en: "Hair Salon", fa: "سالن مو" }],
      ["nail_studio", { tg: "Студияи нохун", en: "Nail Studio", fa: "استودیو ناخن" }],
      ["barber_shop", { tg: "Сартарошхона", en: "Barber Shop", fa: "آرایشگاه مردانه" }],
      ["spa", { tg: "Спа", en: "Spa", fa: "اسپا" }],
      ["makeup_studio", { tg: "Студияи ороиш", en: "Makeup Studio", fa: "استودیو میکاپ" }],
      ["skincare_clinic", { tg: "Маркази нигоҳубини пӯст", en: "Skincare Clinic", fa: "کلینیک پوست" }],
    ],
  },
  {
    code: "hotel",
    color: "#6366f1",
    order: 30,
    title: { tg: "Меҳмонхонаҳо", en: "Hotels", fa: "هتل‌ها" },
    description: {
      tg: "Иқомат, меҳмонхона, хостел ва апартамент",
      en: "Hotels, guest houses, hostels, and serviced apartments",
      fa: "هتل، مهمان‌خانه، هاستل و آپارتمان اقامتی",
    },
    children: [
      ["hotel", { tg: "Меҳмонхона", en: "Hotel", fa: "هتل" }],
      ["boutique_hotel", { tg: "Бутик-меҳмонхона", en: "Boutique Hotel", fa: "بوتیک هتل" }],
      ["guest_house", { tg: "Меҳмонсарой", en: "Guest House", fa: "مهمان‌خانه" }],
      ["hostel", { tg: "Хостел", en: "Hostel", fa: "هاستل" }],
      ["apartment_hotel", { tg: "Апарт-меҳмонхона", en: "Apartment Hotel", fa: "آپارتمان هتل" }],
      ["resort", { tg: "Курорт", en: "Resort", fa: "اقامتگاه تفریحی" }],
    ],
  },
  {
    code: "sports",
    color: "#22c55e",
    order: 40,
    title: { tg: "Варзиш", en: "Sports", fa: "ورزش" },
    description: {
      tg: "Фитнес, ҳавз, йога ва клубҳои варзишӣ",
      en: "Fitness, pools, yoga, and sports clubs",
      fa: "باشگاه، استخر، یوگا و مراکز ورزشی",
    },
    children: [
      ["gym", { tg: "Фитнес-клуб", en: "Gym", fa: "باشگاه بدنسازی" }],
      ["yoga_studio", { tg: "Студияи йога", en: "Yoga Studio", fa: "استودیو یوگا" }],
      ["swimming_pool", { tg: "Ҳавз", en: "Swimming Pool", fa: "استخر" }],
      ["football_club", { tg: "Клуби футбол", en: "Football Club", fa: "باشگاه فوتبال" }],
      ["martial_arts_club", { tg: "Клуби санъатҳои размӣ", en: "Martial Arts Club", fa: "باشگاه رزمی" }],
      ["sports_complex", { tg: "Маҷмааи варзишӣ", en: "Sports Complex", fa: "مجتمع ورزشی" }],
    ],
  },
];

const attributeGroups = {
  restaurant: [
    optionsGroup("amenities", { tg: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, true, 10, [
      ["wifi", { tg: "Wi‑Fi", en: "Wi‑Fi", fa: "وای‌فای" }],
      ["wheelchair", { tg: "Дастрасӣ бо аробача", en: "Wheelchair access", fa: "ورودی با ویلچر" }],
      ["parking", { tg: "Ҷойи мошин", en: "Parking", fa: "پارکینگ" }],
      ["outdoor_seating", { tg: "Ҷойи берунӣ", en: "Outdoor seating", fa: "فضای باز" }],
      ["kids_area", { tg: "Ҷойи кӯдакон", en: "Kids area", fa: "فضای کودک" }],
      ["live_music", { tg: "Мусиқии зинда", en: "Live music", fa: "موسیقی زنده" }],
      ["card_payment", { tg: "Пардохти кортӣ", en: "Card payment", fa: "پرداخت کارتی" }],
      ["delivery", { tg: "Расондан", en: "Delivery", fa: "ارسال" }],
    ]),
    optionsGroup("atmosphere", { tg: "Фазои тарабхона", en: "Atmosphere", fa: "فضای رستوران" }, true, 20, [
      ["romantic", { tg: "Ошиқона", en: "Romantic", fa: "عاشقانه" }],
      ["calm", { tg: "Ором", en: "Calm", fa: "آرام" }],
      ["modern", { tg: "Муосир", en: "Modern", fa: "مدرن" }],
      ["family", { tg: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
      ["traditional", { tg: "Миллӣ", en: "Traditional", fa: "سنتی" }],
      ["rooftop", { tg: "Рӯйи бом", en: "Rooftop", fa: "روف‌تاپ" }],
    ]),
    optionsGroup("cuisine", { tg: "Навъи хӯрок", en: "Cuisine", fa: "نوع غذا" }, true, 30, [
      ["tajik", { tg: "Тоҷикӣ", en: "Tajik", fa: "تاجیکی" }],
      ["persian", { tg: "Форсӣ", en: "Persian", fa: "ایرانی" }],
      ["italian", { tg: "Итолиёӣ", en: "Italian", fa: "ایتالیایی" }],
      ["turkish", { tg: "Туркӣ", en: "Turkish", fa: "ترکی" }],
      ["fast_food", { tg: "Фастфуд", en: "Fast Food", fa: "فست‌فود" }],
      ["vegetarian", { tg: "Гиёҳхорӣ", en: "Vegetarian", fa: "گیاهی" }],
    ]),
    valueGroup("capacity", "NUMBER", { tg: "Гунҷоиш", en: "Capacity", fa: "گنجایش" }, "seats", 40, true),
  ],
  beauty_salon: [
    optionsGroup("amenities", { tg: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, true, 10, [
      ["women_only", { tg: "Танҳо занона", en: "Women only", fa: "ویژه بانوان" }],
      ["private_room", { tg: "Ҳуҷраи хусусӣ", en: "Private room", fa: "اتاق خصوصی" }],
      ["parking", { tg: "Ҷойи мошин", en: "Parking", fa: "پارکینگ" }],
      ["online_booking", { tg: "Брон онлайн", en: "Online booking", fa: "رزرو آنلاین" }],
      ["card_payment", { tg: "Пардохти кортӣ", en: "Card payment", fa: "پرداخت کارتی" }],
      ["vip_room", { tg: "Ҳуҷраи VIP", en: "VIP room", fa: "اتاق VIP" }],
    ]),
    optionsGroup("specialty", { tg: "Ихтисос", en: "Specialty", fa: "تخصص" }, true, 20, [
      ["hair", { tg: "Мӯй", en: "Hair", fa: "مو" }],
      ["nails", { tg: "Нохун", en: "Nails", fa: "ناخن" }],
      ["makeup", { tg: "Ороиш", en: "Makeup", fa: "میکاپ" }],
      ["skincare", { tg: "Пӯст", en: "Skincare", fa: "پوست" }],
      ["massage", { tg: "Массаж", en: "Massage", fa: "ماساژ" }],
      ["bridal", { tg: "Арӯсӣ", en: "Bridal", fa: "عروس" }],
    ]),
    singleGroup("gender_service", { tg: "Навъи хизмат", en: "Service audience", fa: "مخاطب خدمات" }, 30, [
      ["women", { tg: "Занона", en: "Women", fa: "بانوان" }],
      ["men", { tg: "Мардона", en: "Men", fa: "آقایان" }],
      ["family", { tg: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
    ]),
    valueGroup("average_duration", "NUMBER", { tg: "Давомнокии миёна", en: "Average duration", fa: "مدت زمان میانگین" }, "min", 40, false),
  ],
  hotel: [
    optionsGroup("amenities", { tg: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, true, 10, [
      ["wifi", { tg: "Wi‑Fi", en: "Wi‑Fi", fa: "وای‌فای" }],
      ["breakfast", { tg: "Наҳорӣ", en: "Breakfast", fa: "صبحانه" }],
      ["parking", { tg: "Ҷойи мошин", en: "Parking", fa: "پارکینگ" }],
      ["airport_transfer", { tg: "Трансфери фурудгоҳ", en: "Airport transfer", fa: "ترانسفر فرودگاه" }],
      ["pool", { tg: "Ҳавз", en: "Pool", fa: "استخر" }],
      ["gym", { tg: "Толори варзишӣ", en: "Gym", fa: "باشگاه" }],
      ["restaurant", { tg: "Тарабхона", en: "Restaurant", fa: "رستوران" }],
      ["laundry", { tg: "Ҷомашӯӣ", en: "Laundry", fa: "خشکشویی" }],
    ]),
    optionsGroup("room_types", { tg: "Навъи ҳуҷра", en: "Room types", fa: "نوع اتاق" }, true, 20, [
      ["single", { tg: "Якнафара", en: "Single", fa: "یک‌نفره" }],
      ["double", { tg: "Дунафара", en: "Double", fa: "دونفره" }],
      ["suite", { tg: "Люкс", en: "Suite", fa: "سوئیت" }],
      ["family", { tg: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
      ["apartment", { tg: "Апартамент", en: "Apartment", fa: "آپارتمان" }],
    ]),
    singleGroup("hotel_rating", { tg: "Сатҳи меҳмонхона", en: "Hotel class", fa: "درجه هتل" }, 30, [
      ["three_star", { tg: "3 ситора", en: "3 stars", fa: "۳ ستاره" }],
      ["four_star", { tg: "4 ситора", en: "4 stars", fa: "۴ ستاره" }],
      ["five_star", { tg: "5 ситора", en: "5 stars", fa: "۵ ستاره" }],
      ["boutique", { tg: "Бутик", en: "Boutique", fa: "بوتیک" }],
    ]),
    valueGroup("rooms_count", "NUMBER", { tg: "Шумораи ҳуҷраҳо", en: "Rooms count", fa: "تعداد اتاق" }, "rooms", 40, false),
  ],
  sports: [
    optionsGroup("amenities", { tg: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, true, 10, [
      ["locker_room", { tg: "Ҷевони либос", en: "Locker room", fa: "رختکن" }],
      ["shower", { tg: "Душ", en: "Shower", fa: "دوش" }],
      ["parking", { tg: "Ҷойи мошин", en: "Parking", fa: "پارکینگ" }],
      ["personal_trainer", { tg: "Мураббии шахсӣ", en: "Personal trainer", fa: "مربی خصوصی" }],
      ["group_classes", { tg: "Классҳои гурӯҳӣ", en: "Group classes", fa: "کلاس گروهی" }],
      ["sauna", { tg: "Сауна", en: "Sauna", fa: "سونا" }],
    ]),
    optionsGroup("sport_type", { tg: "Навъи варзиш", en: "Sport type", fa: "نوع ورزش" }, true, 20, [
      ["fitness", { tg: "Фитнес", en: "Fitness", fa: "فیتنس" }],
      ["yoga", { tg: "Йога", en: "Yoga", fa: "یوگا" }],
      ["swimming", { tg: "Шиноварӣ", en: "Swimming", fa: "شنا" }],
      ["football", { tg: "Футбол", en: "Football", fa: "فوتبال" }],
      ["martial_arts", { tg: "Санъатҳои размӣ", en: "Martial arts", fa: "ورزش رزمی" }],
      ["pilates", { tg: "Пилатес", en: "Pilates", fa: "پیلاتس" }],
    ]),
    optionsGroup("membership_type", { tg: "Навъи узвият", en: "Membership type", fa: "نوع عضویت" }, true, 30, [
      ["daily", { tg: "Рӯза", en: "Daily", fa: "روزانه" }],
      ["monthly", { tg: "Моҳона", en: "Monthly", fa: "ماهانه" }],
      ["annual", { tg: "Солона", en: "Annual", fa: "سالانه" }],
      ["family", { tg: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
    ]),
    valueGroup("area_size", "NUMBER", { tg: "Масоҳат", en: "Area size", fa: "مساحت" }, "sqm", 40, false),
  ],
};

const areas = [
  ["ismoili_somoni", { tg: "Исмоили Сомонӣ", en: "Ismoili Somoni", fa: "اسماعیل سامانی" }],
  ["sino", { tg: "Сино", en: "Sino", fa: "سینا" }],
  ["firdavsi", { tg: "Фирдавсӣ", en: "Firdavsi", fa: "فردوسی" }],
  ["shohmansur", { tg: "Шоҳмансур", en: "Shohmansur", fa: "شاه‌منصور" }],
  ["rudaki_avenue", { tg: "Хиёбони Рӯдакӣ", en: "Rudaki Avenue", fa: "خیابان رودکی" }],
  ["zarafshon", { tg: "Зарафшон", en: "Zarafshon", fa: "زرافشان" }],
];

const businessDefinitions = [
  business("rohat-choykhona", "restaurant", "restaurant", "ismoili_somoni", "MEDIUM", 10, 38.5737, 68.7865, ["amenities:wifi", "amenities:card_payment", "amenities:outdoor_seating", "atmosphere:traditional", "atmosphere:family", "cuisine:tajik"], { capacity: 140 }, ["Tajik Menu", "Drinks"], [
    ["osh", 58], ["qurutob", 42], ["shashlik", 36], ["green_tea", 8],
  ], {
    tg: ["Чойхонаи Роҳат", "Ошхона ва чойхонаи машҳур дар маркази Душанбе", "Фазои миллӣ, хӯрокҳои тоҷикии хонагӣ ва чойи хушбӯй барои оилаҳо ва меҳмонон.", "Хиёбони Рӯдакӣ, наздики марказ"],
    en: ["Rohat Choykhona", "A classic Tajik teahouse in central Dushanbe", "Traditional interiors, Tajik comfort food, and fragrant tea for families and guests.", "Rudaki Avenue, central Dushanbe"],
    fa: ["چایخانه راحت", "چایخانه کلاسیک تاجیکی در مرکز دوشنبه", "فضای سنتی، غذاهای خانگی تاجیکی و چای خوش‌عطر برای خانواده‌ها و مهمانان.", "خیابان رودکی، مرکز دوشنبه"],
  }),
  business("navruz-cafe", "restaurant", "cafe", "rudaki_avenue", "MEDIUM", 20, 38.5791, 68.7894, ["amenities:wifi", "amenities:card_payment", "amenities:outdoor_seating", "atmosphere:modern", "atmosphere:calm", "cuisine:vegetarian"], { capacity: 70 }, ["Coffee", "Desserts"], [
    ["latte", 24], ["honey_cake", 28], ["fresh_salad", 35], ["espresso", 16],
  ], {
    tg: ["Кафе Наврӯз", "Кафеи ором барои қаҳва, шириниҳо ва мулоқот", "Интерйери равшан, интернети устувор ва менюи сабук барои кор ва истироҳат.", "Хиёбони Рӯдакӣ"],
    en: ["Navruz Cafe", "A calm cafe for coffee, desserts, and meetings", "Bright interior, reliable internet, and a light menu for work and relaxed breaks.", "Rudaki Avenue"],
    fa: ["کافه نوروز", "کافه‌ای آرام برای قهوه، شیرینی و قرارها", "دکور روشن، اینترنت پایدار و منوی سبک برای کار و استراحت.", "خیابان رودکی"],
  }),
  business("tandir-dushanbe", "restaurant", "cafe_restaurant", "firdavsi", "LOW", 30, 38.5554, 68.7704, ["amenities:parking", "amenities:delivery", "amenities:card_payment", "atmosphere:family", "cuisine:tajik", "cuisine:turkish"], { capacity: 90 }, ["Meals", "Bread"], [
    ["tandir_kebab", 45], ["samsa", 12], ["laghman", 38], ["ayran", 10],
  ], {
    tg: ["Тандир Душанбе", "Хӯрокҳои гарм аз тандир ва таомҳои оилавӣ", "Ҷойи қулай барои хӯроки зуд, нонҳои гарм ва таомҳои серғизо.", "Ноҳияи Фирдавсӣ"],
    en: ["Tandir Dushanbe", "Hot tandoor meals and family dishes", "A practical place for quick meals, fresh bread, and generous portions.", "Firdavsi District"],
    fa: ["تندیر دوشنبه", "غذاهای گرم تنوری و خانوادگی", "جایی مناسب برای غذای سریع، نان تازه و وعده‌های سیرکننده.", "منطقه فردوسی"],
  }),
  business("somon-burger", "restaurant", "fast_food", "sino", "LOW", 40, 38.5489, 68.7476, ["amenities:wifi", "amenities:delivery", "amenities:kids_area", "atmosphere:modern", "cuisine:fast_food"], { capacity: 65 }, ["Burgers", "Sides"], [
    ["somon_burger", 34], ["cheese_fries", 18], ["chicken_wrap", 29], ["cola", 9],
  ], {
    tg: ["Сомон Бургер", "Фастфуди замонавӣ барои бургер ва газакҳо", "Менюи тез, нархҳои дастрас ва муҳити ҷавонписанд дар Сино.", "Ноҳияи Сино"],
    en: ["Somon Burger", "Modern fast food for burgers and snacks", "Quick menu, friendly prices, and a youthful setting in Sino.", "Sino District"],
    fa: ["سومن برگر", "فست‌فود مدرن برای برگر و میان‌وعده", "منوی سریع، قیمت مناسب و فضای جوان‌پسند در سینا.", "منطقه سینا"],
  }),
  business("rudaki-juice-bar", "restaurant", "juice_bar", "shohmansur", "LOW", 50, 38.5662, 68.8034, ["amenities:wifi", "amenities:card_payment", "atmosphere:calm", "cuisine:vegetarian"], { capacity: 35 }, ["Juices", "Bowls"], [
    ["pomegranate_juice", 22], ["green_smoothie", 26], ["fruit_bowl", 32], ["carrot_juice", 18],
  ], {
    tg: ["Афшурабари Рӯдакӣ", "Афшураҳои тару тоза ва нӯшокиҳои солим", "Истгоҳи хурд барои шарбат, смузи ва косаҳои мевагӣ.", "Шоҳмансур"],
    en: ["Rudaki Juice Bar", "Fresh juices and healthy drinks", "A small stop for juices, smoothies, and fruit bowls.", "Shohmansur"],
    fa: ["آبمیوه رودکی", "آبمیوه تازه و نوشیدنی سالم", "ایستگاهی کوچک برای آبمیوه، اسموتی و کاسه میوه.", "شاه‌منصور"],
  }),

  business("lola-beauty-studio", "beauty_salon", "hair_salon", "ismoili_somoni", "MEDIUM", 60, 38.5818, 68.7805, ["amenities:women_only", "amenities:online_booking", "amenities:card_payment", "specialty:hair", "specialty:makeup", "gender_service:women"], { average_duration: 75 }, ["Hair", "Makeup"], [
    ["haircut_styling", 120], ["hair_color", 260], ["daily_makeup", 180], ["blow_dry", 80],
  ], {
    tg: ["Лола Beauty Studio", "Салони зебоӣ барои мӯй ва ороиш", "Мутахассисони ботаҷриба, брон онлайн ва хизматрасонии занона.", "Исмоили Сомонӣ"],
    en: ["Lola Beauty Studio", "Beauty salon for hair and makeup", "Experienced stylists, online booking, and women-focused services.", "Ismoili Somoni"],
    fa: ["استودیو زیبایی لولا", "سالن زیبایی برای مو و آرایش", "متخصصان باتجربه، رزرو آنلاین و خدمات ویژه بانوان.", "اسماعیل سامانی"],
  }),
  business("zebo-nails", "beauty_salon", "nail_studio", "rudaki_avenue", "MEDIUM", 70, 38.5758, 68.786, ["amenities:women_only", "amenities:private_room", "amenities:online_booking", "specialty:nails", "specialty:bridal", "gender_service:women"], { average_duration: 90 }, ["Nails", "Care"], [
    ["gel_manicure", 95], ["pedicure", 110], ["nail_art", 60], ["spa_care", 75],
  ], {
    tg: ["Zebo Nails", "Студияи нохун бо тарҳҳои муосир", "Маникюр, педикюр ва дизайнҳои нозук барои рӯзи корӣ ё маросим.", "Хиёбони Рӯдакӣ"],
    en: ["Zebo Nails", "A nail studio with modern designs", "Manicure, pedicure, and delicate designs for daily style or events.", "Rudaki Avenue"],
    fa: ["زیبو نیلز", "استودیو ناخن با طراحی مدرن", "مانیکور، پدیکور و طراحی ظریف برای روزمره یا مراسم.", "خیابان رودکی"],
  }),
  business("somon-barber", "beauty_salon", "barber_shop", "sino", "LOW", 80, 38.5483, 68.751, ["amenities:parking", "amenities:card_payment", "specialty:hair", "gender_service:men"], { average_duration: 40 }, ["Barber", "Grooming"], [
    ["classic_cut", 55], ["beard_trim", 35], ["skin_fade", 75], ["hair_wash", 20],
  ], {
    tg: ["Somon Barber", "Сартарошхонаи мардона дар Сино", "Буриши классикӣ, fade ва нигоҳубини риш бо навбатгирии тез.", "Ноҳияи Сино"],
    en: ["Somon Barber", "Men's barbershop in Sino", "Classic cuts, fades, and beard care with quick appointments.", "Sino District"],
    fa: ["سومن باربر", "آرایشگاه مردانه در سینا", "کوتاهی کلاسیک، فید و اصلاح ریش با نوبت‌دهی سریع.", "منطقه سینا"],
  }),
  business("gulnoz-spa", "beauty_salon", "spa", "zarafshon", "HIGH", 90, 38.592, 68.739, ["amenities:private_room", "amenities:vip_room", "amenities:parking", "specialty:massage", "specialty:skincare", "gender_service:family"], { average_duration: 120 }, ["Spa", "Skin"], [
    ["relax_massage", 220], ["facial_care", 180], ["body_scrub", 160], ["vip_package", 420],
  ], {
    tg: ["Gulnoz Spa", "Спа ва нигоҳубини оромишбахш", "Фазои ором, ҳуҷраҳои хусусӣ ва бастаҳои VIP барои истироҳат.", "Зарафшон"],
    en: ["Gulnoz Spa", "Relaxing spa and care services", "Quiet ambience, private rooms, and VIP packages for recovery.", "Zarafshon"],
    fa: ["اسپا گلنوز", "اسپا و مراقبت آرامش‌بخش", "فضای آرام، اتاق خصوصی و پکیج‌های VIP برای استراحت.", "زرافشان"],
  }),
  business("orzu-makeup", "beauty_salon", "makeup_studio", "firdavsi", "MEDIUM", 100, 38.5569, 68.7722, ["amenities:women_only", "amenities:online_booking", "specialty:makeup", "specialty:bridal", "gender_service:women"], { average_duration: 110 }, ["Makeup", "Bridal"], [
    ["evening_makeup", 210], ["bridal_makeup", 520], ["lash_style", 90], ["consultation", 50],
  ], {
    tg: ["Orzu Makeup", "Студияи ороиш барои маросимҳо", "Ороиши шом, арӯсӣ ва машварати образ бо брон пешакӣ.", "Фирдавсӣ"],
    en: ["Orzu Makeup", "Makeup studio for special occasions", "Evening and bridal makeup plus styling consultation by appointment.", "Firdavsi"],
    fa: ["اورزو میکاپ", "استودیو آرایش برای مراسم", "میکاپ شب، عروس و مشاوره استایل با رزرو قبلی.", "فردوسی"],
  }),

  business("dushanbe-grand-hotel", "hotel", "hotel", "ismoili_somoni", "HIGH", 110, 38.581, 68.779, ["amenities:wifi", "amenities:breakfast", "amenities:airport_transfer", "amenities:gym", "room_types:suite", "room_types:double", "hotel_rating:five_star"], { rooms_count: 120 }, ["Rooms", "Services"], [
    ["standard_room", 620], ["suite_room", 1200], ["airport_transfer", 180], ["breakfast_buffet", 90],
  ], {
    tg: ["Dushanbe Grand Hotel", "Меҳмонхонаи панҷситора дар марказ", "Ҳуҷраҳои бароҳат, наҳории мукаммал ва дастрасии зуд ба маркази шаҳр.", "Исмоили Сомонӣ"],
    en: ["Dushanbe Grand Hotel", "A five-star hotel in the center", "Comfortable rooms, complete breakfast, and quick access to the city center.", "Ismoili Somoni"],
    fa: ["هتل گرند دوشنبه", "هتل پنج‌ستاره در مرکز شهر", "اتاق‌های راحت، صبحانه کامل و دسترسی سریع به مرکز شهر.", "اسماعیل سامانی"],
  }),
  business("rudaki-boutique-hotel", "hotel", "boutique_hotel", "rudaki_avenue", "HIGH", 120, 38.573, 68.787, ["amenities:wifi", "amenities:breakfast", "amenities:restaurant", "room_types:double", "room_types:suite", "hotel_rating:boutique"], { rooms_count: 34 }, ["Rooms", "Dining"], [
    ["boutique_double", 780], ["junior_suite", 1050], ["city_breakfast", 80], ["late_checkout", 120],
  ], {
    tg: ["Rudaki Boutique Hotel", "Бутик-меҳмонхона бо тарҳи муосир", "Иқомати шахсӣ, дизайн гарм ва ҷойгиршавии қулай дар хиёбони асосӣ.", "Хиёбони Рӯдакӣ"],
    en: ["Rudaki Boutique Hotel", "A boutique hotel with modern design", "Personal stay, warm design, and a convenient location on the main avenue.", "Rudaki Avenue"],
    fa: ["بوتیک هتل رودکی", "بوتیک هتل با طراحی مدرن", "اقامتی شخصی، طراحی گرم و موقعیت مناسب در خیابان اصلی.", "خیابان رودکی"],
  }),
  business("somon-guest-house", "hotel", "guest_house", "firdavsi", "LOW", 130, 38.553, 68.766, ["amenities:wifi", "amenities:parking", "room_types:single", "room_types:double", "hotel_rating:three_star"], { rooms_count: 18 }, ["Stay", "Extras"], [
    ["single_room", 220], ["double_room", 330], ["laundry", 40], ["local_breakfast", 45],
  ], {
    tg: ["Somon Guest House", "Меҳмонсарои иқтисодӣ ва оилавӣ", "Ҳуҷраҳои тоза, муҳити хонагӣ ва нархи дастрас барои сафарҳои кӯтоҳ.", "Фирдавсӣ"],
    en: ["Somon Guest House", "Affordable and family-style guest house", "Clean rooms, a home-like mood, and fair prices for short stays.", "Firdavsi"],
    fa: ["مهمان‌خانه سومن", "مهمان‌خانه اقتصادی و خانوادگی", "اتاق‌های تمیز، فضای خانگی و قیمت مناسب برای اقامت کوتاه.", "فردوسی"],
  }),
  business("pamir-hostel", "hotel", "hostel", "shohmansur", "LOW", 140, 38.566, 68.807, ["amenities:wifi", "amenities:laundry", "room_types:single", "room_types:family", "hotel_rating:three_star"], { rooms_count: 42 }, ["Beds", "Shared"], [
    ["shared_bed", 90], ["private_room", 260], ["locker", 15], ["laundry", 35],
  ], {
    tg: ["Pamir Hostel", "Хостели дӯстона барои сайёҳон", "Ҷойи содда, интернет, ҷомашӯӣ ва дастрасии хуб ба марказ.", "Шоҳмансур"],
    en: ["Pamir Hostel", "Friendly hostel for travelers", "Simple stay, internet, laundry, and good access to the city center.", "Shohmansur"],
    fa: ["هاستل پامیر", "هاستل صمیمی برای گردشگران", "اقامت ساده، اینترنت، خشکشویی و دسترسی خوب به مرکز.", "شاه‌منصور"],
  }),
  business("atlas-apart-hotel", "hotel", "apartment_hotel", "zarafshon", "MEDIUM", 150, 38.591, 68.742, ["amenities:wifi", "amenities:parking", "amenities:laundry", "room_types:apartment", "room_types:family", "hotel_rating:four_star"], { rooms_count: 28 }, ["Apartments", "Services"], [
    ["studio_apartment", 520], ["family_apartment", 820], ["weekly_cleaning", 140], ["parking_day", 30],
  ], {
    tg: ["Atlas Apart Hotel", "Апартаментҳои хизматрасондор барои иқомати дароз", "Ошхона, ҷомашӯӣ ва ҷойи кор барои оилаҳо ва меҳмонони корӣ.", "Зарафшон"],
    en: ["Atlas Apart Hotel", "Serviced apartments for longer stays", "Kitchen, laundry, and workspace for families and business guests.", "Zarafshon"],
    fa: ["آپارتمان هتل اطلس", "آپارتمان خدماتی برای اقامت طولانی", "آشپزخانه، خشکشویی و فضای کار برای خانواده‌ها و سفر کاری.", "زرافشان"],
  }),

  business("fitlife-dushanbe", "sports", "gym", "sino", "MEDIUM", 160, 38.5504, 68.748, ["amenities:locker_room", "amenities:shower", "amenities:personal_trainer", "sport_type:fitness", "membership_type:monthly"], { area_size: 620 }, ["Membership", "Training"], [
    ["monthly_pass", 280], ["personal_session", 120], ["day_pass", 35], ["body_assessment", 60],
  ], {
    tg: ["FitLife Dushanbe", "Фитнес-клуб бо таҷҳизоти нав", "Толори васеъ, мураббиёни шахсӣ ва барномаҳои моҳона.", "Сино"],
    en: ["FitLife Dushanbe", "A gym with modern equipment", "Spacious floor, personal trainers, and monthly programs.", "Sino"],
    fa: ["فیت‌لایف دوشنبه", "باشگاه با تجهیزات مدرن", "سالن بزرگ، مربی خصوصی و برنامه‌های ماهانه.", "سینا"],
  }),
  business("rudaki-yoga-studio", "sports", "yoga_studio", "rudaki_avenue", "MEDIUM", 170, 38.576, 68.788, ["amenities:locker_room", "amenities:group_classes", "sport_type:yoga", "sport_type:pilates", "membership_type:monthly"], { area_size: 210 }, ["Classes", "Plans"], [
    ["drop_in_yoga", 45], ["monthly_yoga", 260], ["pilates_class", 55], ["private_yoga", 150],
  ], {
    tg: ["Rudaki Yoga Studio", "Йога ва пилатес дар фазои ором", "Классҳои гурӯҳӣ, машқҳои нафас ва барномаҳои шахсӣ.", "Хиёбони Рӯдакӣ"],
    en: ["Rudaki Yoga Studio", "Yoga and Pilates in a calm space", "Group classes, breathing practice, and private plans.", "Rudaki Avenue"],
    fa: ["استودیو یوگا رودکی", "یوگا و پیلاتس در فضای آرام", "کلاس گروهی، تمرین تنفس و برنامه خصوصی.", "خیابان رودکی"],
  }),
  business("somon-swim-club", "sports", "swimming_pool", "firdavsi", "MEDIUM", 180, 38.557, 68.774, ["amenities:locker_room", "amenities:shower", "amenities:parking", "sport_type:swimming", "membership_type:daily"], { area_size: 740 }, ["Pool", "Lessons"], [
    ["pool_day_pass", 50], ["kids_lesson", 90], ["adult_lesson", 110], ["monthly_pool", 320],
  ], {
    tg: ["Somon Swim Club", "Ҳавзи тоза барои шиноварӣ ва омӯзиш", "Сеансҳои рӯзона, омӯзиши кӯдакон ва барномаи моҳона.", "Фирдавсӣ"],
    en: ["Somon Swim Club", "Clean pool for swimming and lessons", "Day sessions, kids lessons, and monthly plans.", "Firdavsi"],
    fa: ["باشگاه شنای سومن", "استخر تمیز برای شنا و آموزش", "سانس روزانه، آموزش کودک و برنامه ماهانه.", "فردوسی"],
  }),
  business("varzish-arena", "sports", "sports_complex", "shohmansur", "HIGH", 190, 38.563, 68.802, ["amenities:locker_room", "amenities:shower", "amenities:parking", "amenities:group_classes", "sport_type:football", "sport_type:fitness", "membership_type:annual"], { area_size: 2200 }, ["Fields", "Membership"], [
    ["football_field_hour", 420], ["annual_membership", 2400], ["group_fitness", 70], ["event_rental", 1800],
  ], {
    tg: ["Varzish Arena", "Маҷмааи варзишӣ барои машқ ва чорабинӣ", "Майдон, толор ва хизматрасонии иҷора барои дастаҳо.", "Шоҳмансур"],
    en: ["Varzish Arena", "Sports complex for training and events", "Fields, halls, and rental services for teams.", "Shohmansur"],
    fa: ["ورزش آرنا", "مجتمع ورزشی برای تمرین و رویداد", "زمین، سالن و خدمات اجاره برای تیم‌ها.", "شاه‌منصور"],
  }),
  business("pamir-martial-arts", "sports", "martial_arts_club", "ismoili_somoni", "LOW", 200, 38.579, 68.781, ["amenities:locker_room", "amenities:personal_trainer", "sport_type:martial_arts", "membership_type:monthly"], { area_size: 330 }, ["Training", "Membership"], [
    ["kids_group", 180], ["adult_group", 220], ["private_fight_session", 140], ["monthly_martial", 260],
  ], {
    tg: ["Pamir Martial Arts", "Клуби санъатҳои размӣ барои кӯдакону калонсолон", "Машқҳои гурӯҳӣ, тайёрии шахсӣ ва муҳити интизомнок.", "Исмоили Сомонӣ"],
    en: ["Pamir Martial Arts", "Martial arts club for kids and adults", "Group training, private coaching, and a disciplined atmosphere.", "Ismoili Somoni"],
    fa: ["باشگاه رزمی پامیر", "باشگاه رزمی برای کودکان و بزرگسالان", "تمرین گروهی، مربی خصوصی و فضای منظم.", "اسماعیل سامانی"],
  }),
];

function optionsGroup(code, title, showInFilters, order, options) {
  return { code, title, fieldType: "MULTI_SELECT", selectionMode: "MULTIPLE", showInFilters, displayOrder: order, options };
}

function singleGroup(code, title, order, options) {
  return { code, title, fieldType: "SELECT", selectionMode: "SINGLE", showInFilters: true, displayOrder: order, options };
}

function valueGroup(code, fieldType, title, unit, order, showInFilters) {
  return { code, title, fieldType, selectionMode: "SINGLE", unit, showInFilters, displayOrder: order, options: [] };
}

function business(slug, parentCode, serviceTypeCode, areaCode, economicLevel, displayOrder, latitude, longitude, attributeKeys, values, categoryTitles, offerings, tr) {
  return { slug, parentCode, serviceTypeCode, areaCode, economicLevel, displayOrder, latitude, longitude, attributeKeys, values, categoryTitles, offerings, tr };
}

const trRows = (translations, extra = {}) => LANGS.map(({ code }) => ({ lang: code, title: translations[code], isActive: true, ...extra[code] }));

function businessTranslations(item) {
  return LANGS.map(({ code }) => {
    const [title, summary, description, address] = item.tr[code];
    return { lang: code, title, summary, description, address, isActive: true };
  });
}

async function upsertTranslation(model, where, update, create) {
  await model.upsert({ where, update, create });
}

async function seedLanguages() {
  for (const lang of LANGS) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, nativeName: lang.nativeName, direction: lang.direction, isActive: true, isDefault: lang.isDefault },
      create: { ...lang, isActive: true },
    });
  }
  await prisma.language.updateMany({ where: { code: { not: "fa" } }, data: { isDefault: false } });
  await prisma.language.update({ where: { code: "fa" }, data: { isDefault: true } });
}

async function seedServiceTypes() {
  const byCode = new Map();
  for (const parent of serviceTypes) {
    const item = await prisma.serviceType.upsert({
      where: { code: parent.code },
      update: { parentId: null, title: parent.title.en, description: parent.description.en, color: parent.color, displayOrder: parent.order, isActive: true },
      create: { code: parent.code, title: parent.title.en, description: parent.description.en, color: parent.color, displayOrder: parent.order, isActive: true },
    });
    byCode.set(parent.code, item);
    for (const lang of LANGS) {
      await upsertTranslation(
        prisma.serviceTypeTranslation,
        { serviceTypeId_lang: { serviceTypeId: item.id, lang: lang.code } },
        { title: parent.title[lang.code], description: parent.description[lang.code], isActive: true },
        { serviceTypeId: item.id, lang: lang.code, title: parent.title[lang.code], description: parent.description[lang.code], isActive: true },
      );
    }
  }

  for (const parent of serviceTypes) {
    const parentItem = byCode.get(parent.code);
    for (let index = 0; index < parent.children.length; index += 1) {
      const [code, title] = parent.children[index];
      const item = await prisma.serviceType.upsert({
        where: { code },
        update: { parentId: parentItem.id, title: title.en, description: parent.description.en, color: parent.color, displayOrder: (index + 1) * 10, isActive: true },
        create: { code, parentId: parentItem.id, title: title.en, description: parent.description.en, color: parent.color, displayOrder: (index + 1) * 10, isActive: true },
      });
      byCode.set(code, item);
      for (const lang of LANGS) {
        await upsertTranslation(
          prisma.serviceTypeTranslation,
          { serviceTypeId_lang: { serviceTypeId: item.id, lang: lang.code } },
          { title: title[lang.code], description: parent.description[lang.code], isActive: true },
          { serviceTypeId: item.id, lang: lang.code, title: title[lang.code], description: parent.description[lang.code], isActive: true },
        );
      }
    }
  }
  return byCode;
}

async function seedAttributeGroups(serviceTypeByCode) {
  const optionIdByPath = new Map();
  const groupIdByPath = new Map();
  for (const [serviceCode, groups] of Object.entries(attributeGroups)) {
    const serviceType = serviceTypeByCode.get(serviceCode);
    for (const group of groups) {
      const item = await prisma.attributeGroup.upsert({
        where: { serviceTypeId_code: { serviceTypeId: serviceType.id, code: group.code } },
        update: {
          title: group.title.en,
          fieldType: group.fieldType,
          selectionMode: group.selectionMode,
          unit: group.unit || null,
          isRequired: false,
          showInFilters: group.showInFilters,
          displayOrder: group.displayOrder,
          isActive: true,
        },
        create: {
          serviceTypeId: serviceType.id,
          code: group.code,
          title: group.title.en,
          fieldType: group.fieldType,
          selectionMode: group.selectionMode,
          unit: group.unit || null,
          isRequired: false,
          showInFilters: group.showInFilters,
          displayOrder: group.displayOrder,
          isActive: true,
        },
      });
      groupIdByPath.set(`${serviceCode}:${group.code}`, item.id);
      for (const lang of LANGS) {
        await upsertTranslation(
          prisma.attributeGroupTranslation,
          { groupId_lang: { groupId: item.id, lang: lang.code } },
          { title: group.title[lang.code], isActive: true },
          { groupId: item.id, lang: lang.code, title: group.title[lang.code], isActive: true },
        );
      }
      for (let index = 0; index < group.options.length; index += 1) {
        const [key, title] = group.options[index];
        const option = await prisma.attributeOption.upsert({
          where: { groupId_key: { groupId: item.id, key } },
          update: { title: title.en, displayOrder: (index + 1) * 10, isActive: true },
          create: { groupId: item.id, key, title: title.en, displayOrder: (index + 1) * 10, isActive: true },
        });
        optionIdByPath.set(`${serviceCode}:${group.code}:${key}`, option.id);
        for (const lang of LANGS) {
          await upsertTranslation(
            prisma.attributeOptionTranslation,
            { optionId_lang: { optionId: option.id, lang: lang.code } },
            { title: title[lang.code], isActive: true },
            { optionId: option.id, lang: lang.code, title: title[lang.code], isActive: true },
          );
        }
      }
    }
  }
  return { optionIdByPath, groupIdByPath };
}

async function seedLocations() {
  const country = await prisma.country.upsert({
    where: { code: "TJ" },
    update: { title: "Tajikistan", phoneCode: "+992", displayOrder: 10, isActive: true },
    create: { code: "TJ", title: "Tajikistan", phoneCode: "+992", displayOrder: 10, isActive: true },
  });
  const countryTitle = { tg: "Тоҷикистон", en: "Tajikistan", fa: "تاجیکستان" };
  for (const lang of LANGS) {
    await upsertTranslation(
      prisma.countryTranslation,
      { countryId_lang: { countryId: country.id, lang: lang.code } },
      { title: countryTitle[lang.code], isActive: true },
      { countryId: country.id, lang: lang.code, title: countryTitle[lang.code], isActive: true },
    );
  }

  const city = await prisma.city.upsert({
    where: { countryId_code: { countryId: country.id, code: "dushanbe" } },
    update: { title: "Dushanbe", latitude: 38.5598, longitude: 68.7870, displayOrder: 10, isActive: true },
    create: { countryId: country.id, code: "dushanbe", title: "Dushanbe", latitude: 38.5598, longitude: 68.7870, displayOrder: 10, isActive: true },
  });
  const cityTitle = { tg: "Душанбе", en: "Dushanbe", fa: "دوشنبه" };
  for (const lang of LANGS) {
    await upsertTranslation(
      prisma.cityTranslation,
      { cityId_lang: { cityId: city.id, lang: lang.code } },
      { title: cityTitle[lang.code], isActive: true },
      { cityId: city.id, lang: lang.code, title: cityTitle[lang.code], isActive: true },
    );
  }

  const areaByCode = new Map();
  for (let index = 0; index < areas.length; index += 1) {
    const [code, title] = areas[index];
    const area = await prisma.area.upsert({
      where: { cityId_code: { cityId: city.id, code } },
      update: { title: title.en, displayOrder: (index + 1) * 10, isActive: true },
      create: { cityId: city.id, code, title: title.en, displayOrder: (index + 1) * 10, isActive: true },
    });
    areaByCode.set(code, area);
    for (const lang of LANGS) {
      await upsertTranslation(
        prisma.areaTranslation,
        { areaId_lang: { areaId: area.id, lang: lang.code } },
        { title: title[lang.code], isActive: true },
        { areaId: area.id, lang: lang.code, title: title[lang.code], isActive: true },
      );
    }
  }
  return { country, city, areaByCode };
}

async function seedAppUsers() {
  const users = [
    ["+992900001001", "Азиз", "Каримов", "aziz.karimov@example.com"],
    ["+992900001002", "Мадина", "Сафарова", "madina.safarova@example.com"],
    ["+992900001003", "Фарид", "Назаров", "farid.nazarov@example.com"],
    ["+992900001004", "Нигина", "Юсуфӣ", "nigina.yusufi@example.com"],
  ];
  const result = [];
  for (const [phone, firstName, lastName, email] of users) {
    result.push(await prisma.appUser.upsert({
      where: { phone },
      update: { firstName, lastName, email, countryCode: "TJ", phoneCode: "+992", isActive: true },
      create: { phone, firstName, lastName, email, countryCode: "TJ", phoneCode: "+992", isActive: true },
    }));
  }
  return result;
}

async function recreateBusinessDetails(business, item, parentCode, optionIdByPath, groupIdByPath, appUsers) {
  await prisma.businessReview.deleteMany({ where: { businessId: business.id } });
  await prisma.businessOfferingCategory.deleteMany({ where: { businessId: business.id } });
  await prisma.businessContactLink.deleteMany({ where: { businessId: business.id } });
  await prisma.businessWorkingHour.deleteMany({ where: { businessId: business.id } });
  await prisma.businessGallery.deleteMany({ where: { businessId: business.id } });
  await prisma.businessSlideshow.deleteMany({ where: { businessId: business.id } });
  await prisma.businessAttribute.deleteMany({ where: { businessId: business.id } });
  await prisma.businessAttributeValue.deleteMany({ where: { businessId: business.id } });

  await prisma.businessContactLink.createMany({
    data: [
      { businessId: business.id, type: "PHONE", label: "Phone", value: business.phone, displayOrder: 10, isPrimary: true, isActive: true },
      { businessId: business.id, type: "INSTAGRAM", label: "Instagram", url: `https://instagram.com/${item.slug.replace(/-/g, ".")}`, displayOrder: 20, isPrimary: false, isActive: true },
    ],
  });

  await prisma.businessWorkingHour.createMany({
    data: weekDays.map((dayOfWeek, index) => ({
      businessId: business.id,
      dayOfWeek,
      opensAt: dayOfWeek === "FRIDAY" ? "10:00" : "09:00",
      closesAt: dayOfWeek === "FRIDAY" ? "18:00" : "22:00",
      isClosed: false,
      displayOrder: (index + 1) * 10,
    })),
  });

  const attributeOptionIds = item.attributeKeys
    .map((key) => optionIdByPath.get(`${parentCode}:${key.replace(":", ":")}`))
    .filter(Boolean);
  if (attributeOptionIds.length) {
    await prisma.businessAttribute.createMany({
      data: [...new Set(attributeOptionIds)].map((attributeOptionId) => ({ businessId: business.id, attributeOptionId })),
      skipDuplicates: true,
    });
  }

  const valueRows = Object.entries(item.values || {}).map(([groupCode, value]) => {
    const groupId = groupIdByPath.get(`${parentCode}:${groupCode}`);
    if (!groupId) return null;
    return typeof value === "number"
      ? { businessId: business.id, groupId, numberValue: value }
      : { businessId: business.id, groupId, textValue: String(value) };
  }).filter(Boolean);
  if (valueRows.length) await prisma.businessAttributeValue.createMany({ data: valueRows });

  await prisma.businessGallery.createMany({
    data: [1, 2, 3].map((n) => ({ businessId: business.id, image: `/uploads/demo/placeholders/${item.slug}-gallery-${n}.jpg`, alt: `${item.slug} gallery ${n}`, displayOrder: n * 10 })),
  });
  await prisma.businessSlideshow.createMany({
    data: [1, 2].map((n) => ({ businessId: business.id, image: `/uploads/demo/placeholders/${item.slug}-slide-${n}.jpg`, displayOrder: n * 10 })),
  });

  for (let categoryIndex = 0; categoryIndex < item.categoryTitles.length; categoryIndex += 1) {
    const baseTitle = item.categoryTitles[categoryIndex];
    const category = await prisma.businessOfferingCategory.create({
      data: {
        businessId: business.id,
        title: baseTitle,
        displayOrder: (categoryIndex + 1) * 10,
        isActive: true,
        translations: {
          create: LANGS.map(({ code }) => ({ lang: code, title: localizeOfferingCategory(baseTitle, code), isActive: true })),
        },
      },
    });
    const relatedOfferings = item.offerings.filter((_, idx) => idx % item.categoryTitles.length === categoryIndex);
    for (let offerIndex = 0; offerIndex < relatedOfferings.length; offerIndex += 1) {
      const [key, price] = relatedOfferings[offerIndex];
      const title = titleFromKey(key);
      await prisma.businessOffering.create({
        data: {
          businessId: business.id,
          categoryId: category.id,
          title,
          basePrice: price,
          preparationMinutes: 30,
          isFeatured: offerIndex === 0,
          isPopular: offerIndex === 0,
          isNew: offerIndex === 1,
          displayOrder: (offerIndex + 1) * 10,
          isActive: true,
          translations: { create: LANGS.map(({ code }) => ({ lang: code, title: localizeOffering(title, code), shortDescription: localizeOfferingDescription(title, code), description: localizeOfferingDescription(title, code), isActive: true })) },
        },
      });
    }
  }

  for (let index = 0; index < Math.min(3, appUsers.length); index += 1) {
    await prisma.businessReview.create({
      data: {
        businessId: business.id,
        appUserId: appUsers[(item.displayOrder / 10 + index) % appUsers.length].id,
        rating: 4.2 + (index * 0.25),
        comment: `Demo review for ${item.slug}`,
        isActive: true,
      },
    });
  }

  await ensureDefaultBusinessRoles(business.id);
}

function titleFromKey(key) {
  return key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function localizeOfferingCategory(value, lang) {
  if (lang === "fa") return ({ "Tajik Menu": "منوی تاجیکی", Drinks: "نوشیدنی‌ها", Coffee: "قهوه", Desserts: "دسرها", Meals: "غذاها", Bread: "نان", Burgers: "برگرها", Sides: "کنار غذا", Juices: "آبمیوه‌ها", Bowls: "کاسه‌ها", Hair: "مو", Makeup: "میکاپ", Nails: "ناخن", Care: "مراقبت", Barber: "آرایشگری", Grooming: "اصلاح", Spa: "اسپا", Skin: "پوست", Bridal: "عروس", Rooms: "اتاق‌ها", Services: "خدمات", Dining: "غذاخوری", Stay: "اقامت", Extras: "افزودنی‌ها", Beds: "تخت‌ها", Shared: "مشترک", Apartments: "آپارتمان‌ها", Membership: "عضویت", Training: "تمرین", Classes: "کلاس‌ها", Plans: "برنامه‌ها", Pool: "استخر", Lessons: "آموزش", Fields: "زمین‌ها" }[value] || value);
  if (lang === "tg") return ({ "Tajik Menu": "Менюи тоҷикӣ", Drinks: "Нӯшокиҳо", Coffee: "Қаҳва", Desserts: "Шириниҳо", Meals: "Хӯрокҳо", Bread: "Нон", Burgers: "Бургерҳо", Sides: "Иловаҳо", Juices: "Афшураҳо", Bowls: "Косаҳо", Hair: "Мӯй", Makeup: "Ороиш", Nails: "Нохун", Care: "Нигоҳубин", Barber: "Сартарошӣ", Grooming: "Оростагӣ", Spa: "Спа", Skin: "Пӯст", Bridal: "Арӯсӣ", Rooms: "Ҳуҷраҳо", Services: "Хизматҳо", Dining: "Хӯрокхӯрӣ", Stay: "Иқомат", Extras: "Иловаҳо", Beds: "Ҷойҳо", Shared: "Муштарак", Apartments: "Апартаментҳо", Membership: "Узвият", Training: "Машқ", Classes: "Классҳо", Plans: "Нақшаҳо", Pool: "Ҳавз", Lessons: "Дарсҳо", Fields: "Майдонҳо" }[value] || value);
  return value;
}

function localizeOffering(title, lang) {
  if (lang === "en") return title;
  const normalized = title.toLowerCase();
  if (lang === "fa") return normalized.replace(/\b\w/g, (m) => m.toUpperCase());
  return normalized.replace(/\b\w/g, (m) => m.toUpperCase());
}

function localizeOfferingDescription(title, lang) {
  if (lang === "fa") return `${title} به عنوان آیتم نمایشی برای تست اپلیکیشن.`;
  if (lang === "tg") return `${title} ҳамчун آیтеми намоишӣ барои санҷиши барнома.`;
  return `${title} as a showcase item for application testing.`;
}

async function seedBusinesses(serviceTypeByCode, location, attrMaps, appUsers) {
  for (const item of businessDefinitions) {
    const serviceType = serviceTypeByCode.get(item.serviceTypeCode);
    const area = location.areaByCode.get(item.areaCode);
    const tr = businessTranslations(item);
    const existing = await prisma.business.findUnique({ where: { slug: item.slug }, select: { id: true } });
    const core = {
      serviceTypeId: serviceType.id,
      countryId: location.country.id,
      cityId: location.city.id,
      areaId: area.id,
      slug: item.slug,
      logoImage: null,
      coverImage: null,
      verticalImage: null,
      phone: `+992 ${900000000 + item.displayOrder}`,
      email: `${item.slug}@example.com`,
      website: `https://example.com/${item.slug}`,
      latitude: item.latitude,
      longitude: item.longitude,
      economicLevel: item.economicLevel,
      operationMode: "SHOWCASE",
      publicationStatus: "PUBLISHED",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      publishedAt: new Date(),
      displayOrder: item.displayOrder,
      isActive: true,
      isFeatured: item.displayOrder % 20 === 0,
      showInLatest: item.displayOrder >= 160 || item.displayOrder % 30 === 0,
    };

    const businessItem = existing
      ? await prisma.business.update({ where: { id: existing.id }, data: core })
      : await prisma.business.create({ data: core });

    for (const row of tr) {
      await upsertTranslation(
        prisma.businessTranslation,
        { businessId_lang: { businessId: businessItem.id, lang: row.lang } },
        row,
        { ...row, businessId: businessItem.id },
      );
    }
    await recreateBusinessDetails(businessItem, item, item.parentCode, attrMaps.optionIdByPath, attrMaps.groupIdByPath, appUsers);
  }
}

async function main() {
  await seedLanguages();
  const serviceTypeByCode = await seedServiceTypes();
  const attrMaps = await seedAttributeGroups(serviceTypeByCode);
  const location = await seedLocations();
  const appUsers = await seedAppUsers();
  await seedBusinesses(serviceTypeByCode, location, attrMaps, appUsers);
  console.log("Tajikistan demo seed complete.");
  console.log("Created/updated: 4 parent service types, child service types, attribute groups, Tajikistan/Dushanbe locations, and 20 demo businesses.");
}

main()
  .catch((err) => {
    console.error("Tajikistan demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
