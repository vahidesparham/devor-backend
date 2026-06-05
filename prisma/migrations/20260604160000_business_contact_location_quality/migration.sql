ALTER TABLE `Business`
  ADD COLUMN `timezone` VARCHAR(80) NULL,
  ADD COLUMN `mapProvider` VARCHAR(80) NULL,
  ADD COLUMN `mapPlaceId` VARCHAR(191) NULL,
  ADD COLUMN `mapUrl` VARCHAR(500) NULL,
  ADD COLUMN `routeUrl` VARCHAR(500) NULL;

CREATE TABLE `BusinessContactLink` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `type` ENUM('PHONE', 'MOBILE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'EMAIL', 'MAP', 'CUSTOM') NOT NULL,
  `label` VARCHAR(120) NULL,
  `value` VARCHAR(255) NULL,
  `url` VARCHAR(500) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `BusinessContactLink_businessId_isActive_displayOrder_idx` (`businessId`, `isActive`, `displayOrder`),
  INDEX `BusinessContactLink_businessId_type_idx` (`businessId`, `type`),
  INDEX `BusinessContactLink_type_isActive_idx` (`type`, `isActive`),
  CONSTRAINT `BusinessContactLink_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
