const dotenv = require("dotenv");
const { PrismaClient } = require("../src/generated/prisma-client");

dotenv.config();

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const validateOnly = process.argv.includes("--validate-only");

const option = (code, title, config = {}) => ({ code, title, ...config });

const attribute = (code, title, type, config = {}) => ({
  code,
  title,
  type,
  ...config,
});

const select = (code, title, options, config = {}) =>
  attribute(code, title, "SELECT", { options, ...config });

const multiSelect = (code, title, options, config = {}) =>
  attribute(code, title, "MULTI_SELECT", { options, ...config });

const text = (code, title, config = {}) =>
  attribute(code, title, "TEXT", config);

const number = (code, title, config = {}) =>
  attribute(code, title, "NUMBER", config);

const boolean = (code, title, config = {}) =>
  attribute(code, title, "BOOLEAN", config);

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

const FUEL_OPTIONS = [
  option("gasoline", "بنزین"),
  option("diesel", "دیزل"),
  option("hybrid", "هیبرید"),
  option("electric", "برقی"),
  option("gas", "گاز"),
];

// The category codes below match the 10 categories currently published by api.devor.app.
// Common fields live on parent categories and are inherited by their children.
const ATTRIBUTE_SETS = [
  {
    categoryCode: "real-state",
    categoryTitle: "املاک",
    attributes: [
      number("property_area", "متراژ", {
        unit: "متر مربع",
        isRequired: true,
        showInFilters: true,
        minValue: 1,
        maxValue: 1000000,
      }),
      select("bedrooms", "تعداد اتاق", BEDROOM_OPTIONS, {
        isRequired: true,
        showInFilters: true,
      }),
      number("construction_year", "سال ساخت", {
        showInFilters: true,
        minValue: 1900,
        maxValue: 2100,
      }),
      number("floor", "طبقه", {
        showInFilters: true,
        minValue: -5,
        maxValue: 100,
      }),
      boolean("elevator", "آسانسور", { showInFilters: true }),
      boolean("parking", "پارکینگ", { showInFilters: true }),
      multiSelect(
        "amenities",
        "امکانات",
        [
          option("storage", "انباری"),
          option("balcony", "بالکن"),
          option("security", "نگهبانی"),
          option("central-heating", "سیستم گرمایش مرکزی"),
        ],
        { showInFilters: true },
      ),
    ],
  },
  {
    categoryCode: "rent-residential",
    categoryTitle: "اجاره مسکونی",
    attributes: [
      number("deposit", "ودیعه", {
        unit: "سامانی",
        showInFilters: true,
        minValue: 0,
      }),
      boolean("furnished", "مبله", { showInFilters: true }),
      select(
        "rental_period",
        "دوره اجاره",
        [
          option("monthly", "ماهانه"),
          option("yearly", "سالانه"),
          option("negotiable", "توافقی"),
        ],
        { showInFilters: true },
      ),
    ],
  },
  {
    categoryCode: "buy-residential",
    categoryTitle: "فروش مسکونی",
    attributes: [
      select("deed_type", "نوع سند", DEED_OPTIONS, {
        showInFilters: true,
      }),
      number("land_area", "مساحت زمین", {
        unit: "متر مربع",
        showInFilters: true,
        minValue: 1,
        maxValue: 1000000,
      }),
    ],
  },
  {
    categoryCode: "vehicles",
    categoryTitle: "خودرو",
    attributes: [
      select("condition", "وضعیت", CONDITION_OPTIONS, {
        isRequired: true,
        showInFilters: true,
      }),
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
    ],
  },
  {
    categoryCode: "car",
    categoryTitle: "سواری و وانت",
    attributes: [
      select(
        "car_brand",
        "برند",
        [
          option("toyota", "تویوتا"),
          option("hyundai", "هیوندای"),
          option("mercedes-benz", "مرسدس بنز"),
          option("bmw", "بی‌ام‌و"),
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
          option("c-class", "کلاس C", {
            parentOptionCode: "mercedes-benz",
          }),
          option("e-class", "کلاس E", {
            parentOptionCode: "mercedes-benz",
          }),
          option("3-series", "سری 3", { parentOptionCode: "bmw" }),
          option("x5", "X5", { parentOptionCode: "bmw" }),
          option("rio", "ریو", { parentOptionCode: "kia" }),
          option("sportage", "اسپورتیج", { parentOptionCode: "kia" }),
          option("niva", "نیوا", { parentOptionCode: "lada" }),
          option("tiggo-7", "تیگو 7", { parentOptionCode: "chery" }),
          option("song-plus", "Song Plus", { parentOptionCode: "byd" }),
          option("other-model", "سایر", { parentOptionCode: "other" }),
        ],
        {
          dependsOnCode: "car_brand",
          isRequired: true,
          showInFilters: true,
        },
      ),
      select(
        "gearbox",
        "گیربکس",
        [option("automatic", "اتوماتیک"), option("manual", "دستی")],
        { showInFilters: true },
      ),
      select("fuel", "نوع سوخت", FUEL_OPTIONS, { showInFilters: true }),
      multiSelect(
        "car_features",
        "امکانات",
        [
          option("air-conditioner", "تهویه مطبوع"),
          option("abs", "ترمز ABS"),
          option("airbags", "کیسه هوا"),
          option("sunroof", "سانروف"),
          option("rear-camera", "دوربین عقب"),
        ],
        { showInFilters: true },
      ),
    ],
  },
  {
    categoryCode: "heavy-car",
    categoryTitle: "سنگین",
    attributes: [
      select(
        "heavy_vehicle_type",
        "نوع وسیله نقلیه",
        [
          option("truck", "کامیون"),
          option("tractor", "کشنده"),
          option("bus", "اتوبوس"),
          option("minibus", "مینی‌بوس"),
          option("construction", "ماشین‌آلات راه‌سازی"),
        ],
        { isRequired: true, showInFilters: true },
      ),
      text("brand", "برند", { isRequired: true, maxLength: 80 }),
      number("load_capacity", "ظرفیت بار", {
        unit: "تن",
        showInFilters: true,
        minValue: 0,
        maxValue: 100,
      }),
      select("fuel", "نوع سوخت", FUEL_OPTIONS, { showInFilters: true }),
    ],
  },
  {
    categoryCode: "electronic-devices",
    categoryTitle: "کالای دیجیتال",
    attributes: [
      select("condition", "وضعیت", CONDITION_OPTIONS, {
        isRequired: true,
        showInFilters: true,
      }),
      text("brand", "برند", {
        isRequired: true,
        maxLength: 80,
      }),
      boolean("warranty", "گارانتی دارد", { showInFilters: true }),
    ],
  },
  {
    categoryCode: "mobile",
    categoryTitle: "موبایل",
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
        { isRequired: true, showInFilters: true },
      ),
      select(
        "ram",
        "حافظه رم",
        [
          option("2", "۲ گیگابایت"),
          option("4", "۴ گیگابایت"),
          option("6", "۶ گیگابایت"),
          option("8", "۸ گیگابایت"),
          option("12-plus", "۱۲ گیگابایت و بیشتر"),
        ],
        { showInFilters: true },
      ),
      select(
        "sim_count",
        "تعداد سیم‌کارت",
        [
          option("one", "تک سیم‌کارت"),
          option("two", "دو سیم‌کارت"),
          option("esim", "دارای eSIM"),
        ],
        { showInFilters: true },
      ),
      number("battery_health", "سلامت باتری", {
        unit: "درصد",
        minValue: 0,
        maxValue: 100,
      }),
    ],
  },
  {
    categoryCode: "personal-goods",
    categoryTitle: "وسایل شخصی",
    attributes: [
      select("condition", "وضعیت", CONDITION_OPTIONS, {
        isRequired: true,
        showInFilters: true,
      }),
    ],
  },
  {
    categoryCode: "apparel",
    categoryTitle: "کیف و کفش",
    attributes: [
      select(
        "item_type",
        "نوع کالا",
        [option("shoes", "کفش"), option("bag", "کیف")],
        { isRequired: true, showInFilters: true },
      ),
      select(
        "gender",
        "مناسب برای",
        [
          option("women", "زنانه"),
          option("men", "مردانه"),
          option("kids", "کودک"),
          option("unisex", "بدون محدودیت"),
        ],
        { showInFilters: true },
      ),
      text("brand", "برند", { maxLength: 80 }),
      number("shoe_size", "سایز کفش", {
        showInFilters: true,
        minValue: 15,
        maxValue: 55,
      }),
      select(
        "material",
        "جنس",
        [
          option("leather", "چرم"),
          option("synthetic", "مصنوعی"),
          option("fabric", "پارچه"),
          option("mixed", "ترکیبی"),
        ],
        { showInFilters: true },
      ),
    ],
  },
];

const SUPPORTED_TYPES = new Set([
  "SELECT",
  "MULTI_SELECT",
  "TEXT",
  "NUMBER",
  "BOOLEAN",
]);

function getDefinitionCounts() {
  return ATTRIBUTE_SETS.reduce(
    (result, set) => {
      result.attributes += set.attributes.length;
      result.options += set.attributes.reduce(
        (total, item) => total + (item.options?.length || 0),
        0,
      );
      return result;
    },
    { attributes: 0, options: 0 },
  );
}

function validateDefinitions() {
  const categoryCodes = new Set();

  for (const set of ATTRIBUTE_SETS) {
    if (categoryCodes.has(set.categoryCode)) {
      throw new Error(`Duplicate category definition: ${set.categoryCode}`);
    }
    categoryCodes.add(set.categoryCode);

    const attributeCodes = new Set();
    for (const definition of set.attributes) {
      if (attributeCodes.has(definition.code)) {
        throw new Error(
          `Duplicate attribute definition: ${set.categoryCode}.${definition.code}`,
        );
      }
      attributeCodes.add(definition.code);

      if (!SUPPORTED_TYPES.has(definition.type)) {
        throw new Error(
          `Unsupported type for ${set.categoryCode}.${definition.code}`,
        );
      }

      if (
        definition.dependsOnCode &&
        !attributeCodes.has(definition.dependsOnCode)
      ) {
        throw new Error(
          `Dependency must be defined first: ${set.categoryCode}.${definition.code}`,
        );
      }

      if (
        definition.type === "SELECT" ||
        definition.type === "MULTI_SELECT"
      ) {
        const optionCodes = new Set(
          (definition.options || []).map((item) => item.code),
        );
        if (
          !definition.options?.length ||
          optionCodes.size !== definition.options.length
        ) {
          throw new Error(
            `Invalid options for ${set.categoryCode}.${definition.code}`,
          );
        }
      }
    }
  }
}

function attributeCreateData(
  categoryId,
  definition,
  displayOrder,
  dependsOnAttributeId,
) {
  return {
    categoryId,
    dependsOnAttributeId,
    code: definition.code,
    title: definition.title,
    type: definition.type,
    unit: definition.unit || null,
    placeholder: definition.placeholder || null,
    isRequired: definition.isRequired === true,
    showInFilters: definition.showInFilters === true,
    displayOrder,
    isActive: true,
    minValue: definition.minValue ?? null,
    maxValue: definition.maxValue ?? null,
    minLength: definition.minLength ?? null,
    maxLength: definition.maxLength ?? null,
  };
}

async function seedAttributeSet(tx, category, set, counters) {
  const storedAttributes = await tx.classifiedAttribute.findMany({
    where: { categoryId: category.id },
  });
  const attributeByCode = new Map(
    storedAttributes.map((item) => [item.code, item]),
  );

  for (let index = 0; index < set.attributes.length; index += 1) {
    const definition = set.attributes[index];
    const dependency = definition.dependsOnCode
      ? attributeByCode.get(definition.dependsOnCode)
      : null;

    if (definition.dependsOnCode && !dependency) {
      throw new Error(
        `Missing dependency ${set.categoryCode}.${definition.dependsOnCode}`,
      );
    }

    let storedAttribute = attributeByCode.get(definition.code);
    if (storedAttribute && storedAttribute.type !== definition.type) {
      throw new Error(
        `Type conflict for ${set.categoryCode}.${definition.code}: expected ${definition.type}, found ${storedAttribute.type}`,
      );
    }
    if (
      storedAttribute &&
      dependency &&
      storedAttribute.dependsOnAttributeId !== dependency.id
    ) {
      throw new Error(
        `Dependency conflict for ${set.categoryCode}.${definition.code}`,
      );
    }

    if (!storedAttribute) {
      storedAttribute = await tx.classifiedAttribute.create({
        data: attributeCreateData(
          category.id,
          definition,
          (index + 1) * 10,
          dependency?.id || null,
        ),
      });
      attributeByCode.set(definition.code, storedAttribute);
      counters.attributesCreated += 1;
    } else {
      counters.attributesPreserved += 1;
    }

    if (
      definition.type !== "SELECT" &&
      definition.type !== "MULTI_SELECT"
    ) {
      continue;
    }

    const storedOptions = await tx.classifiedAttributeOption.findMany({
      where: { attributeId: storedAttribute.id },
    });
    const optionByCode = new Map(
      storedOptions.map((item) => [item.code, item]),
    );
    const parentOptions = dependency
      ? await tx.classifiedAttributeOption.findMany({
          where: { attributeId: dependency.id },
          select: { id: true, code: true },
        })
      : [];
    const parentOptionByCode = new Map(
      parentOptions.map((item) => [item.code, item.id]),
    );

    for (
      let optionIndex = 0;
      optionIndex < definition.options.length;
      optionIndex += 1
    ) {
      const definitionOption = definition.options[optionIndex];
      const parentOptionId = definitionOption.parentOptionCode
        ? parentOptionByCode.get(definitionOption.parentOptionCode)
        : null;

      if (definitionOption.parentOptionCode && !parentOptionId) {
        throw new Error(
          `Missing parent option ${definitionOption.parentOptionCode} for ${set.categoryCode}.${definition.code}.${definitionOption.code}`,
        );
      }

      if (optionByCode.has(definitionOption.code)) {
        counters.optionsPreserved += 1;
        continue;
      }

      const createdOption = await tx.classifiedAttributeOption.create({
        data: {
          attributeId: storedAttribute.id,
          parentOptionId,
          code: definitionOption.code,
          title: definitionOption.title,
          image: definitionOption.image || null,
          color: definitionOption.color || null,
          displayOrder: (optionIndex + 1) * 10,
          isActive: true,
        },
      });
      optionByCode.set(createdOption.code, createdOption);
      counters.optionsCreated += 1;
    }
  }
}

async function main() {
  validateDefinitions();
  const definitionCounts = getDefinitionCounts();

  if (validateOnly) {
    console.log("Classified attribute definitions are valid.");
    console.log(`Category definitions: ${ATTRIBUTE_SETS.length}`);
    console.log(`Attribute definitions: ${definitionCounts.attributes}`);
    console.log(`Option definitions: ${definitionCounts.options}`);
    return;
  }

  const requestedCategoryCodes = ATTRIBUTE_SETS.map(
    (item) => item.categoryCode,
  );
  const categories = await prisma.classifiedCategory.findMany({
    where: { code: { in: requestedCategoryCodes } },
    select: { id: true, code: true, title: true },
  });
  const categoryByCode = new Map(
    categories.map((item) => [item.code, item]),
  );
  const missingCategoryCodes = requestedCategoryCodes.filter(
    (code) => !categoryByCode.has(code),
  );

  if (missingCategoryCodes.length) {
    throw new Error(
      `Required classified categories are missing: ${missingCategoryCodes.join(", ")}`,
    );
  }

  if (dryRun) {
    const existingAttributes = await prisma.classifiedAttribute.findMany({
      where: {
        categoryId: { in: categories.map((item) => item.id) },
      },
      select: { categoryId: true, code: true },
    });
    const existingKeys = new Set(
      existingAttributes.map((item) => `${item.categoryId}:${item.code}`),
    );
    const missingAttributeCount = ATTRIBUTE_SETS.reduce((total, set) => {
      const category = categoryByCode.get(set.categoryCode);
      return (
        total +
        set.attributes.filter(
          (item) => !existingKeys.has(`${category.id}:${item.code}`),
        ).length
      );
    }, 0);

    console.log("Classified attribute seed dry-run completed.");
    console.log(`Categories matched: ${categories.length}`);
    console.log(`Attribute definitions: ${definitionCounts.attributes}`);
    console.log(`Option definitions: ${definitionCounts.options}`);
    console.log(`Missing attributes to create: ${missingAttributeCount}`);
    console.log("No database records were changed.");
    return;
  }

  const counters = {
    attributesCreated: 0,
    attributesPreserved: 0,
    optionsCreated: 0,
    optionsPreserved: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      for (const set of ATTRIBUTE_SETS) {
        await seedAttributeSet(
          tx,
          categoryByCode.get(set.categoryCode),
          set,
          counters,
        );
      }
    },
    { timeout: 30000 },
  );

  console.log("Classified sample attributes seeded successfully.");
  console.log(`Categories processed: ${categories.length}`);
  console.log(`Attributes created: ${counters.attributesCreated}`);
  console.log(`Existing attributes preserved: ${counters.attributesPreserved}`);
  console.log(`Options created: ${counters.optionsCreated}`);
  console.log(`Existing options preserved: ${counters.optionsPreserved}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed classified sample attributes.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
