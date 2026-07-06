const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();

const LANGUAGES = [
    { code: "tj", name: "Tajik", nativeName: "Тоҷикӣ", direction: "LTR", isDefault: false },
    { code: "en", name: "English", nativeName: "English", direction: "LTR", isDefault: false },
    { code: "fa", name: "Persian", nativeName: "فارسی", direction: "RTL", isDefault: true },
];

const SERVICE_TYPES = [
    {
        code: "restaurant",
        color: "#ef4444",
        order: 10,
        title: { tj: "Хӯрок ва қаҳвахона", en: "Restaurants", fa: "رستوران" },
        description: {
            tj: "Ресторанҳо, қаҳвахонаҳо ва ҷойҳои хӯрокхӯрӣ.",
            en: "Restaurants, cafes, and food venues.",
            fa: "رستوران‌ها، کافه‌ها و فضاهای غذاخوری.",
        },
        children: [
            ["restaurant_dining", { tj: "Ресторан", en: "Restaurant", fa: "رستوران" }],
            ["cafe", { tj: "Қаҳвахона", en: "Cafe", fa: "کافه" }],
            ["cafe_restaurant", { tj: "Кафе-ресторан", en: "Cafe Restaurant", fa: "کافه رستوران" }],
            ["fast_food", { tj: "Фастфуд", en: "Fast Food", fa: "فست فود" }],
            ["bakery", { tj: "Нонвойхона", en: "Bakery", fa: "نانوایی و شیرینی" }],
            ["juice_bar", { tj: "Афшурабар", en: "Juice Bar", fa: "آبمیوه و نوشیدنی" }],
        ],
    },
    {
        code: "beauty_salon",
        color: "#ec4899",
        order: 20,
        title: { tj: "Салонҳои зебоӣ", en: "Beauty Salons", fa: "سالن زیبایی" },
        description: {
            tj: "Салонҳои зебоӣ, нохун, ороиш ва нигоҳубини пӯст.",
            en: "Beauty, nail, makeup, and skincare salons.",
            fa: "سالن‌های زیبایی، ناخن، آرایش و مراقبت پوست.",
        },
        children: [
            ["hair_salon", { tj: "Салони мӯй", en: "Hair Salon", fa: "سالن مو" }],
            ["nail_studio", { tj: "Студияи нохун", en: "Nail Studio", fa: "استودیو ناخن" }],
            ["barber_shop", { tj: "Сартарошхона", en: "Barber Shop", fa: "آرایشگاه مردانه" }],
            ["spa", { tj: "Спа", en: "Spa", fa: "اسپا" }],
            ["makeup_studio", { tj: "Студияи ороиш", en: "Makeup Studio", fa: "استودیو آرایش" }],
            ["skincare_clinic", { tj: "Клиникаи пӯст", en: "Skincare Clinic", fa: "کلینیک پوست" }],
        ],
    },
    {
        code: "hotel",
        color: "#8757e8",
        order: 30,
        title: { tj: "Меҳмонхонаҳо", en: "Hotels", fa: "هتل" },
        description: {
            tj: "Меҳмонхонаҳо, меҳмонхонаҳои хурд ва иқоматгоҳҳо.",
            en: "Hotels, boutique stays, and guest houses.",
            fa: "هتل‌ها، اقامتگاه‌ها و مهمان‌خانه‌ها.",
        },
        children: [
            ["hotel_standard", { tj: "Меҳмонхона", en: "Hotel", fa: "هتل" }],
            ["boutique_hotel", { tj: "Бутик-меҳмонхона", en: "Boutique Hotel", fa: "بوتیک هتل" }],
            ["guest_house", { tj: "Меҳмонхонача", en: "Guest House", fa: "مهمان‌خانه" }],
            ["hostel", { tj: "Хостел", en: "Hostel", fa: "هاستل" }],
            ["apartment_hotel", { tj: "Апарт-меҳмонхона", en: "Apartment Hotel", fa: "هتل آپارتمان" }],
            ["resort", { tj: "Курорт", en: "Resort", fa: "ریزورت" }],
        ],
    },
    {
        code: "sports",
        color: "#16a34a",
        order: 40,
        title: { tj: "Варзиш", en: "Sports", fa: "ورزش" },
        description: {
            tj: "Клубҳо, толорҳо ва марказҳои варзишӣ.",
            en: "Gyms, clubs, and sport centers.",
            fa: "باشگاه‌ها، سالن‌ها و مراکز ورزشی.",
        },
        children: [
            ["gym", { tj: "Толори фитнес", en: "Gym", fa: "باشگاه بدنسازی" }],
            ["yoga_studio", { tj: "Студияи йога", en: "Yoga Studio", fa: "استودیو یوگا" }],
            ["swimming_pool", { tj: "Ҳавзи шиноварӣ", en: "Swimming Pool", fa: "استخر" }],
            ["football_club", { tj: "Клуби футбол", en: "Football Club", fa: "باشگاه فوتبال" }],
            ["martial_arts_club", { tj: "Клуби размӣ", en: "Martial Arts Club", fa: "باشگاه هنرهای رزمی" }],
            ["sports_complex", { tj: "Маҷмааи варзишӣ", en: "Sports Complex", fa: "مجموعه ورزشی" }],
        ],
    },
];

const ATTRIBUTE_GROUPS = {
    restaurant: [
        group("amenities", "MULTI_SELECT", "MULTIPLE", true, 10, { tj: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, [
            ["wifi", { tj: "Wi-Fi", en: "Wi-Fi", fa: "وای‌فای" }],
            ["wheelchair", { tj: "Дастрасии аробача", en: "Wheelchair Access", fa: "ورودی با ویلچر" }],
            ["parking", { tj: "Истгоҳ", en: "Parking", fa: "پارکینگ" }],
            ["outdoor_seating", { tj: "Ҷойи беруна", en: "Outdoor Seating", fa: "فضای باز" }],
            ["kids_area", { tj: "Ҷойи кӯдакон", en: "Kids Area", fa: "فضای کودک" }],
            ["live_music", { tj: "Мусиқии зинда", en: "Live Music", fa: "موسیقی زنده" }],
            ["card_payment", { tj: "Пардохти кортӣ", en: "Card Payment", fa: "پرداخت کارتی" }],
            ["delivery", { tj: "Расонидан", en: "Delivery", fa: "ارسال" }],
        ]),
        group("atmosphere", "MULTI_SELECT", "MULTIPLE", true, 20, { tj: "Фазо", en: "Atmosphere", fa: "فضای رستوران" }, [
            ["romantic", { tj: "Ошиқона", en: "Romantic", fa: "عاشقانه" }],
            ["calm", { tj: "Ором", en: "Calm", fa: "آرام" }],
            ["modern", { tj: "Муосир", en: "Modern", fa: "مدرن" }],
            ["family", { tj: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
            ["traditional", { tj: "Миллӣ", en: "Traditional", fa: "سنتی" }],
            ["rooftop", { tj: "Бом", en: "Rooftop", fa: "روف‌تاپ" }],
        ]),
        group("cuisine", "MULTI_SELECT", "MULTIPLE", true, 30, { tj: "Навъи хӯрок", en: "Cuisine", fa: "نوع غذا" }, [
            ["tajik", { tj: "Тоҷикӣ", en: "Tajik", fa: "تاجیکی" }],
            ["persian", { tj: "Форсӣ", en: "Persian", fa: "ایرانی" }],
            ["italian", { tj: "Италиявӣ", en: "Italian", fa: "ایتالیایی" }],
            ["turkish", { tj: "Туркӣ", en: "Turkish", fa: "ترکی" }],
            ["fast_food", { tj: "Фастфуд", en: "Fast Food", fa: "فست فود" }],
            ["vegetarian", { tj: "Сабзавотӣ", en: "Vegetarian", fa: "گیاهی" }],
        ]),
        group("capacity", "NUMBER", "SINGLE", false, 40, { tj: "Ғунҷоиш", en: "Capacity", fa: "گنجایش" }, [], "seats"),
        group("price_level", "SELECT", "SINGLE", true, 50, { tj: "Сатҳи нарх", en: "Price Level", fa: "سطح قیمت" }, priceOptions()),
    ],
    beauty_salon: [
        group("amenities", "MULTI_SELECT", "MULTIPLE", true, 10, { tj: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, [
            ["women_only", { tj: "Танҳо занон", en: "Women Only", fa: "ویژه بانوان" }],
            ["private_room", { tj: "Ҳуҷраи хусусӣ", en: "Private Room", fa: "اتاق خصوصی" }],
            ["parking", { tj: "Истгоҳ", en: "Parking", fa: "پارکینگ" }],
            ["online_booking", { tj: "Брон онлайн", en: "Online Booking", fa: "رزرو آنلاین" }],
            ["card_payment", { tj: "Пардохти кортӣ", en: "Card Payment", fa: "پرداخت کارتی" }],
            ["vip_room", { tj: "VIP", en: "VIP Room", fa: "اتاق VIP" }],
        ]),
        group("specialty", "MULTI_SELECT", "MULTIPLE", true, 20, { tj: "Тахассус", en: "Specialty", fa: "تخصص" }, [
            ["hair", { tj: "Мӯй", en: "Hair", fa: "مو" }],
            ["nails", { tj: "Нохун", en: "Nails", fa: "ناخن" }],
            ["makeup", { tj: "Ороиш", en: "Makeup", fa: "آرایش" }],
            ["skincare", { tj: "Пӯст", en: "Skincare", fa: "مراقبت پوست" }],
            ["massage", { tj: "Массаж", en: "Massage", fa: "ماساژ" }],
            ["bridal", { tj: "Арӯсӣ", en: "Bridal", fa: "عروس" }],
        ]),
        group("gender_service", "SELECT", "SINGLE", true, 30, { tj: "Мизоҷон", en: "Client Type", fa: "نوع مراجعین" }, [
            ["women", { tj: "Занон", en: "Women", fa: "بانوان" }],
            ["men", { tj: "Мардон", en: "Men", fa: "آقایان" }],
            ["family", { tj: "Оила", en: "Family", fa: "خانوادگی" }],
        ]),
        group("average_duration", "NUMBER", "SINGLE", false, 40, { tj: "Давомнокӣ", en: "Average Duration", fa: "میانگین زمان خدمات" }, [], "minutes"),
    ],
    hotel: [
        group("amenities", "MULTI_SELECT", "MULTIPLE", true, 10, { tj: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, [
            ["wifi", { tj: "Wi-Fi", en: "Wi-Fi", fa: "وای‌فای" }],
            ["breakfast", { tj: "Наҳорӣ", en: "Breakfast", fa: "صبحانه" }],
            ["parking", { tj: "Истгоҳ", en: "Parking", fa: "پارکینگ" }],
            ["airport_transfer", { tj: "Трансфери фурудгоҳ", en: "Airport Transfer", fa: "ترانسفر فرودگاه" }],
            ["pool", { tj: "Ҳавз", en: "Pool", fa: "استخر" }],
            ["gym", { tj: "Толор", en: "Gym", fa: "باشگاه" }],
            ["restaurant", { tj: "Ресторан", en: "Restaurant", fa: "رستوران" }],
            ["laundry", { tj: "Ландри", en: "Laundry", fa: "خشکشویی" }],
        ]),
        group("room_types", "MULTI_SELECT", "MULTIPLE", true, 20, { tj: "Навъи ҳуҷра", en: "Room Types", fa: "نوع اتاق" }, [
            ["single", { tj: "Якакӣ", en: "Single", fa: "یک‌نفره" }],
            ["double", { tj: "Дунафара", en: "Double", fa: "دونفره" }],
            ["suite", { tj: "Сюит", en: "Suite", fa: "سوئیت" }],
            ["family", { tj: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
            ["apartment", { tj: "Апартамент", en: "Apartment", fa: "آپارتمان" }],
        ]),
        group("hotel_rating", "SELECT", "SINGLE", true, 30, { tj: "Сатҳи меҳмонхона", en: "Hotel Class", fa: "درجه هتل" }, [
            ["three_star", { tj: "3 ситора", en: "3 Stars", fa: "۳ ستاره" }],
            ["four_star", { tj: "4 ситора", en: "4 Stars", fa: "۴ ستاره" }],
            ["five_star", { tj: "5 ситора", en: "5 Stars", fa: "۵ ستاره" }],
            ["boutique", { tj: "Бутик", en: "Boutique", fa: "بوتیک" }],
        ]),
        group("checkin_policy", "TEXT", "SINGLE", false, 40, { tj: "Қоидаи воридшавӣ", en: "Check-in Policy", fa: "قوانین پذیرش" }),
    ],
    sports: [
        group("amenities", "MULTI_SELECT", "MULTIPLE", true, 10, { tj: "Имкониятҳо", en: "Amenities", fa: "امکانات" }, [
            ["locker_room", { tj: "Рахтихона", en: "Locker Room", fa: "رختکن" }],
            ["shower", { tj: "Душ", en: "Shower", fa: "دوش" }],
            ["parking", { tj: "Истгоҳ", en: "Parking", fa: "پارکینگ" }],
            ["personal_trainer", { tj: "Мураббии шахсӣ", en: "Personal Trainer", fa: "مربی خصوصی" }],
            ["group_classes", { tj: "Дарсҳои гурӯҳӣ", en: "Group Classes", fa: "کلاس گروهی" }],
            ["sauna", { tj: "Сауна", en: "Sauna", fa: "سونا" }],
        ]),
        group("sport_type", "MULTI_SELECT", "MULTIPLE", true, 20, { tj: "Навъи варзиш", en: "Sport Type", fa: "نوع ورزش" }, [
            ["fitness", { tj: "Фитнес", en: "Fitness", fa: "فیتنس" }],
            ["yoga", { tj: "Йога", en: "Yoga", fa: "یوگا" }],
            ["swimming", { tj: "Шиноварӣ", en: "Swimming", fa: "شنا" }],
            ["football", { tj: "Футбол", en: "Football", fa: "فوتبال" }],
            ["martial_arts", { tj: "Размӣ", en: "Martial Arts", fa: "رزمی" }],
            ["pilates", { tj: "Пилатес", en: "Pilates", fa: "پیلاتس" }],
        ]),
        group("membership_type", "MULTI_SELECT", "MULTIPLE", true, 30, { tj: "Навъи узвият", en: "Membership Type", fa: "نوع عضویت" }, [
            ["daily", { tj: "Рӯзона", en: "Daily", fa: "روزانه" }],
            ["monthly", { tj: "Моҳона", en: "Monthly", fa: "ماهانه" }],
            ["annual", { tj: "Солона", en: "Annual", fa: "سالانه" }],
            ["family", { tj: "Оилавӣ", en: "Family", fa: "خانوادگی" }],
        ]),
        group("age_group", "MULTI_SELECT", "MULTIPLE", true, 40, { tj: "Гурӯҳи синнӣ", en: "Age Group", fa: "گروه سنی" }, [
            ["adults", { tj: "Калонсолон", en: "Adults", fa: "بزرگسالان" }],
            ["kids", { tj: "Кӯдакон", en: "Kids", fa: "کودکان" }],
            ["women_only", { tj: "Танҳо занон", en: "Women Only", fa: "ویژه بانوان" }],
            ["mixed", { tj: "Омехта", en: "Mixed", fa: "مختلط" }],
        ]),
    ],
};

const AREAS = [
    ["ismoili_somoni", { tj: "Исмоили Сомонӣ", en: "Ismoili Somoni", fa: "اسماعیل سامانی" }],
    ["sino", { tj: "Сино", en: "Sino", fa: "سینا" }],
    ["firdavsi", { tj: "Фирдавсӣ", en: "Firdavsi", fa: "فردوسی" }],
    ["shohmansur", { tj: "Шоҳмансур", en: "Shohmansur", fa: "شاه منصور" }],
    ["rudaki_avenue", { tj: "Хиёбони Рӯдакӣ", en: "Rudaki Avenue", fa: "خیابان رودکی" }],
    ["zarafshon", { tj: "Зарафшон", en: "Zarafshon", fa: "زرافشان" }],
];

const BUSINESSES = [
    biz(
        "rohat-choykhona",
        "restaurant",
        "restaurant_dining",
        "rudaki_avenue",
        "MEDIUM",
        true,
        10,
        "38.5751000",
        "68.7899000",
        {
            tj: ["Чойхонаи Роҳат", "Чойхона бо таомҳои миллии тоҷикӣ.", "Таомҳои хонагӣ, муҳити оилавӣ ва фазои ором дар маркази Душанбе.", "Хиёбони Рӯдакӣ 84"],
            en: ["Rohat Choykhona", "Classic Tajik dining in central Dushanbe.", "Homestyle meals, family atmosphere, and calm traditional interiors.", "84 Rudaki Avenue"],
            fa: ["چایخانه راحت", "رستوران تاجیکی کلاسیک در مرکز دوشنبه.", "غذاهای خانگی، فضای خانوادگی و محیط سنتی آرام.", "خیابان رودکی ۸۴"],
        },
        ["wifi", "parking", "family", "traditional", "tajik", "persian", "mid_range"],
        { capacity: 140 },
    ),
    biz(
        "navruz-cafe",
        "restaurant",
        "cafe",
        "ismoili_somoni",
        "LOW",
        true,
        20,
        "38.5692000",
        "68.7981000",
        {
            tj: ["Қаҳвахонаи Наврӯз", "Қаҳва, шириниҳо ва субҳонаи сабук.", "Кафеи дурахшон барои мулоқот, кор ва истироҳати рӯзона.", "Кӯчаи Теҳрон 12"],
            en: ["Navruz Cafe", "Coffee, pastries, and light breakfast.", "A bright cafe for meetings, remote work, and daytime breaks.", "12 Tehran Street"],
            fa: ["کافه نوروز", "قهوه، شیرینی و صبحانه سبک.", "کافه‌ای روشن برای ملاقات، کار و استراحت روزانه.", "خیابان تهران ۱۲"],
        },
        ["wifi", "card_payment", "modern", "calm", "vegetarian", "budget"],
        { capacity: 60 },
    ),
    biz(
        "tandir-dushanbe",
        "restaurant",
        "cafe_restaurant",
        "sino",
        "MEDIUM",
        false,
        30,
        "38.5530000",
        "68.7482000",
        {
            tj: ["Тандир Душанбе", "Нон, кабоб ва хӯрокҳои танӯрӣ.", "Кафе-ресторан бо танӯри кушода ва менюи гарм барои оилаҳо.", "Ноҳияи Сино, кӯчаи Испечак 21"],
            en: ["Tandir Dushanbe", "Tandoor bread, kebab, and warm meals.", "Cafe restaurant with open tandoor cooking and a family-friendly menu.", "Isphechak Street 21, Sino"],
            fa: ["تندیر دوشنبه", "نان تنوری، کباب و غذاهای گرم.", "کافه رستوران با تنور باز و منوی مناسب خانواده.", "سینا، خیابان اسپیچک ۲۱"],
        },
        ["parking", "kids_area", "traditional", "family", "tajik", "turkish", "mid_range"],
        { capacity: 95 },
    ),
    biz(
        "somon-burger",
        "restaurant",
        "fast_food",
        "firdavsi",
        "LOW",
        true,
        40,
        "38.5365000",
        "68.7797000",
        {
            tj: ["Сомон Бургер", "Бургер ва хӯрокҳои зуд.", "Фастфуди муосир бо бургерҳои калон, картошка ва нӯшокиҳо.", "Фирдавсӣ, кӯчаи Нусратулло Махсум 45"],
            en: ["Somon Burger", "Burgers and quick meals.", "Modern fast food with large burgers, fries, and drinks.", "45 Nusratullo Makhsum Street, Firdavsi"],
            fa: ["سامان برگر", "برگر و غذاهای سریع.", "فست‌فود مدرن با برگرهای بزرگ، سیب‌زمینی و نوشیدنی.", "فردوسی، خیابان نصرت‌الله مخسوم ۴۵"],
        },
        ["delivery", "card_payment", "modern", "fast_food", "budget"],
        { capacity: 45 },
    ),
    biz(
        "rudaki-juice-bar",
        "restaurant",
        "juice_bar",
        "shohmansur",
        "LOW",
        false,
        50,
        "38.5668000",
        "68.8063000",
        {
            tj: ["Афшурабари Рӯдакӣ", "Афшураҳои тару тоза ва смузи.", "Ҷойи сабук барои нӯшокиҳои солим, мева ва шириниҳои рӯзона.", "Шоҳмансур, кӯчаи Айни 9"],
            en: ["Rudaki Juice Bar", "Fresh juices and smoothies.", "A light stop for healthy drinks, fruit bowls, and daytime desserts.", "9 Ayni Street, Shohmansur"],
            fa: ["آبمیوه رودکی", "آبمیوه تازه و اسموتی.", "فضایی سبک برای نوشیدنی سالم، میوه و دسرهای روزانه.", "شاه منصور، خیابان عینی ۹"],
        },
        ["delivery", "vegetarian", "calm", "budget"],
        { capacity: 30 },
    ),

    biz(
        "lola-beauty-studio",
        "beauty_salon",
        "hair_salon",
        "ismoili_somoni",
        "MEDIUM",
        true,
        110,
        "38.5769000",
        "68.7854000",
        {
            tj: [
                "Студияи зебоии Лола",
                "Хизматрасонии мӯй ва нигоҳубини зебоӣ.",
                "Салони муосир барои рангу буриши мӯй, нигоҳубин ва машварати зебоӣ.",
                "Исмоили Сомонӣ, кӯчаи Бохтар 18",
            ],
            en: [
                "Lola Beauty Studio",
                "Hair styling and beauty care.",
                "Modern salon for hair color, cuts, care treatments, and beauty consultation.",
                "18 Bokhtar Street, Ismoili Somoni",
            ],
            fa: ["استودیو زیبایی لولا", "خدمات مو و مراقبت زیبایی.", "سالن مدرن برای رنگ، کوتاهی، مراقبت مو و مشاوره زیبایی.", "اسماعیل سامانی، خیابان باختر ۱۸"],
        },
        ["women_only", "online_booking", "card_payment", "hair", "skincare", "women"],
        { average_duration: 90 },
    ),
    biz(
        "zebo-nails",
        "beauty_salon",
        "nail_studio",
        "rudaki_avenue",
        "MEDIUM",
        false,
        120,
        "38.5717000",
        "68.7875000",
        {
            tj: ["Нохунстудияи Зебо", "Маникюр, педикюр ва тарҳи нохун.", "Студияи тоза ва ором барои хизматрасонии касбии нохун.", "Хиёбони Рӯдакӣ 101"],
            en: ["Zebo Nails", "Manicure, pedicure, and nail art.", "Clean and calm studio for professional nail services.", "101 Rudaki Avenue"],
            fa: ["زیبا نیلز", "مانیکور، پدیکور و طراحی ناخن.", "استودیوی تمیز و آرام برای خدمات حرفه‌ای ناخن.", "خیابان رودکی ۱۰۱"],
        },
        ["women_only", "private_room", "nails", "online_booking", "women"],
        { average_duration: 70 },
    ),
    biz(
        "somon-barber",
        "beauty_salon",
        "barber_shop",
        "sino",
        "LOW",
        true,
        130,
        "38.5483000",
        "68.7557000",
        {
            tj: ["Сомон Барбер", "Сартарошхонаи мардона.", "Барбершоп барои буриши классикӣ, риш ва нигоҳубини рӯзона.", "Сино, кӯчаи Саъдӣ Шерозӣ 6"],
            en: ["Somon Barber", "Men's barber shop.", "Barber shop for classic cuts, beard care, and daily grooming.", "6 Saadi Sherozi Street, Sino"],
            fa: ["سامان باربر", "آرایشگاه مردانه.", "باربرشاپ برای کوتاهی کلاسیک، اصلاح ریش و آراستگی روزانه.", "سینا، خیابان سعدی شیرازی ۶"],
        },
        ["parking", "card_payment", "hair", "men"],
        { average_duration: 45 },
    ),
    biz(
        "gulnoz-spa",
        "beauty_salon",
        "spa",
        "zarafshon",
        "HIGH",
        true,
        140,
        "38.5892000",
        "68.7371000",
        {
            tj: ["Спа Гулноз", "Спа ва истироҳати бадан.", "Фазои ором барои массаж, нигоҳубини пӯст ва барқарорсозии энергия.", "Зарафшон, кӯчаи Ҳофиз 14"],
            en: ["Gulnoz Spa", "Spa and body relaxation.", "Calm space for massage, skincare, and energy recovery.", "14 Hofiz Street, Zarafshon"],
            fa: ["اسپا گلنوز", "اسپا و آرامش بدن.", "فضایی آرام برای ماساژ، مراقبت پوست و بازیابی انرژی.", "زرافشان، خیابان حافظ ۱۴"],
        },
        ["private_room", "vip_room", "massage", "skincare", "women", "family"],
        { average_duration: 120 },
    ),
    biz(
        "orzu-makeup",
        "beauty_salon",
        "makeup_studio",
        "shohmansur",
        "HIGH",
        false,
        150,
        "38.5621000",
        "68.8112000",
        {
            tj: ["Ороиши Орзу", "Ороиши касбӣ ва арӯсӣ.", "Студияи махсус барои ороиши чорабинӣ, арӯсӣ ва фотосессия.", "Шоҳмансур, кӯчаи Мирзо Турсунзода 27"],
            en: ["Orzu Makeup", "Professional and bridal makeup.", "Dedicated studio for event, bridal, and photoshoot makeup.", "27 Mirzo Tursunzoda Street, Shohmansur"],
            fa: ["آرایش اورزو", "آرایش حرفه‌ای و عروس.", "استودیو تخصصی برای آرایش مراسم، عروس و عکاسی.", "شاه منصور، خیابان میرزا تورسون‌زاده ۲۷"],
        },
        ["online_booking", "vip_room", "makeup", "bridal", "women"],
        { average_duration: 110 },
    ),

    biz(
        "dushanbe-grand-hotel",
        "hotel",
        "hotel_standard",
        "ismoili_somoni",
        "HIGH",
        true,
        210,
        "38.5744000",
        "68.7869000",
        {
            tj: ["Душанбе Гранд Ҳотел", "Меҳмонхонаи бароҳат дар марказ.", "Ҳуҷраҳои васеъ, наҳорӣ ва дастрасии осон ба маркази шаҳр.", "Исмоили Сомонӣ, хиёбони Рӯдакӣ 30"],
            en: ["Dushanbe Grand Hotel", "Comfort hotel in the center.", "Spacious rooms, breakfast, and easy access to the city center.", "30 Rudaki Avenue, Ismoili Somoni"],
            fa: ["هتل گرند دوشنبه", "هتل راحت در مرکز شهر.", "اتاق‌های بزرگ، صبحانه و دسترسی آسان به مرکز شهر.", "اسماعیل سامانی، خیابان رودکی ۳۰"],
        },
        ["wifi", "breakfast", "parking", "airport_transfer", "restaurant", "double", "suite", "four_star"],
        { checkin_policy: "Check-in 14:00, check-out 12:00." },
    ),
    biz(
        "rudaki-boutique-hotel",
        "hotel",
        "boutique_hotel",
        "rudaki_avenue",
        "HIGH",
        true,
        220,
        "38.5802000",
        "68.7914000",
        {
            tj: ["Бутик Ҳотели Рӯдакӣ", "Иқомати зебо бо тарҳи маҳаллӣ.", "Меҳмонхонаи хурди боҳашамат бо ҳуҷраҳои зебо ва хизматрасонии шахсӣ.", "Хиёбони Рӯдакӣ 118"],
            en: ["Rudaki Boutique Hotel", "Stylish stay with local design.", "Small premium hotel with refined rooms and personal service.", "118 Rudaki Avenue"],
            fa: ["بوتیک هتل رودکی", "اقامت شیک با طراحی محلی.", "هتل کوچک لوکس با اتاق‌های زیبا و خدمات اختصاصی.", "خیابان رودکی ۱۱۸"],
        },
        ["wifi", "breakfast", "laundry", "double", "suite", "boutique"],
        { checkin_policy: "Reception is open 24 hours." },
    ),
    biz(
        "somon-guest-house",
        "hotel",
        "guest_house",
        "firdavsi",
        "LOW",
        false,
        230,
        "38.5354000",
        "68.7749000",
        {
            tj: ["Меҳмонхонаи Сомон", "Иқомати иқтисодӣ ва оилавӣ.", "Меҳмонхоначаи тоза бо утоқҳои дастрас барои сафарҳои кӯтоҳ.", "Фирдавсӣ, кӯчаи Ҷомӣ 19"],
            en: ["Somon Guest House", "Budget and family stay.", "Clean guest house with affordable rooms for short trips.", "19 Jomi Street, Firdavsi"],
            fa: ["مهمان‌خانه سامان", "اقامت اقتصادی و خانوادگی.", "مهمان‌خانه‌ای تمیز با اتاق‌های مناسب سفر کوتاه.", "فردوسی، خیابان جامی ۱۹"],
        },
        ["wifi", "parking", "single", "double", "family", "three_star"],
        { checkin_policy: "Late check-in is available by phone." },
    ),
    biz(
        "pamir-hostel",
        "hotel",
        "hostel",
        "sino",
        "LOW",
        true,
        240,
        "38.5529000",
        "68.7593000",
        {
            tj: ["Хостели Помир", "Хостели ҷавон ва дастрас.", "Ҷойи иҷтимоӣ барои сайёҳон бо ошхонаи муштарак ва утоқҳои тоза.", "Сино, кӯчаи Ниёзбек 5"],
            en: ["Pamir Hostel", "Young and affordable hostel.", "Social place for travelers with shared kitchen and clean dorms.", "5 Niyozbek Street, Sino"],
            fa: ["هاستل پامیر", "هاستل جوان و مقرون‌به‌صرفه.", "فضایی اجتماعی برای گردشگران با آشپزخانه مشترک و اتاق‌های تمیز.", "سینا، خیابان نیازبک ۵"],
        },
        ["wifi", "laundry", "single", "double", "budget"],
        { checkin_policy: "Shared rooms require valid ID." },
    ),
    biz(
        "atlas-apart-hotel",
        "hotel",
        "apartment_hotel",
        "zarafshon",
        "MEDIUM",
        false,
        250,
        "38.5904000",
        "68.7409000",
        {
            tj: ["Атлас Апарт Ҳотел", "Апартаментҳо барои иқомати дароз.", "Ҳуҷраҳои апартаментӣ бо ошхона, коргоҳ ва шароити зиндагии дарозмуддат.", "Зарафшон, кӯчаи Сомонӣ 40"],
            en: ["Atlas Apart Hotel", "Apartments for longer stays.", "Apartment-style rooms with kitchen, desk, and long-stay comfort.", "40 Somoni Street, Zarafshon"],
            fa: ["اطلس آپارت هتل", "آپارتمان برای اقامت طولانی.", "اتاق‌های آپارتمانی با آشپزخانه، میز کار و امکانات اقامت طولانی.", "زرافشان، خیابان سامانی ۴۰"],
        },
        ["wifi", "parking", "laundry", "apartment", "family", "four_star"],
        { checkin_policy: "Weekly stays include cleaning service." },
    ),

    biz(
        "fitlife-dushanbe",
        "sports",
        "gym",
        "firdavsi",
        "MEDIUM",
        true,
        310,
        "38.5417000",
        "68.7818000",
        {
            tj: ["FitLife Душанбе", "Фитнес ва машқҳои қувватӣ.", "Толори муҷаҳҳаз бо тренерҳои шахсӣ ва барномаҳои гурӯҳӣ.", "Фирдавсӣ, кӯчаи Варзишгарон 8"],
            en: ["FitLife Dushanbe", "Fitness and strength training.", "Equipped gym with personal trainers and group programs.", "8 Varzishgaron Street, Firdavsi"],
            fa: ["فیت‌لایف دوشنبه", "فیتنس و تمرین قدرتی.", "باشگاه مجهز با مربی خصوصی و برنامه‌های گروهی.", "فردوسی، خیابان ورزشکاران ۸"],
        },
        ["locker_room", "shower", "personal_trainer", "group_classes", "fitness", "monthly", "adults", "mixed"],
        {},
    ),
    biz(
        "yoga-rudaki",
        "sports",
        "yoga_studio",
        "rudaki_avenue",
        "MEDIUM",
        false,
        320,
        "38.5788000",
        "68.7902000",
        {
            tj: ["Йога Рӯдакӣ", "Студияи йога ва пилатес.", "Классҳои ором барои йога, нафаскашӣ ва ҳаракати солим.", "Хиёбони Рӯдакӣ 76"],
            en: ["Yoga Rudaki", "Yoga and pilates studio.", "Calm classes for yoga, breathing, and healthy movement.", "76 Rudaki Avenue"],
            fa: ["یوگا رودکی", "استودیو یوگا و پیلاتس.", "کلاس‌های آرام برای یوگا، تنفس و حرکت سالم.", "خیابان رودکی ۷۶"],
        },
        ["group_classes", "shower", "yoga", "pilates", "monthly", "women_only", "adults"],
        {},
    ),
    biz(
        "somon-swim-club",
        "sports",
        "swimming_pool",
        "sino",
        "MEDIUM",
        true,
        330,
        "38.5559000",
        "68.7515000",
        {
            tj: ["Клуби шиноварии Сомон", "Ҳавз ва омӯзиши шиноварӣ.", "Ҳавзи тоза бо мураббиён барои кӯдакон ва калонсолон.", "Сино, кӯчаи Обӣ 3"],
            en: ["Somon Swim Club", "Pool and swimming lessons.", "Clean pool with coaches for children and adults.", "3 Obi Street, Sino"],
            fa: ["باشگاه شنای سامان", "استخر و آموزش شنا.", "استخر تمیز با مربی برای کودکان و بزرگسالان.", "سینا، خیابان آبی ۳"],
        },
        ["locker_room", "shower", "personal_trainer", "swimming", "kids", "adults", "monthly"],
        {},
    ),
    biz(
        "varzish-arena",
        "sports",
        "sports_complex",
        "shohmansur",
        "HIGH",
        true,
        340,
        "38.5617000",
        "68.8156000",
        {
            tj: ["Варзиш Арена", "Маҷмааи варзишӣ барои чанд намуди машқ.", "Майдонҳо, толорҳо ва барномаҳои гурӯҳӣ барои дастаҳо ва оилаҳо.", "Шоҳмансур, кӯчаи Спитамен 33"],
            en: ["Varzish Arena", "Multi-sport complex.", "Fields, halls, and group programs for teams and families.", "33 Spitamen Street, Shohmansur"],
            fa: ["ورزش آرنا", "مجموعه ورزشی چندمنظوره.", "زمین‌ها، سالن‌ها و برنامه‌های گروهی برای تیم‌ها و خانواده‌ها.", "شاه منصور، خیابان اسپیتامن ۳۳"],
        },
        ["parking", "locker_room", "shower", "football", "fitness", "family", "annual"],
        {},
    ),
    biz(
        "pamir-martial-arts",
        "sports",
        "martial_arts_club",
        "zarafshon",
        "LOW",
        false,
        350,
        "38.5875000",
        "68.7432000",
        {
            tj: ["Клуби размии Помир", "Карате, дзюдо ва машқҳои размӣ.", "Клуби омӯзишӣ барои кӯдакон ва калонсолон бо мураббиёни таҷрибадор.", "Зарафшон, кӯчаи Рашт 11"],
            en: ["Pamir Martial Arts", "Karate, judo, and combat training.", "Training club for kids and adults with experienced coaches.", "11 Rasht Street, Zarafshon"],
            fa: ["هنرهای رزمی پامیر", "کاراته، جودو و تمرین رزمی.", "باشگاه آموزشی برای کودکان و بزرگسالان با مربیان باتجربه.", "زرافشان، خیابان رشت ۱۱"],
        },
        ["locker_room", "group_classes", "martial_arts", "kids", "adults", "monthly"],
        {},
    ),
];

function group(code, fieldType, selectionMode, showInFilters, displayOrder, title, options = [], unit = null) {
    return { code, fieldType, selectionMode, showInFilters, displayOrder, title, options, unit };
}

function priceOptions() {
    return [
        ["budget", { tj: "Иқтисодӣ", en: "Budget", fa: "اقتصادی" }],
        ["mid_range", { tj: "Миёна", en: "Mid Range", fa: "متوسط" }],
        ["premium", { tj: "Премиум", en: "Premium", fa: "لوکس" }],
    ];
}

function biz(slug, parentCode, childCode, areaCode, economicLevel, isFeatured, displayOrder, latitude, longitude, translations, attributeKeys, values) {
    return { slug, parentCode, childCode, areaCode, economicLevel, isFeatured, displayOrder, latitude, longitude, translations, attributeKeys, values };
}

async function seedLanguages() {
    for (const language of LANGUAGES) {
        await prisma.language.upsert({
            where: { code: language.code },
            update: { name: language.name, nativeName: language.nativeName, direction: language.direction, isActive: true, isDefault: language.isDefault },
            create: { ...language, isActive: true },
        });
    }
}

async function upsertServiceType(item, parentId = null) {
    const serviceType = await prisma.serviceType.upsert({
        where: { code: item.code },
        update: {
            parentId,
            title: item.title.en,
            description: item.description?.en ?? null,
            color: item.color ?? null,
            displayOrder: item.order,
            isActive: true,
        },
        create: {
            parentId,
            code: item.code,
            title: item.title.en,
            description: item.description?.en ?? null,
            color: item.color ?? null,
            displayOrder: item.order,
            isActive: true,
        },
    });

    for (const lang of Object.keys(item.title)) {
        await prisma.serviceTypeTranslation.upsert({
            where: { serviceTypeId_lang: { serviceTypeId: serviceType.id, lang } },
            update: { title: item.title[lang], description: item.description?.[lang] ?? null, isActive: true },
            create: { serviceTypeId: serviceType.id, lang, title: item.title[lang], description: item.description?.[lang] ?? null, isActive: true },
        });
    }

    return serviceType;
}

async function seedServiceTypes() {
    const serviceTypes = new Map();
    for (const item of SERVICE_TYPES) {
        const parent = await upsertServiceType(item);
        serviceTypes.set(item.code, parent);
        let childOrder = item.order + 1;
        for (const [code, title] of item.children) {
            const child = await upsertServiceType(
                {
                    code,
                    title,
                    description: item.description,
                    color: item.color,
                    order: childOrder,
                },
                parent.id,
            );
            serviceTypes.set(code, child);
            childOrder += 1;
        }
    }
    return serviceTypes;
}

async function seedAttributeGroups(serviceTypes) {
    const optionsByKey = new Map();
    const groupsByCode = new Map();

    for (const [serviceTypeCode, groups] of Object.entries(ATTRIBUTE_GROUPS)) {
        const serviceType = serviceTypes.get(serviceTypeCode);
        for (const item of groups) {
            const groupRecord = await prisma.attributeGroup.upsert({
                where: { serviceTypeId_code: { serviceTypeId: serviceType.id, code: item.code } },
                update: {
                    title: item.title.en,
                    fieldType: item.fieldType,
                    selectionMode: item.selectionMode,
                    unit: item.unit,
                    showInFilters: item.showInFilters,
                    displayOrder: item.displayOrder,
                    isActive: true,
                },
                create: {
                    serviceTypeId: serviceType.id,
                    code: item.code,
                    title: item.title.en,
                    fieldType: item.fieldType,
                    selectionMode: item.selectionMode,
                    unit: item.unit,
                    showInFilters: item.showInFilters,
                    displayOrder: item.displayOrder,
                    isActive: true,
                },
            });
            groupsByCode.set(`${serviceTypeCode}:${item.code}`, groupRecord);

            for (const lang of Object.keys(item.title)) {
                await prisma.attributeGroupTranslation.upsert({
                    where: { groupId_lang: { groupId: groupRecord.id, lang } },
                    update: { title: item.title[lang], isActive: true },
                    create: { groupId: groupRecord.id, lang, title: item.title[lang], isActive: true },
                });
            }

            let order = 10;
            for (const [key, title] of item.options) {
                const option = await prisma.attributeOption.upsert({
                    where: { groupId_key: { groupId: groupRecord.id, key } },
                    update: { title: title.en, displayOrder: order, isActive: true },
                    create: { groupId: groupRecord.id, key, title: title.en, displayOrder: order, isActive: true },
                });
                optionsByKey.set(`${serviceTypeCode}:${key}`, option);
                for (const lang of Object.keys(title)) {
                    await prisma.attributeOptionTranslation.upsert({
                        where: { optionId_lang: { optionId: option.id, lang } },
                        update: { title: title[lang], isActive: true },
                        create: { optionId: option.id, lang, title: title[lang], isActive: true },
                    });
                }
                order += 10;
            }
        }
    }

    return { optionsByKey, groupsByCode };
}

async function seedLocation() {
    const country = await prisma.country.upsert({
        where: { code: "TJ" },
        update: { title: "Tajikistan", phoneCode: "+992", displayOrder: 10, isActive: true },
        create: { code: "TJ", title: "Tajikistan", phoneCode: "+992", displayOrder: 10, isActive: true },
    });
    const countryTitles = { tj: "Тоҷикистон", en: "Tajikistan", fa: "تاجیکستان" };
    for (const lang of Object.keys(countryTitles)) {
        await prisma.countryTranslation.upsert({
            where: { countryId_lang: { countryId: country.id, lang } },
            update: { title: countryTitles[lang], isActive: true },
            create: { countryId: country.id, lang, title: countryTitles[lang], isActive: true },
        });
    }

    const city = await prisma.city.upsert({
        where: { countryId_code: { countryId: country.id, code: "dushanbe" } },
        update: { title: "Dushanbe", latitude: "38.5598000", longitude: "68.7870000", displayOrder: 10, isActive: true },
        create: { countryId: country.id, code: "dushanbe", title: "Dushanbe", latitude: "38.5598000", longitude: "68.7870000", displayOrder: 10, isActive: true },
    });
    const cityTitles = { tj: "Душанбе", en: "Dushanbe", fa: "دوشنبه" };
    for (const lang of Object.keys(cityTitles)) {
        await prisma.cityTranslation.upsert({
            where: { cityId_lang: { cityId: city.id, lang } },
            update: { title: cityTitles[lang], isActive: true },
            create: { cityId: city.id, lang, title: cityTitles[lang], isActive: true },
        });
    }

    const areas = new Map();
    let areaOrder = 10;
    for (const [code, title] of AREAS) {
        const area = await prisma.area.upsert({
            where: { cityId_code: { cityId: city.id, code } },
            update: { title: title.en, displayOrder: areaOrder, isActive: true },
            create: { cityId: city.id, code, title: title.en, displayOrder: areaOrder, isActive: true },
        });
        areas.set(code, area);
        for (const lang of Object.keys(title)) {
            await prisma.areaTranslation.upsert({
                where: { areaId_lang: { areaId: area.id, lang } },
                update: { title: title[lang], isActive: true },
                create: { areaId: area.id, lang, title: title[lang], isActive: true },
            });
        }
        areaOrder += 10;
    }

    return { country, city, areas };
}

async function clearBusinessDetails(businessId) {
    await prisma.businessOffering.deleteMany({ where: { businessId } });
    await prisma.businessOfferingCategory.deleteMany({ where: { businessId } });
    await prisma.businessContactLink.deleteMany({ where: { businessId } });
    await prisma.businessWorkingHour.deleteMany({ where: { businessId } });
    await prisma.businessAttribute.deleteMany({ where: { businessId } });
    await prisma.businessAttributeValue.deleteMany({ where: { businessId } });
}

async function seedBusinesses(serviceTypes, location, attributes) {
    const now = new Date();
    const reviewUsers = await seedReviewUsers();

    for (const item of BUSINESSES) {
        const serviceType = serviceTypes.get(item.childCode);
        const area = location.areas.get(item.areaCode);
        const business = await prisma.business.upsert({
            where: { slug: item.slug },
            update: {
                serviceTypeId: serviceType.id,
                countryId: location.country.id,
                cityId: location.city.id,
                areaId: area.id,
                logoImage: null,
                coverImage: null,
                verticalImage: null,
                phone: "+992 90 100 20 30",
                email: `${item.slug}@demo.devor.local`,
                website: `https://demo.devor.local/${item.slug}`,
                latitude: item.latitude,
                longitude: item.longitude,
                economicLevel: item.economicLevel,
                operationMode: "SHOWCASE",
                publicationStatus: "PUBLISHED",
                submittedAt: now,
                reviewedAt: now,
                publishedAt: now,
                reviewNote: null,
                displayOrder: item.displayOrder,
                isActive: true,
                isFeatured: item.isFeatured,
                showInLatest: true,
            },
            create: {
                slug: item.slug,
                serviceTypeId: serviceType.id,
                countryId: location.country.id,
                cityId: location.city.id,
                areaId: area.id,
                phone: "+992 90 100 20 30",
                email: `${item.slug}@demo.devor.local`,
                website: `https://demo.devor.local/${item.slug}`,
                latitude: item.latitude,
                longitude: item.longitude,
                economicLevel: item.economicLevel,
                operationMode: "SHOWCASE",
                publicationStatus: "PUBLISHED",
                submittedAt: now,
                reviewedAt: now,
                publishedAt: now,
                displayOrder: item.displayOrder,
                isActive: true,
                isFeatured: item.isFeatured,
                showInLatest: true,
            },
        });

        await clearBusinessDetails(business.id);
        for (const [lang, values] of Object.entries(item.translations)) {
            await prisma.businessTranslation.upsert({
                where: { businessId_lang: { businessId: business.id, lang } },
                update: { title: values[0], summary: values[1], description: values[2], address: values[3], isActive: true },
                create: { businessId: business.id, lang, title: values[0], summary: values[1], description: values[2], address: values[3], isActive: true },
            });
        }

        await seedBusinessDetails(business, item, attributes);
        await seedOfferings(business, item.parentCode);
        await seedReviews(business, reviewUsers, item.displayOrder);
    }
}

async function seedBusinessDetails(business, item, attributes) {
    await prisma.businessContactLink.createMany({
        data: [
            { businessId: business.id, type: "PHONE", label: "Phone", value: business.phone, displayOrder: 10, isPrimary: true, isActive: true },
            { businessId: business.id, type: "WHATSAPP", label: "WhatsApp", value: business.phone, url: "https://wa.me/992901002030", displayOrder: 20, isActive: true },
            {
                businessId: business.id,
                type: "INSTAGRAM",
                label: "Instagram",
                value: `@${item.slug.replace(/-/g, "_")}`,
                url: `https://instagram.com/${item.slug.replace(/-/g, "_")}`,
                displayOrder: 30,
                isActive: true,
            },
            { businessId: business.id, type: "WEBSITE", label: "Website", value: business.website, url: business.website, displayOrder: 40, isActive: true },
        ],
    });

    const hours = workingHoursFor(item.parentCode).map((row, index) => ({ businessId: business.id, ...row, displayOrder: (index + 1) * 10 }));
    await prisma.businessWorkingHour.createMany({ data: hours });

    const optionIds = item.attributeKeys.map((key) => attributes.optionsByKey.get(`${item.parentCode}:${key}`)?.id).filter(Boolean);
    if (optionIds.length) {
        await prisma.businessAttribute.createMany({
            data: optionIds.map((attributeOptionId) => ({ businessId: business.id, attributeOptionId })),
            skipDuplicates: true,
        });
    }

    const valueData = [];
    for (const [code, value] of Object.entries(item.values || {})) {
        const groupRecord = attributes.groupsByCode.get(`${item.parentCode}:${code}`);
        if (!groupRecord) continue;
        const base = { businessId: business.id, groupId: groupRecord.id };
        if (typeof value === "number") valueData.push({ ...base, numberValue: value });
        else if (typeof value === "boolean") valueData.push({ ...base, booleanValue: value });
        else valueData.push({ ...base, textValue: String(value) });
    }
    if (valueData.length) await prisma.businessAttributeValue.createMany({ data: valueData });
}

function workingHoursFor(parentCode) {
    const days = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const ranges = {
        restaurant: ["09:00", "23:00"],
        beauty_salon: ["10:00", "20:00"],
        hotel: ["00:00", "23:59"],
        sports: ["06:00", "22:00"],
    };
    const [opensAt, closesAt] = ranges[parentCode] || ["09:00", "21:00"];
    return days.map((dayOfWeek) => ({ dayOfWeek, opensAt, closesAt, isClosed: false }));
}

async function seedOfferings(business, parentCode) {
    const templates = OFFERING_TEMPLATES[parentCode] || OFFERING_TEMPLATES.restaurant;
    const categories = new Map();
    for (const item of templates.categories) {
        const category = await prisma.businessOfferingCategory.create({
            data: { businessId: business.id, title: item.title.en, displayOrder: item.order, isActive: true },
        });
        categories.set(item.key, category);
        for (const [lang, title] of Object.entries(item.title)) {
            await prisma.businessOfferingCategoryTranslation.create({ data: { categoryId: category.id, lang, title, isActive: true } });
        }
    }

    for (const item of templates.items) {
        const offering = await prisma.businessOffering.create({
            data: {
                businessId: business.id,
                categoryId: categories.get(item.category)?.id ?? null,
                title: item.title.en,
                basePrice: item.price,
                preparationMinutes: item.minutes ?? null,
                isFeatured: item.featured ?? false,
                isPopular: item.popular ?? false,
                displayOrder: item.order,
                isActive: true,
            },
        });
        for (const [lang, title] of Object.entries(item.title)) {
            await prisma.businessOfferingTranslation.create({
                data: {
                    offeringId: offering.id,
                    lang,
                    title,
                    shortDescription: item.shortDescription?.[lang] ?? null,
                    description: item.description?.[lang] ?? null,
                    isActive: true,
                },
            });
        }
    }
}

const OFFERING_TEMPLATES = {
    restaurant: {
        categories: [
            { key: "main", order: 10, title: { tj: "Таомҳои асосӣ", en: "Main Dishes", fa: "غذاهای اصلی" } },
            { key: "drink", order: 20, title: { tj: "Нӯшокиҳо", en: "Drinks", fa: "نوشیدنی‌ها" } },
        ],
        items: [
            offering("main", 10, 58, 25, true, "Оши палав", "Tajik Plov", "پلو تاجیکی"),
            offering("main", 20, 42, 20, false, "Шашлик", "Shashlik", "ششلیک"),
            offering("drink", 30, 18, 5, false, "Чойи сабз", "Green Tea", "چای سبز"),
        ],
    },
    beauty_salon: {
        categories: [
            { key: "hair", order: 10, title: { tj: "Мӯй", en: "Hair", fa: "مو" } },
            { key: "care", order: 20, title: { tj: "Нигоҳубин", en: "Care", fa: "مراقبت" } },
        ],
        items: [
            offering("hair", 10, 120, 60, true, "Буриши мӯй", "Haircut", "کوتاهی مو"),
            offering("hair", 20, 260, 120, false, "Ранг кардани мӯй", "Hair Color", "رنگ مو"),
            offering("care", 30, 180, 70, false, "Нигоҳубини пӯст", "Skin Care", "مراقبت پوست"),
        ],
    },
    hotel: {
        categories: [
            { key: "rooms", order: 10, title: { tj: "Ҳуҷраҳо", en: "Rooms", fa: "اتاق‌ها" } },
            { key: "packages", order: 20, title: { tj: "Пакетҳо", en: "Packages", fa: "پکیج‌ها" } },
        ],
        items: [
            offering("rooms", 10, 480, null, true, "Ҳуҷраи дунафара", "Double Room", "اتاق دونفره"),
            offering("rooms", 20, 780, null, false, "Сюит", "Suite", "سوئیت"),
            offering("packages", 30, 150, null, false, "Наҳорӣ", "Breakfast", "صبحانه"),
        ],
    },
    sports: {
        categories: [
            { key: "membership", order: 10, title: { tj: "Узвият", en: "Membership", fa: "عضویت" } },
            { key: "classes", order: 20, title: { tj: "Классҳо", en: "Classes", fa: "کلاس‌ها" } },
        ],
        items: [
            offering("membership", 10, 220, null, true, "Узвияти моҳона", "Monthly Membership", "عضویت ماهانه"),
            offering("membership", 20, 35, null, false, "Воридшавии якрӯза", "Day Pass", "ورودی روزانه"),
            offering("classes", 30, 65, 60, false, "Класси гурӯҳӣ", "Group Class", "کلاس گروهی"),
        ],
    },
};

function offering(category, order, price, minutes, featured, tj, en, fa) {
    return {
        category,
        order,
        price,
        minutes,
        featured,
        title: { tj, en, fa },
        shortDescription: {
            tj: "Маводи намунавӣ барои санҷиши каталог.",
            en: "Demo catalog item for testing.",
            fa: "آیتم نمایشی برای تست کاتالوگ.",
        },
        description: {
            tj: "Ин آیтем барои санҷиши намоиши хизматрасонӣ ва маҳсулот дар панел ва اپلیکیشن илова шудааст.",
            en: "This item is added to test service and product presentation in the panel and app.",
            fa: "این آیتم برای تست نمایش خدمات و محصولات در پنل و اپلیکیشن اضافه شده است.",
        },
    };
}

async function seedReviewUsers() {
    const users = [];
    for (let index = 1; index <= 4; index += 1) {
        users.push(
            await prisma.appUser.upsert({
                where: { phone: `+99290000000${index}` },
                update: { firstName: `Demo ${index}`, lastName: "User", countryCode: "TJ", phoneCode: "+992", isActive: true },
                create: { phone: `+99290000000${index}`, firstName: `Demo ${index}`, lastName: "User", countryCode: "TJ", phoneCode: "+992", isActive: true },
            }),
        );
    }
    return users;
}

async function seedReviews(business, users, offset) {
    const ratings = ["4.20", "4.50", "4.70", "4.80"];
    for (let index = 0; index < users.length; index += 1) {
        await prisma.businessReview.upsert({
            where: { businessId_appUserId: { businessId: business.id, appUserId: users[index].id } },
            update: { rating: ratings[(index + offset) % ratings.length], comment: "Demo review for UI testing.", isActive: true },
            create: {
                businessId: business.id,
                appUserId: users[index].id,
                rating: ratings[(index + offset) % ratings.length],
                comment: "Demo review for UI testing.",
                isActive: true,
            },
        });
    }
}

async function main() {
    await seedLanguages();
    const serviceTypes = await seedServiceTypes();
    const attributes = await seedAttributeGroups(serviceTypes);
    const location = await seedLocation();
    await seedBusinesses(serviceTypes, location, attributes);
    console.log("Tajikistan demo marketplace seed completed.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
