CREATE TABLE `BusinessOfferingCategory` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `image` VARCHAR(500) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BusinessOfferingCategory_businessId_isActive_displayOrder_idx`(`businessId`, `isActive`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingCategoryTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `categoryId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessOfferingCategoryTranslation_categoryId_lang_key`(`categoryId`, `lang`),
  INDEX `BusinessOfferingCategoryTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `BusinessOfferingCategoryTranslation_lang_isActive_idx`(`lang`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOffering` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `categoryId` INTEGER NULL,
  `title` VARCHAR(180) NOT NULL,
  `image` VARCHAR(500) NULL,
  `basePrice` DECIMAL(12, 2) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BusinessOffering_businessId_isActive_displayOrder_idx`(`businessId`, `isActive`, `displayOrder`),
  INDEX `BusinessOffering_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `offeringId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessOfferingTranslation_offeringId_lang_key`(`offeringId`, `lang`),
  INDEX `BusinessOfferingTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `BusinessOfferingTranslation_lang_isActive_idx`(`lang`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingOptionGroup` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `offeringId` INTEGER NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `selectionMode` ENUM('SINGLE', 'MULTIPLE') NOT NULL DEFAULT 'MULTIPLE',
  `isRequired` BOOLEAN NOT NULL DEFAULT false,
  `minSelect` INTEGER NOT NULL DEFAULT 0,
  `maxSelect` INTEGER NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BusinessOfferingOptionGroup_offeringId_isActive_displayOrder_idx`(`offeringId`, `isActive`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingOptionGroupTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `groupId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessOfferingOptionGroupTranslation_groupId_lang_key`(`groupId`, `lang`),
  INDEX `BusinessOfferingOptionGroupTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `BusinessOfferingOptionGroupTranslation_lang_isActive_idx`(`lang`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingOption` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `groupId` INTEGER NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `priceDelta` DECIMAL(12, 2) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BusinessOfferingOption_groupId_isActive_displayOrder_idx`(`groupId`, `isActive`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferingOptionTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `optionId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessOfferingOptionTranslation_optionId_lang_key`(`optionId`, `lang`),
  INDEX `BusinessOfferingOptionTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `BusinessOfferingOptionTranslation_lang_isActive_idx`(`lang`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BusinessOfferingCategory`
  ADD CONSTRAINT `BusinessOfferingCategory_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingCategoryTranslation`
  ADD CONSTRAINT `BusinessOfferingCategoryTranslation_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BusinessOfferingCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferingCategoryTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BusinessOffering`
  ADD CONSTRAINT `BusinessOffering_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOffering_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BusinessOfferingCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingTranslation`
  ADD CONSTRAINT `BusinessOfferingTranslation_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `BusinessOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferingTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingOptionGroup`
  ADD CONSTRAINT `BusinessOfferingOptionGroup_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `BusinessOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingOptionGroupTranslation`
  ADD CONSTRAINT `BusinessOfferingOptionGroupTranslation_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `BusinessOfferingOptionGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferingOptionGroupTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingOption`
  ADD CONSTRAINT `BusinessOfferingOption_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `BusinessOfferingOptionGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferingOptionTranslation`
  ADD CONSTRAINT `BusinessOfferingOptionTranslation_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `BusinessOfferingOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferingOptionTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
