const { z } = require("zod");

const uploadImageBodySchema = z.object({
    code: z
        .string()
        .trim()
        .toLowerCase()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9_-]+$/, "code must contain lowercase letters, numbers, _ or -"),
    folderName: z
        .string()
        .trim()
        .toLowerCase()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9/_-]+$/, "folderName must contain lowercase letters, numbers, /, _ or -")
        .optional(),
    skipCrop: z.preprocess((value) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
        }
        return false;
    }, z.boolean()).optional(),
});

module.exports = {
    uploadImageBodySchema,
};
