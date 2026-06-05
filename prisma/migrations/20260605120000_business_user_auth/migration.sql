CREATE TABLE `BusinessRefreshToken` (
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

  PRIMARY KEY (`id`),
  UNIQUE INDEX `BusinessRefreshToken_tokenHash_key` (`tokenHash`),
  INDEX `BusinessRefreshToken_userId_idx` (`userId`),
  CONSTRAINT `BusinessRefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
