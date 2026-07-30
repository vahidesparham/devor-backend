const { AppError } = require('../../shared/http/response');
const smsSettingService = require('../sms-settings/smsSetting.service');

function messageEndpoint(apiBaseUrl) {
  const normalized = String(apiBaseUrl || '').trim().replace(/\/+$/, '');
  return normalized.endsWith('/api/message')
    ? normalized
    : `${normalized}/api/message`;
}

function normalizePayomTelephone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const telephone = digits ? `+${digits}` : '';
  if (!/^\+992\d{9}$/.test(telephone)) {
    throw new AppError(
      400,
      'OTP_PHONE_NOT_SUPPORTED',
      'Payom requires a Tajikistan phone number in +992XXXXXXXXX format',
    );
  }
  return telephone;
}

function requestBody(settings, telephone, code) {
  const base = {
    telephone,
    senderName: settings.senderName,
    type: settings.messageType,
  };

  if (settings.sendMode === 'TEMPLATE') {
    return {
      ...base,
      templateMessage: {
        templateId: settings.templateId,
        variables: {
          [settings.templateCodeVariable]: code,
        },
      },
    };
  }

  return {
    ...base,
    text: settings.textTemplate.replaceAll('{code}', code),
  };
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text.slice(0, 500) };
  }
}

async function sendOtp({ phone, code }) {
  const settings = await smsSettingService.getDeliveryConfiguration();
  if (!settings.isEnabled) {
    return {
      provider: settings.provider,
      sent: false,
      skipped: true,
      reason: 'DISABLED',
    };
  }

  const telephone = normalizePayomTelephone(phone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.requestTimeoutMs);

  let response;
  try {
    response = await fetch(messageEndpoint(settings.apiBaseUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiToken}`,
      },
      body: JSON.stringify(requestBody(settings, telephone, code)),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    throw new AppError(
      502,
      timedOut ? 'SMS_PROVIDER_TIMEOUT' : 'SMS_PROVIDER_UNAVAILABLE',
      timedOut
        ? 'SMS provider request timed out'
        : 'SMS provider is currently unavailable',
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new AppError(
      502,
      'SMS_PROVIDER_REJECTED',
      'SMS provider rejected the message',
      {
        details: {
          providerStatus: response.status,
          providerCode: payload?.code || null,
        },
      },
    );
  }

  return {
    provider: settings.provider,
    sent: true,
    skipped: false,
    messageId: payload?.id || null,
    deliveryStatus: payload?.deliveryStatus || null,
  };
}

module.exports = {
  messageEndpoint,
  normalizePayomTelephone,
  requestBody,
  sendOtp,
};
