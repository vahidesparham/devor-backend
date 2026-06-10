const { z } = require('zod');

const phoneSchema = z.string().trim().min(5).max(40).regex(/^[0-9+\-\s()]+$/);

const requestOtpSchema = z.object({
  phone: phoneSchema,
  countryCode: z.string().trim().toUpperCase().min(2).max(10).optional().nullable(),
  phoneCode: z.string().trim().min(1).max(20).optional().nullable(),
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().min(4).max(10),
  countryCode: z.string().trim().toUpperCase().min(2).max(10).optional().nullable(),
  phoneCode: z.string().trim().min(1).max(20).optional().nullable(),
});

const completeProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(191).optional().nullable(),
  avatar: z.string().trim().max(500).optional().nullable(),
});

module.exports = {
  requestOtpSchema,
  verifyOtpSchema,
  completeProfileSchema,
};
