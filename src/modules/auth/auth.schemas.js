const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional()
});

const updateMyProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional().nullable(),
    lastName: z.string().trim().min(1).max(100).optional().nullable(),
    avatar: z.string().trim().max(500).optional().nullable()
  })
  .superRefine((data, ctx) => {
    const hasProfileField = ['firstName', 'lastName', 'avatar'].some((key) => data[key] !== undefined);

    if (!hasProfileField) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one field is required for update'
      });
    }
  });

const changeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100)
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'newPassword must be different from currentPassword'
      });
    }
  });

module.exports = {
  loginSchema,
  refreshSchema,
  logoutSchema,
  updateMyProfileSchema,
  changeMyPasswordSchema
};
