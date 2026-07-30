const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const env = require('../../config/env');
const { AppError } = require('../../shared/http/response');
const uploadService = require('../uploads/upload.service');
const payomSmsService = require('../sms/payomSms.service');

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(1000, 10000));
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), phone: user.phone, scope: 'app', jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.id), phone: user.phone, scope: 'app', jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
}

function appUserProfile(user) {
  return {
    id: user.id,
    phone: user.phone,
    countryCode: user.countryCode,
    phoneCode: user.phoneCode,
    avatar: user.avatar,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    isProfileComplete: Boolean(user.firstName && user.lastName),
  };
}

async function saveRefreshToken(userId, refreshToken, req) {
  const decoded = jwt.decode(refreshToken);
  await prisma.appRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null,
      createdByIp: req.ip,
      userAgent: req.get('user-agent') || null,
    },
  });
}

async function requestOtp(data) {
  const phone = normalizePhone(data.phone);
  const code = generateOtp();
  const challenge = await prisma.appOtpChallenge.create({
    data: {
      phone,
      countryCode: data.countryCode || null,
      phoneCode: data.phoneCode || null,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  let delivery;
  try {
    delivery = await payomSmsService.sendOtp({ phone, code });
  } catch (error) {
    await prisma.appOtpChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    throw error;
  }

  return {
    phone,
    otp: code,
    expiresInSeconds: 300,
    smsSent: delivery.sent,
  };
}

async function verifyOtp(data, req) {
  const phone = normalizePhone(data.phone);
  const challenge = await prisma.appOtpChallenge.findFirst({
    where: {
      phone,
      code: data.code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) throw new AppError(401, 'INVALID_OTP', 'Invalid or expired OTP');

  let user = await prisma.appUser.findUnique({ where: { phone } });
  const isNewUser = !user;

  if (!user) {
    user = await prisma.appUser.create({
      data: {
        phone,
        countryCode: data.countryCode || challenge.countryCode || null,
        phoneCode: data.phoneCode || challenge.phoneCode || null,
        wallet: { create: { currency: 'TJS' } },
      },
    });
  }

  if (!user.isActive) throw new AppError(403, 'USER_INACTIVE', 'User account is inactive');

  await prisma.appOtpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await saveRefreshToken(user.id, refreshToken, req);

  return {
    accessToken,
    refreshToken,
    isNewUser,
    user: appUserProfile(user),
  };
}

async function refresh(data, req) {
  let payload;
  try {
    payload = jwt.verify(data.refreshToken, env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  if (payload.scope !== 'app') throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token scope');

  const oldHash = hashToken(data.refreshToken);
  const tokenRow = await prisma.appRefreshToken.findUnique({
    where: { tokenHash: oldHash },
  });

  if (!tokenRow || tokenRow.revokedAt) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token revoked or not found');
  }

  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token expired');
  }

  const user = await prisma.appUser.findUnique({ where: { id: Number(payload.sub) } });
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'User account is not active');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const newHash = hashToken(refreshToken);

  await prisma.$transaction([
    prisma.appRefreshToken.update({
      where: { tokenHash: oldHash },
      data: {
        revokedAt: new Date(),
        revokedReason: 'rotated',
        replacedByTokenHash: newHash,
      },
    }),
    prisma.appRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt: new Date(jwt.decode(refreshToken).exp * 1000),
        createdByIp: req.ip,
        userAgent: req.get('user-agent') || null,
      },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: appUserProfile(user),
  };
}

async function completeProfile(userId, data) {
  const email = data.email || null;
  if (email) {
    const emailOwner = await prisma.appUser.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== userId) {
      throw new AppError(400, 'EMAIL_ALREADY_EXISTS', 'Email is already used');
    }
  }

  const user = await prisma.appUser.update({
    where: { id: userId },
    data: {
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      email,
      avatar: data.avatar || null,
    },
  });

  return appUserProfile(user);
}

async function uploadAvatar(file) {
  return uploadService.uploadImage({
    file,
    code: 'app_user_avatar',
  });
}

async function me(userId) {
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'User account is not active');
  return appUserProfile(user);
}

module.exports = {
  requestOtp,
  verifyOtp,
  refresh,
  completeProfile,
  uploadAvatar,
  me,
  appUserProfile,
};
