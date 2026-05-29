const dotenv = require('dotenv');

dotenv.config();

const required = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN'
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT || '1mb',
  LOG_404_ERRORS: String(process.env.LOG_404_ERRORS || 'false').toLowerCase() === 'true',
  LOG_VALIDATION_ERRORS: String(process.env.LOG_VALIDATION_ERRORS || 'false').toLowerCase() === 'true',
  ERROR_LOG_IGNORE_STATUS_CODES: (process.env.ERROR_LOG_IGNORE_STATUS_CODES || '401,403')
    .split(',')
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
  ERROR_LOG_IGNORE_CODES: (process.env.ERROR_LOG_IGNORE_CODES || '')
    .split(',')
    .map((value) => String(value).trim())
    .filter(Boolean)
};

module.exports = env;

