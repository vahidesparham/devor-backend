ALTER TABLE `Business`
  ADD COLUMN `operationMode` ENUM('INFO_ONLY', 'SHOWCASE', 'ORDERING', 'BOOKING', 'ORDERING_AND_BOOKING') NOT NULL DEFAULT 'INFO_ONLY';

CREATE TABLE `BusinessUser` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(80) NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(100) NULL,
  `lastName` VARCHAR(100) NULL,
  `role` ENUM('OWNER', 'MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessUser_businessId_email_key`(`businessId`, `email`),
  INDEX `BusinessUser_businessId_role_idx`(`businessId`, `role`),
  INDEX `BusinessUser_email_idx`(`email`),
  INDEX `BusinessUser_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Business_operationMode_idx` ON `Business`(`operationMode`);

ALTER TABLE `BusinessUser`
  ADD CONSTRAINT `BusinessUser_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
