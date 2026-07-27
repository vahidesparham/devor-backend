CREATE TABLE `BusinessOffer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `categoryId` INTEGER NULL,
  `title` VARCHAR(180) NOT NULL,
  `image` VARCHAR(500) NULL,
  `discountPercent` INTEGER NOT NULL,
  `scope` ENUM('ALL', 'CATEGORY', 'OFFERINGS') NOT NULL,
  `publicationStatus` ENUM('DRAFT', 'PUBLISHED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
  `startsAt` DATETIME(3) NOT NULL,
  `endsAt` DATETIME(3) NOT NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BusinessOffer_businessId_publicationStatus_startsAt_endsAt_idx`(`businessId`, `publicationStatus`, `startsAt`, `endsAt`),
  INDEX `BusinessOffer_businessId_displayOrder_idx`(`businessId`, `displayOrder`),
  INDEX `BusinessOffer_categoryId_idx`(`categoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `offerId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` VARCHAR(500) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessOfferTranslation_offerId_lang_key`(`offerId`, `lang`),
  INDEX `BusinessOfferTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `BusinessOfferTranslation_lang_isActive_idx`(`lang`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessOfferTarget` (
  `offerId` INTEGER NOT NULL,
  `offeringId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `BusinessOfferTarget_offeringId_idx`(`offeringId`),
  PRIMARY KEY (`offerId`, `offeringId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BusinessOffer`
  ADD CONSTRAINT `BusinessOffer_businessId_fkey`
  FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOffer_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `BusinessOfferingCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferTranslation`
  ADD CONSTRAINT `BusinessOfferTranslation_offerId_fkey`
  FOREIGN KEY (`offerId`) REFERENCES `BusinessOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferTranslation_lang_fkey`
  FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BusinessOfferTarget`
  ADD CONSTRAINT `BusinessOfferTarget_offerId_fkey`
  FOREIGN KEY (`offerId`) REFERENCES `BusinessOffer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessOfferTarget_offeringId_fkey`
  FOREIGN KEY (`offeringId`) REFERENCES `BusinessOffering`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `Permission` (`key`, `description`, `createdAt`)
VALUES
  ('business_offers.read', 'View business offers', CURRENT_TIMESTAMP(3)),
  ('business_offers.create', 'Create business offers', CURRENT_TIMESTAMP(3)),
  ('business_offers.update', 'Update business offers', CURRENT_TIMESTAMP(3)),
  ('business_offers.delete', 'Delete business offers', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`, `createdAt`)
SELECT `Role`.`id`, `Permission`.`id`, CURRENT_TIMESTAMP(3)
FROM `Role`
JOIN `Permission` ON `Permission`.`key` IN (
  'business_offers.read',
  'business_offers.create',
  'business_offers.update',
  'business_offers.delete'
)
WHERE `Role`.`name` = 'SUPER_ADMIN';
