-- CreateTable
CREATE TABLE `BusinessReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessId` INTEGER NOT NULL,
    `appUserId` INTEGER NOT NULL,
    `rating` DECIMAL(3, 2) NOT NULL,
    `comment` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessReview_businessId_isActive_createdAt_idx`(`businessId`, `isActive`, `createdAt`),
    INDEX `BusinessReview_appUserId_createdAt_idx`(`appUserId`, `createdAt`),
    UNIQUE INDEX `BusinessReview_businessId_appUserId_key`(`businessId`, `appUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BusinessReview` ADD CONSTRAINT `BusinessReview_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessReview` ADD CONSTRAINT `BusinessReview_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
