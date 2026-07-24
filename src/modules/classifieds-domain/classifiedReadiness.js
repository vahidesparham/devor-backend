const { AppError } = require('../../shared/http/response');
const { DEFAULT_CLASSIFIED_SETTINGS } = require('./classifiedSettings');
const { validateClassifiedOwnerReferences } = require('./classifiedOwnership');

const PRICE_TYPES = new Set(['FIXED', 'NEGOTIABLE', 'FREE', 'CONTACT']);
const ATTRIBUTE_TYPES = new Set(['SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN']);

function issue(code, field, message) {
  return { code, field, message };
}

function stringLength(value) {
  return String(value || '').trim().length;
}

function hasHtml(value) {
  return /<[^>]+>/.test(String(value || ''));
}

function valueRowsForAttribute(values, attribute) {
  return (values || []).filter((value) => Number(value.attributeId) === Number(attribute.id));
}

function populatedValueCount(row) {
  return [
    row.optionId != null,
    row.textValue != null,
    row.numberValue != null,
    row.booleanValue != null,
  ].filter(Boolean).length;
}

function validateAttribute(attribute, values) {
  const rows = valueRowsForAttribute(values, attribute);
  const issues = [];
  const field = `attributes.${attribute.code}`;

  if (!ATTRIBUTE_TYPES.has(attribute.type)) {
    return [issue('CLASSIFIED_ATTRIBUTE_TYPE_INVALID', field, `Attribute "${attribute.title}" has an invalid type`)];
  }

  if (attribute.isRequired && !rows.length) {
    return [issue('CLASSIFIED_ATTRIBUTE_REQUIRED', field, `Attribute "${attribute.title}" is required`)];
  }
  if (!rows.length) return [];

  if (rows.some((row) => populatedValueCount(row) !== 1)) {
    return [
      issue(
        'CLASSIFIED_ATTRIBUTE_VALUE_SHAPE_INVALID',
        field,
        `Attribute "${attribute.title}" contains an invalid typed value`,
      ),
    ];
  }

  if (attribute.type === 'SELECT') {
    if (rows.length !== 1 || !rows[0].optionId) {
      issues.push(issue('CLASSIFIED_ATTRIBUTE_SELECT_INVALID', field, `Attribute "${attribute.title}" requires one option`));
    }
  }

  if (attribute.type === 'MULTI_SELECT' && rows.some((row) => !row.optionId)) {
    issues.push(issue('CLASSIFIED_ATTRIBUTE_MULTI_SELECT_INVALID', field, `Attribute "${attribute.title}" requires valid options`));
  }

  if (attribute.type === 'SELECT' || attribute.type === 'MULTI_SELECT') {
    const validOptionIds = new Set((attribute.options || []).map((option) => Number(option.id)));
    if (rows.some((row) => row.optionId && !validOptionIds.has(Number(row.optionId)))) {
      issues.push(issue(
        'CLASSIFIED_ATTRIBUTE_OPTION_INVALID',
        field,
        `Attribute "${attribute.title}" contains an inactive or unrelated option`,
      ));
    }
  }

  if (attribute.type === 'TEXT') {
    if (rows.length !== 1 || stringLength(rows[0].textValue) === 0) {
      issues.push(issue('CLASSIFIED_ATTRIBUTE_TEXT_INVALID', field, `Attribute "${attribute.title}" requires text`));
    } else {
      const length = stringLength(rows[0].textValue);
      if (attribute.minLength != null && length < attribute.minLength) {
        issues.push(issue('CLASSIFIED_ATTRIBUTE_TEXT_TOO_SHORT', field, `Attribute "${attribute.title}" is too short`));
      }
      if (attribute.maxLength != null && length > attribute.maxLength) {
        issues.push(issue('CLASSIFIED_ATTRIBUTE_TEXT_TOO_LONG', field, `Attribute "${attribute.title}" is too long`));
      }
    }
  }

  if (attribute.type === 'NUMBER') {
    const numberValue = rows.length === 1 ? Number(rows[0].numberValue) : Number.NaN;
    if (!Number.isFinite(numberValue)) {
      issues.push(issue('CLASSIFIED_ATTRIBUTE_NUMBER_INVALID', field, `Attribute "${attribute.title}" requires a number`));
    } else {
      if (attribute.minValue != null && numberValue < Number(attribute.minValue)) {
        issues.push(issue('CLASSIFIED_ATTRIBUTE_NUMBER_TOO_SMALL', field, `Attribute "${attribute.title}" is below its minimum`));
      }
      if (attribute.maxValue != null && numberValue > Number(attribute.maxValue)) {
        issues.push(issue('CLASSIFIED_ATTRIBUTE_NUMBER_TOO_LARGE', field, `Attribute "${attribute.title}" is above its maximum`));
      }
    }
  }

  if (attribute.type === 'BOOLEAN' && (rows.length !== 1 || typeof rows[0].booleanValue !== 'boolean')) {
    issues.push(issue('CLASSIFIED_ATTRIBUTE_BOOLEAN_INVALID', field, `Attribute "${attribute.title}" requires true or false`));
  }

  return issues;
}

function evaluateClassifiedReadiness(input) {
  const settings = { ...DEFAULT_CLASSIFIED_SETTINGS, ...(input.settings || {}) };
  const ad = input.ad || {};
  const category = input.category || null;
  const categoryPath = input.categoryPath || (category ? [category] : []);
  const attributes = input.attributes || [];
  const values = input.values || [];
  const images = input.images || [];
  const owner = input.owner || null;
  const issues = [];

  try {
    validateClassifiedOwnerReferences(ad, {
      allowBusinessClassifieds: settings.allowBusinessClassifieds,
    });
  } catch (error) {
    issues.push(issue(error.code || 'CLASSIFIED_OWNER_INVALID', 'owner', error.message));
  }

  if (!owner || owner.isActive !== true) {
    issues.push(issue('CLASSIFIED_OWNER_INACTIVE', 'owner', 'Classified owner must be active'));
  }

  if (!category) {
    issues.push(issue('CLASSIFIED_CATEGORY_REQUIRED', 'categoryId', 'A classified category is required'));
  } else {
    if (!category.allowAds) {
      issues.push(issue('CLASSIFIED_CATEGORY_NOT_SELECTABLE', 'categoryId', 'Selected category does not accept ads'));
    }
    if (categoryPath.some((item) => item.isActive !== true)) {
      issues.push(issue('CLASSIFIED_CATEGORY_INACTIVE', 'categoryId', 'Selected category or one of its parents is inactive'));
    }
  }

  const titleLength = stringLength(ad.title);
  if (titleLength < 3) {
    issues.push(issue('CLASSIFIED_TITLE_REQUIRED', 'title', 'Title must contain at least 3 characters'));
  } else if (titleLength > settings.maxTitleLength) {
    issues.push(issue('CLASSIFIED_TITLE_TOO_LONG', 'title', `Title cannot exceed ${settings.maxTitleLength} characters`));
  }

  const descriptionLength = stringLength(ad.description);
  if (descriptionLength < 10) {
    issues.push(issue('CLASSIFIED_DESCRIPTION_REQUIRED', 'description', 'Description must contain at least 10 characters'));
  } else if (descriptionLength > settings.maxDescriptionLength) {
    issues.push(
      issue(
        'CLASSIFIED_DESCRIPTION_TOO_LONG',
        'description',
        `Description cannot exceed ${settings.maxDescriptionLength} characters`,
      ),
    );
  }
  if (hasHtml(ad.description)) {
    issues.push(issue('CLASSIFIED_DESCRIPTION_HTML_NOT_ALLOWED', 'description', 'Description must be plain text'));
  }

  if (!PRICE_TYPES.has(ad.priceType)) {
    issues.push(issue('CLASSIFIED_PRICE_TYPE_INVALID', 'priceType', 'Price type is invalid'));
  } else if (ad.priceType === 'FIXED' || ad.priceType === 'NEGOTIABLE') {
    if (!Number.isFinite(Number(ad.price)) || Number(ad.price) <= 0) {
      issues.push(issue('CLASSIFIED_PRICE_REQUIRED', 'price', 'A positive price is required'));
    }
  } else if (ad.price != null) {
    issues.push(issue('CLASSIFIED_PRICE_MUST_BE_EMPTY', 'price', 'Price must be empty for this price type'));
  }

  if (!ad.countryId || !ad.cityId) {
    issues.push(issue('CLASSIFIED_LOCATION_REQUIRED', 'cityId', 'Country and city are required'));
  }
  if (ad.countryId && (!input.country || input.country.isActive !== true)) {
    issues.push(issue('CLASSIFIED_COUNTRY_INACTIVE', 'countryId', 'Selected country is not active'));
  }
  if (ad.cityId && (!input.city || input.city.isActive !== true)) {
    issues.push(issue('CLASSIFIED_CITY_INACTIVE', 'cityId', 'Selected city is not active'));
  }
  if (ad.areaId && (!input.area || input.area.isActive !== true)) {
    issues.push(issue('CLASSIFIED_AREA_INACTIVE', 'areaId', 'Selected area is not active'));
  }
  if (input.city && Number(input.city.countryId) !== Number(ad.countryId)) {
    issues.push(issue('CLASSIFIED_CITY_COUNTRY_MISMATCH', 'cityId', 'City does not belong to the selected country'));
  }
  if (ad.areaId && input.area && Number(input.area.cityId) !== Number(ad.cityId)) {
    issues.push(issue('CLASSIFIED_AREA_CITY_MISMATCH', 'areaId', 'Area does not belong to the selected city'));
  }

  if (ad.allowPhone) {
    if (!settings.allowPhoneContact) {
      issues.push(issue('CLASSIFIED_PHONE_CONTACT_DISABLED', 'allowPhone', 'Phone contact is disabled'));
    } else if (stringLength(ad.contactPhone) < 3) {
      issues.push(issue('CLASSIFIED_CONTACT_PHONE_REQUIRED', 'contactPhone', 'Contact phone is required'));
    }
  }
  if (ad.allowChat && !settings.allowChatContact) {
    issues.push(issue('CLASSIFIED_CHAT_DISABLED', 'allowChat', 'Classified chat is not enabled'));
  }
  if (!ad.allowPhone && !ad.allowChat) {
    issues.push(issue('CLASSIFIED_CONTACT_METHOD_REQUIRED', 'allowPhone', 'At least one contact method is required'));
  }

  if (images.length < settings.minImagesPerAd) {
    issues.push(
      issue(
        'CLASSIFIED_IMAGE_REQUIRED',
        'images',
        `At least ${settings.minImagesPerAd} image(s) are required`,
      ),
    );
  }
  if (images.length > settings.maxImagesPerAd) {
    issues.push(
      issue(
        'CLASSIFIED_IMAGE_LIMIT_EXCEEDED',
        'images',
        `No more than ${settings.maxImagesPerAd} image(s) are allowed`,
      ),
    );
  }

  for (const attribute of attributes.filter((item) => item.isActive !== false)) {
    issues.push(...validateAttribute(attribute, values));
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

function assertClassifiedReady(input) {
  const readiness = evaluateClassifiedReadiness(input);
  if (!readiness.ready) {
    throw new AppError(409, 'CLASSIFIED_NOT_READY', 'Classified ad is not ready for submission', {
      errors: readiness.issues.map((item) => ({ path: item.field, message: item.message, code: item.code })),
      details: readiness,
    });
  }
  return readiness;
}

module.exports = {
  assertClassifiedReady,
  evaluateClassifiedReadiness,
  populatedValueCount,
  validateAttribute,
};
