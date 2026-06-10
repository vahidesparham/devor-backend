-- CreateTable
CREATE TABLE `AppUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(80) NOT NULL,
    `countryCode` VARCHAR(10) NULL,
    `phoneCode` VARCHAR(20) NULL,
    `avatar` VARCHAR(500) NULL,
    `email` VARCHAR(191) NULL,
    `firstName` VARCHAR(100) NULL,
    `lastName` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppUser_phone_key`(`phone`),
    UNIQUE INDEX `AppUser_email_key`(`email`),
    INDEX `AppUser_countryCode_idx`(`countryCode`),
    INDEX `AppUser_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppOtpChallenge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(80) NOT NULL,
    `countryCode` VARCHAR(10) NULL,
    `phoneCode` VARCHAR(20) NULL,
    `code` VARCHAR(10) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppOtpChallenge_phone_idx`(`phone`),
    INDEX `AppOtpChallenge_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppRefreshToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` VARCHAR(255) NULL,
    `replacedByTokenHash` VARCHAR(191) NULL,
    `createdByIp` VARCHAR(100) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AppRefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `AppRefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppRefreshToken` ADD CONSTRAINT `AppRefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
