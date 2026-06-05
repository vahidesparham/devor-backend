ALTER TABLE `AttributeGroup`
  ADD COLUMN `fieldType` ENUM('OPTION', 'TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT') NOT NULL DEFAULT 'OPTION',
  ADD COLUMN `unit` VARCHAR(60) NULL,
  ADD COLUMN `isRequired` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `BusinessAttributeValue` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `groupId` INTEGER NOT NULL,
  `textValue` TEXT NULL,
  `numberValue` DECIMAL(14, 4) NULL,
  `booleanValue` BOOLEAN NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `BusinessAttributeValue_businessId_groupId_key` (`businessId`, `groupId`),
  INDEX `BusinessAttributeValue_businessId_idx` (`businessId`),
  INDEX `BusinessAttributeValue_groupId_idx` (`groupId`),
  CONSTRAINT `BusinessAttributeValue_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BusinessAttributeValue_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `AttributeGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
