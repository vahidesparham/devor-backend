const { z } = require('zod');

const weekDaySchema = z.enum(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const nullableTime = z.preprocess((val) => (val === '' ? null : val), timeSchema.nullable().optional());
const nullableString = (max) => z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(max).nullable().optional());

const baseBodySchema = z.object({
  businessId: z.coerce.number().int().positive(),
  dayOfWeek: weekDaySchema,
  opensAt: nullableTime,
  closesAt: nullableTime,
  isClosed: z.boolean().optional().default(false),
  note: nullableString(255),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});

function refineWorkingHour(data, ctx, { partial = false } = {}) {
  if (data.isClosed) {
    if (data.opensAt || data.closesAt) {
      ctx.addIssue({ code: 'custom', path: ['opensAt'], message: 'Closed days cannot have opening hours' });
    }
    return;
  }

  const shouldValidateTimes = !partial || data.opensAt !== undefined || data.closesAt !== undefined || data.isClosed !== undefined;
  if (shouldValidateTimes && !data.opensAt) ctx.addIssue({ code: 'custom', path: ['opensAt'], message: 'Opening time is required' });
  if (shouldValidateTimes && !data.closesAt) ctx.addIssue({ code: 'custom', path: ['closesAt'], message: 'Closing time is required' });
  if (data.opensAt && data.closesAt && data.opensAt >= data.closesAt) {
    ctx.addIssue({ code: 'custom', path: ['closesAt'], message: 'Closing time must be after opening time' });
  }
}

const createBusinessWorkingHourSchema = baseBodySchema.superRefine(refineWorkingHour);
const updateBusinessWorkingHourSchema = baseBodySchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) ctx.addIssue({ code: 'custom', message: 'At least one field is required for update' });
  refineWorkingHour(data, ctx, { partial: true });
});

const listBusinessWorkingHoursSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  businessId: z.coerce.number().int().positive().optional(),
  dayOfWeek: weekDaySchema.optional(),
  isClosed: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean()).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createBusinessWorkingHourSchema,
  updateBusinessWorkingHourSchema,
  listBusinessWorkingHoursSchema,
  idParamSchema,
};
