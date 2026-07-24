-- CreateTable
CREATE TABLE `AppWallet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appUserId` INTEGER NOT NULL,
    `balance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppWallet_appUserId_key`(`appUserId`),
    INDEX `AppWallet_currency_idx`(`currency`),
    INDEX `AppWallet_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppWalletTransaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `walletId` INTEGER NOT NULL,
    `appUserId` INTEGER NOT NULL,
    `adminId` INTEGER NULL,
    `type` ENUM('CREDIT', 'DEBIT', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `balanceBefore` DECIMAL(14, 2) NOT NULL,
    `balanceAfter` DECIMAL(14, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    `reason` VARCHAR(160) NULL,
    `note` VARCHAR(500) NULL,
    `referenceType` VARCHAR(80) NULL,
    `referenceId` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppWalletTransaction_walletId_createdAt_idx`(`walletId`, `createdAt`),
    INDEX `AppWalletTransaction_appUserId_createdAt_idx`(`appUserId`, `createdAt`),
    INDEX `AppWalletTransaction_adminId_idx`(`adminId`),
    INDEX `AppWalletTransaction_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `AppWalletTransaction_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppWallet` ADD CONSTRAINT `AppWallet_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppWalletTransaction` ADD CONSTRAINT `AppWalletTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `AppWallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppWalletTransaction` ADD CONSTRAINT `AppWalletTransaction_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppWalletTransaction` ADD CONSTRAINT `AppWalletTransaction_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
