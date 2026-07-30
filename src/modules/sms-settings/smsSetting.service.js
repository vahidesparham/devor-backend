const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');
const { audit } = require('../../shared/audit/audit');
const {
  decryptSecret,
  encryptSecret,
} = require('../../shared/security/secretCipher');

const SINGLETON_ID = 1;
const DEFAULT_SETTINGS = {
  id: SINGLETON_ID,
  provider: 'PAYOM',
  isEnabled: false,
  apiBaseUrl: null,
  apiTokenEncrypted: null,
  apiTokenLastFour: null,
  senderName: null,
  sendMode: 'TEMPLATE',
  templateId: null,
  templateCodeVariable: 'code',
  textTemplate: 'Devor verification code: {code}',
  messageType: 'SMS',
  requestTimeoutMs: 10000,
};

function nullableText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalize(item) {
  return {
    id: item.id,
    provider: item.provider,
    isEnabled: item.isEnabled,
    apiBaseUrl: item.apiBaseUrl,
    apiTokenConfigured: Boolean(item.apiTokenEncrypted),
    apiTokenHint: item.apiTokenLastFour ? `••••${item.apiTokenLastFour}` : null,
    senderName: item.senderName,
    sendMode: item.sendMode,
    templateId: item.templateId,
    templateCodeVariable: item.templateCodeVariable,
    textTemplate: item.textTemplate,
    messageType: item.messageType,
    requestTimeoutMs: item.requestTimeoutMs,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function ensureSmsSettings(db = prisma) {
  return db.smsSetting.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: DEFAULT_SETTINGS,
  });
}

function validateEnabledSettings(settings) {
  if (!settings.isEnabled) return;

  const missing = [];
  if (!settings.apiBaseUrl) missing.push('apiBaseUrl');
  if (!settings.apiTokenEncrypted) missing.push('apiToken');
  if (!settings.senderName) missing.push('senderName');
  if (settings.sendMode === 'TEMPLATE' && !settings.templateId) {
    missing.push('templateId');
  }
  if (settings.sendMode === 'TEXT' && !settings.textTemplate.includes('{code}')) {
    throw new AppError(
      400,
      'SMS_TEXT_TEMPLATE_INVALID',
      'SMS text template must contain {code}',
    );
  }

  if (missing.length > 0) {
    throw new AppError(
      400,
      'SMS_SETTINGS_INCOMPLETE',
      'Complete the required SMS settings before enabling delivery',
      { details: { missing } },
    );
  }
}

async function getSmsSettings() {
  return normalize(await ensureSmsSettings());
}

async function getDeliveryConfiguration() {
  const settings = await ensureSmsSettings();
  if (!settings.isEnabled) {
    return { ...normalize(settings), apiToken: null };
  }

  validateEnabledSettings(settings);

  let apiToken;
  try {
    apiToken = decryptSecret(settings.apiTokenEncrypted);
  } catch (_error) {
    throw new AppError(
      500,
      'SMS_TOKEN_DECRYPTION_FAILED',
      'SMS provider token could not be decrypted',
    );
  }

  return {
    ...normalize(settings),
    apiToken,
  };
}

async function updateSmsSettings(data, req) {
  const existing = await ensureSmsSettings();
  const nextData = {
    ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
    ...(data.apiBaseUrl !== undefined
      ? { apiBaseUrl: nullableText(data.apiBaseUrl) }
      : {}),
    ...(data.senderName !== undefined
      ? { senderName: nullableText(data.senderName) }
      : {}),
    ...(data.sendMode !== undefined ? { sendMode: data.sendMode } : {}),
    ...(data.templateId !== undefined
      ? { templateId: nullableText(data.templateId) }
      : {}),
    ...(data.templateCodeVariable !== undefined
      ? { templateCodeVariable: data.templateCodeVariable.trim() }
      : {}),
    ...(data.textTemplate !== undefined
      ? { textTemplate: data.textTemplate.trim() }
      : {}),
    ...(data.requestTimeoutMs !== undefined
      ? { requestTimeoutMs: Number(data.requestTimeoutMs) }
      : {}),
  };

  if (data.apiToken) {
    nextData.apiTokenEncrypted = encryptSecret(data.apiToken);
    nextData.apiTokenLastFour = data.apiToken.slice(-4);
  } else if (data.clearApiToken) {
    nextData.apiTokenEncrypted = null;
    nextData.apiTokenLastFour = null;
  }

  const candidate = { ...existing, ...nextData };
  validateEnabledSettings(candidate);

  const updated = await prisma.smsSetting.update({
    where: { id: SINGLETON_ID },
    data: nextData,
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'SmsSetting',
    entityId: String(SINGLETON_ID),
    before: normalize(existing),
    after: normalize(updated),
  });

  return normalize(updated);
}

module.exports = {
  getDeliveryConfiguration,
  getSmsSettings,
  updateSmsSettings,
};
