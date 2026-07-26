const prisma = require('../../prisma');
const { AppError } = require('../../shared/http/response');

async function assertLanguagesExist(codes) {
  if (!codes.length) return;

  const existing = await prisma.language.findMany({
    where: { code: { in: codes }, isActive: true },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = codes.filter((code) => !existingCodes.has(code));

  if (missing.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: missing.map((code) => ({
        path: 'translations.lang',
        message: `Language "${code}" is not available`,
      })),
    });
  }
}

async function resolveSelectedLang(lang) {
  if (lang) {
    const language = await prisma.language.findFirst({
      where: { code: lang, isActive: true },
      select: { code: true },
    });
    if (!language) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: [{ path: 'x-lang', message: `Language "${lang}" is not available` }],
      });
    }
    return lang;
  }

  const fallback = await prisma.language.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    select: { code: true },
  });

  if (!fallback) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: [{ path: 'x-lang', message: 'No active language is configured' }],
    });
  }

  return fallback.code;
}

module.exports = {
  assertLanguagesExist,
  resolveSelectedLang,
};
