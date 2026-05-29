-- CreateTable
CREATE TABLE `ServiceType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(80) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `icon` VARCHAR(120) NULL,
    `color` VARCHAR(30) NULL,
    `description` VARCHAR(500) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceType_code_key`(`code`),
    INDEX `ServiceType_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureDefinition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceTypeId` INTEGER NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `icon` VARCHAR(120) NULL,
    `description` VARCHAR(500) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeatureDefinition_serviceTypeId_isActive_displayOrder_idx`(`serviceTypeId`, `isActive`, `displayOrder`),
    UNIQUE INDEX `FeatureDefinition_serviceTypeId_key_key`(`serviceTypeId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceTypeId` INTEGER NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `icon` VARCHAR(120) NULL,
    `selectionMode` ENUM('SINGLE', 'MULTIPLE') NOT NULL DEFAULT 'MULTIPLE',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AttributeGroup_serviceTypeId_isActive_displayOrder_idx`(`serviceTypeId`, `isActive`, `displayOrder`),
    UNIQUE INDEX `AttributeGroup_serviceTypeId_code_key`(`serviceTypeId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeOption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `icon` VARCHAR(120) NULL,
    `color` VARCHAR(30) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AttributeOption_groupId_isActive_displayOrder_idx`(`groupId`, `isActive`, `displayOrder`),
    UNIQUE INDEX `AttributeOption_groupId_key_key`(`groupId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Business` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceTypeId` INTEGER NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `primaryImage` VARCHAR(500) NULL,
    `phone` VARCHAR(80) NULL,
    `website` VARCHAR(500) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Business_slug_key`(`slug`),
    INDEX `Business_serviceTypeId_isActive_displayOrder_idx`(`serviceTypeId`, `isActive`, `displayOrder`),
    INDEX `Business_isFeatured_idx`(`isFeatured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `address` VARCHAR(500) NULL,
    `seoTitle` VARCHAR(255) NULL,
    `seoDescription` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `BusinessTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `BusinessTranslation_businessId_lang_key`(`businessId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessGallery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessId` INTEGER NOT NULL,
    `image` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(255) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessGallery_businessId_displayOrder_idx`(`businessId`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessFeature` (
    `businessId` INTEGER NOT NULL,
    `featureDefinitionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`businessId`, `featureDefinitionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessAttribute` (
    `businessId` INTEGER NOT NULL,
    `attributeOptionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`businessId`, `attributeOptionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeatureDefinition` ADD CONSTRAINT `FeatureDefinition_serviceTypeId_fkey` FOREIGN KEY (`serviceTypeId`) REFERENCES `ServiceType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeGroup` ADD CONSTRAINT `AttributeGroup_serviceTypeId_fkey` FOREIGN KEY (`serviceTypeId`) REFERENCES `ServiceType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeOption` ADD CONSTRAINT `AttributeOption_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `AttributeGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Business` ADD CONSTRAINT `Business_serviceTypeId_fkey` FOREIGN KEY (`serviceTypeId`) REFERENCES `ServiceType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessTranslation` ADD CONSTRAINT `BusinessTranslation_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessTranslation` ADD CONSTRAINT `BusinessTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessGallery` ADD CONSTRAINT `BusinessGallery_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessFeature` ADD CONSTRAINT `BusinessFeature_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessFeature` ADD CONSTRAINT `BusinessFeature_featureDefinitionId_fkey` FOREIGN KEY (`featureDefinitionId`) REFERENCES `FeatureDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAttribute` ADD CONSTRAINT `BusinessAttribute_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessAttribute` ADD CONSTRAINT `BusinessAttribute_attributeOptionId_fkey` FOREIGN KEY (`attributeOptionId`) REFERENCES `AttributeOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
