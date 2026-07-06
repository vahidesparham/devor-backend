CREATE TABLE `AppFavoriteBusiness` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appUserId` INTEGER NOT NULL,
    `businessId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AppFavoriteBusiness_appUserId_businessId_key`(`appUserId`, `businessId`),
    INDEX `AppFavoriteBusiness_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AppFavoriteBusiness` ADD CONSTRAINT `AppFavoriteBusiness_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AppFavoriteBusiness` ADD CONSTRAINT `AppFavoriteBusiness_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
