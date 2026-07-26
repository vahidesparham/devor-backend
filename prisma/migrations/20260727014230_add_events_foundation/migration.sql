-- CreateTable
CREATE TABLE `EventCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(80) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EventCategory_code_key`(`code`),
    INDEX `EventCategory_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    INDEX `EventCategory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventCategoryTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventCategoryId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventCategoryTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `EventCategoryTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `EventCategoryTranslation_eventCategoryId_lang_key`(`eventCategoryId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
    `areaId` INTEGER NULL,
    `organizerType` ENUM('ADMIN', 'BUSINESS', 'APP_USER') NOT NULL DEFAULT 'ADMIN',
    `createdByAdminId` INTEGER NOT NULL,
    `businessId` INTEGER NULL,
    `appUserId` INTEGER NULL,
    `coverImage` VARCHAR(500) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `priceType` ENUM('FREE', 'PAID') NOT NULL DEFAULT 'FREE',
    `price` DECIMAL(14, 2) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    `contactPhone` VARCHAR(80) NULL,
    `externalUrl` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Event_categoryId_status_isActive_startsAt_idx`(`categoryId`, `status`, `isActive`, `startsAt`),
    INDEX `Event_cityId_status_startsAt_idx`(`cityId`, `status`, `startsAt`),
    INDEX `Event_areaId_idx`(`areaId`),
    INDEX `Event_status_isActive_endsAt_idx`(`status`, `isActive`, `endsAt`),
    INDEX `Event_isFeatured_status_startsAt_idx`(`isFeatured`, `status`, `startsAt`),
    INDEX `Event_businessId_idx`(`businessId`),
    INDEX `Event_appUserId_idx`(`appUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `description` LONGTEXT NULL,
    `address` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `EventTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `EventTranslation_eventId_lang_key`(`eventId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventCategoryTranslation` ADD CONSTRAINT `EventCategoryTranslation_eventCategoryId_fkey` FOREIGN KEY (`eventCategoryId`) REFERENCES `EventCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventCategoryTranslation` ADD CONSTRAINT `EventCategoryTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `EventCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventTranslation` ADD CONSTRAINT `EventTranslation_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventTranslation` ADD CONSTRAINT `EventTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
