const test = require('node:test');
const assert = require('node:assert/strict');

const {
  messageEndpoint,
  normalizePayomTelephone,
  requestBody,
} = require('../src/modules/sms/payomSms.service');

test('Payom endpoint appends the message path once', () => {
  assert.equal(
    messageEndpoint('https://sms.example.test'),
    'https://sms.example.test/api/message',
  );
  assert.equal(
    messageEndpoint('https://sms.example.test/api/message/'),
    'https://sms.example.test/api/message',
  );
});

test('Payom telephone normalization accepts Tajik E.164 numbers', () => {
  assert.equal(normalizePayomTelephone('+992 90 123 45 67'), '+992901234567');
  assert.throws(
    () => normalizePayomTelephone('+989121234567'),
    (error) => error.code === 'OTP_PHONE_NOT_SUPPORTED',
  );
});

test('Payom template payload maps the OTP code variable', () => {
  assert.deepEqual(
    requestBody({
      senderName: 'DEVOR',
      messageType: 'SMS',
      sendMode: 'TEMPLATE',
      templateId: 'f6a5d38d-5235-43f2-9a44-11990e8f05a7',
      templateCodeVariable: 'code',
    }, '+992901234567', '4712'),
    {
      telephone: '+992901234567',
      senderName: 'DEVOR',
      type: 'SMS',
      templateMessage: {
        templateId: 'f6a5d38d-5235-43f2-9a44-11990e8f05a7',
        variables: { code: '4712' },
      },
    },
  );
});

test('Payom text payload replaces every code placeholder', () => {
  const payload = requestBody({
    senderName: 'DEVOR',
    messageType: 'SMS',
    sendMode: 'TEXT',
    textTemplate: 'Code {code}. Repeat {code}.',
  }, '+992901234567', '4712');

  assert.equal(payload.text, 'Code 4712. Repeat 4712.');
});
