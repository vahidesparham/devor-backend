-- CreateTable
CREATE TABLE `ClassifiedSetting` (
    `id` INTEGER NOT NULL,
    `contentLanguage` VARCHAR(20) NOT NULL DEFAULT 'fa',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    `publicationDays` INTEGER NOT NULL DEFAULT 30,
    `maxImagesPerAd` INTEGER NOT NULL DEFAULT 10,
    `minImagesPerAd` INTEGER NOT NULL DEFAULT 1,
    `maxActiveAdsPerAppUser` INTEGER NOT NULL DEFAULT 5,
    `maxDraftAdsPerAppUser` INTEGER NOT NULL DEFAULT 10,
    `maxTitleLength` INTEGER NOT NULL DEFAULT 100,
    `maxDescriptionLength` INTEGER NOT NULL DEFAULT 2000,
    `requireModeration` BOOLEAN NOT NULL DEFAULT true,
    `allowPhoneContact` BOOLEAN NOT NULL DEFAULT true,
    `allowChatContact` BOOLEAN NOT NULL DEFAULT false,
    `allowBusinessClassifieds` BOOLEAN NOT NULL DEFAULT false,
    `viewDeduplicationMinutes` INTEGER NOT NULL DEFAULT 30,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NULL,
    `code` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` VARCHAR(500) NULL,
    `image` VARCHAR(500) NULL,
    `color` VARCHAR(30) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `allowAds` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClassifiedCategory_code_key`(`code`),
    UNIQUE INDEX `ClassifiedCategory_slug_key`(`slug`),
    INDEX `ClassifiedCategory_parentId_isActive_displayOrder_idx`(`parentId`, `isActive`, `displayOrder`),
    INDEX `ClassifiedCategory_isActive_allowAds_displayOrder_idx`(`isActive`, `allowAds`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAttribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `type` ENUM('SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN') NOT NULL,
    `unit` VARCHAR(60) NULL,
    `placeholder` VARCHAR(255) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `showInFilters` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `minValue` DECIMAL(14, 2) NULL,
    `maxValue` DECIMAL(14, 2) NULL,
    `minLength` INTEGER NULL,
    `maxLength` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassifiedAttribute_categoryId_isActive_displayOrder_idx`(`categoryId`, `isActive`, `displayOrder`),
    INDEX `ClassifiedAttribute_categoryId_showInFilters_isActive_idx`(`categoryId`, `showInFilters`, `isActive`),
    UNIQUE INDEX `ClassifiedAttribute_categoryId_code_key`(`categoryId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAttributeOption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attributeId` INTEGER NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `image` VARCHAR(500) NULL,
    `color` VARCHAR(30) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassifiedAttributeOption_attributeId_isActive_displayOrder_idx`(`attributeId`, `isActive`, `displayOrder`),
    UNIQUE INDEX `ClassifiedAttributeOption_attributeId_code_key`(`attributeId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAd` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `publicCode` VARCHAR(24) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `ownerType` ENUM('APP_USER', 'BUSINESS') NOT NULL,
    `appUserId` INTEGER NULL,
    `businessId` INTEGER NULL,
    `countryId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
    `areaId` INTEGER NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `priceType` ENUM('FIXED', 'NEGOTIABLE', 'FREE', 'CONTACT') NOT NULL,
    `price` DECIMAL(14, 2) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    `contactName` VARCHAR(120) NULL,
    `contactPhone` VARCHAR(80) NOT NULL,
    `allowPhone` BOOLEAN NOT NULL DEFAULT true,
    `allowChat` BOOLEAN NOT NULL DEFAULT false,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `locationPrecision` ENUM('APPROXIMATE', 'EXACT') NOT NULL DEFAULT 'APPROXIMATE',
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'PAUSED', 'SOLD', 'EXPIRED', 'ARCHIVED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `soldAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `moderationNote` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `favoriteCount` INTEGER NOT NULL DEFAULT 0,
    `reportCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClassifiedAd_publicCode_key`(`publicCode`),
    INDEX `ClassifiedAd_status_cityId_publishedAt_idx`(`status`, `cityId`, `publishedAt`),
    INDEX `ClassifiedAd_status_categoryId_publishedAt_idx`(`status`, `categoryId`, `publishedAt`),
    INDEX `ClassifiedAd_status_cityId_categoryId_publishedAt_idx`(`status`, `cityId`, `categoryId`, `publishedAt`),
    INDEX `ClassifiedAd_appUserId_status_updatedAt_idx`(`appUserId`, `status`, `updatedAt`),
    INDEX `ClassifiedAd_businessId_status_updatedAt_idx`(`businessId`, `status`, `updatedAt`),
    INDEX `ClassifiedAd_priceType_price_idx`(`priceType`, `price`),
    INDEX `ClassifiedAd_expiresAt_status_idx`(`expiresAt`, `status`),
    INDEX `ClassifiedAd_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAdImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `thumbnailUrl` VARCHAR(500) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassifiedAdImage_adId_displayOrder_idx`(`adId`, `displayOrder`),
    INDEX `ClassifiedAdImage_adId_isCover_idx`(`adId`, `isCover`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAdAttributeValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adId` INTEGER NOT NULL,
    `attributeId` INTEGER NOT NULL,
    `optionId` INTEGER NULL,
    `textValue` TEXT NULL,
    `numberValue` DECIMAL(14, 2) NULL,
    `booleanValue` BOOLEAN NULL,

    INDEX `ClassifiedAdAttributeValue_adId_attributeId_idx`(`adId`, `attributeId`),
    INDEX `ClassifiedAdAttributeValue_attributeId_optionId_idx`(`attributeId`, `optionId`),
    INDEX `ClassifiedAdAttributeValue_attributeId_numberValue_idx`(`attributeId`, `numberValue`),
    INDEX `ClassifiedAdAttributeValue_attributeId_booleanValue_idx`(`attributeId`, `booleanValue`),
    UNIQUE INDEX `ClassifiedAdAttributeValue_adId_attributeId_optionId_key`(`adId`, `attributeId`, `optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedFavorite` (
    `appUserId` INTEGER NOT NULL,
    `adId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClassifiedFavorite_adId_createdAt_idx`(`adId`, `createdAt`),
    PRIMARY KEY (`appUserId`, `adId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adId` INTEGER NOT NULL,
    `reporterAppUserId` INTEGER NULL,
    `reasonCode` VARCHAR(80) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `status` ENUM('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `reviewedByAdminId` INTEGER NULL,
    `resolutionNote` VARCHAR(1000) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassifiedReport_adId_status_createdAt_idx`(`adId`, `status`, `createdAt`),
    INDEX `ClassifiedReport_reporterAppUserId_createdAt_idx`(`reporterAppUserId`, `createdAt`),
    INDEX `ClassifiedReport_reviewedByAdminId_status_idx`(`reviewedByAdminId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAdStatusHistory` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `adId` INTEGER NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'PAUSED', 'SOLD', 'EXPIRED', 'ARCHIVED', 'SUSPENDED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'PAUSED', 'SOLD', 'EXPIRED', 'ARCHIVED', 'SUSPENDED') NOT NULL,
    `actorType` ENUM('APP_USER', 'BUSINESS_USER', 'ADMIN', 'SYSTEM') NOT NULL,
    `actorId` VARCHAR(120) NULL,
    `reasonCode` VARCHAR(80) NULL,
    `note` VARCHAR(1000) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClassifiedAdStatusHistory_adId_createdAt_idx`(`adId`, `createdAt`),
    INDEX `ClassifiedAdStatusHistory_toStatus_createdAt_idx`(`toStatus`, `createdAt`),
    INDEX `ClassifiedAdStatusHistory_actorType_actorId_idx`(`actorType`, `actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassifiedAdViewDaily` (
    `adId` INTEGER NOT NULL,
    `viewDate` DATE NOT NULL,
    `source` VARCHAR(40) NOT NULL DEFAULT 'unknown',
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `contactCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassifiedAdViewDaily_viewDate_source_idx`(`viewDate`, `source`),
    PRIMARY KEY (`adId`, `viewDate`, `source`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClassifiedCategory` ADD CONSTRAINT `ClassifiedCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ClassifiedCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAttribute` ADD CONSTRAINT `ClassifiedAttribute_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ClassifiedCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAttributeOption` ADD CONSTRAINT `ClassifiedAttributeOption_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `ClassifiedAttribute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ClassifiedCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAd` ADD CONSTRAINT `ClassifiedAd_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdImage` ADD CONSTRAINT `ClassifiedAdImage_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdAttributeValue` ADD CONSTRAINT `ClassifiedAdAttributeValue_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdAttributeValue` ADD CONSTRAINT `ClassifiedAdAttributeValue_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `ClassifiedAttribute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdAttributeValue` ADD CONSTRAINT `ClassifiedAdAttributeValue_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `ClassifiedAttributeOption`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedFavorite` ADD CONSTRAINT `ClassifiedFavorite_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedFavorite` ADD CONSTRAINT `ClassifiedFavorite_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedReport` ADD CONSTRAINT `ClassifiedReport_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedReport` ADD CONSTRAINT `ClassifiedReport_reporterAppUserId_fkey` FOREIGN KEY (`reporterAppUserId`) REFERENCES `AppUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedReport` ADD CONSTRAINT `ClassifiedReport_reviewedByAdminId_fkey` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdStatusHistory` ADD CONSTRAINT `ClassifiedAdStatusHistory_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassifiedAdViewDaily` ADD CONSTRAINT `ClassifiedAdViewDaily_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
