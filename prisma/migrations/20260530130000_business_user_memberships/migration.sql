RENAME TABLE `BusinessUser` TO `BusinessUserLegacy`;

CREATE TABLE `BusinessUser` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(80) NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(100) NULL,
  `lastName` VARCHAR(100) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessUser_email_key`(`email`),
  INDEX `BusinessUser_email_idx`(`email`),
  INDEX `BusinessUser_phone_idx`(`phone`),
  INDEX `BusinessUser_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `BusinessUser` (`email`, `phone`, `passwordHash`, `firstName`, `lastName`, `isActive`, `createdAt`, `updatedAt`)
SELECT legacy.`email`, legacy.`phone`, legacy.`passwordHash`, legacy.`firstName`, legacy.`lastName`, legacy.`isActive`, legacy.`createdAt`, legacy.`updatedAt`
FROM `BusinessUserLegacy` legacy
INNER JOIN (
  SELECT `email`, MIN(`id`) AS `id`
  FROM `BusinessUserLegacy`
  GROUP BY `email`
) picked ON picked.`id` = legacy.`id`;

CREATE TABLE `BusinessMembership` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `role` ENUM('OWNER', 'MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessMembership_businessId_userId_key`(`businessId`, `userId`),
  INDEX `BusinessMembership_businessId_role_idx`(`businessId`, `role`),
  INDEX `BusinessMembership_userId_role_idx`(`userId`, `role`),
  INDEX `BusinessMembership_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `BusinessMembership` (`businessId`, `userId`, `role`, `isActive`, `createdAt`, `updatedAt`)
SELECT legacy.`businessId`, userAccount.`id`, legacy.`role`, legacy.`isActive`, legacy.`createdAt`, legacy.`updatedAt`
FROM `BusinessUserLegacy` legacy
INNER JOIN `BusinessUser` userAccount ON userAccount.`email` = legacy.`email`;

ALTER TABLE `BusinessMembership`
  ADD CONSTRAINT `BusinessMembership_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `BusinessUserLegacy`;
