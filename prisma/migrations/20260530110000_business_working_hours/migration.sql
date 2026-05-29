-- CreateTable
CREATE TABLE `BusinessWorkingHour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessId` INTEGER NOT NULL,
    `dayOfWeek` ENUM('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY') NOT NULL,
    `opensAt` VARCHAR(5) NULL,
    `closesAt` VARCHAR(5) NULL,
    `isClosed` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(255) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessWorkingHour_businessId_dayOfWeek_displayOrder_idx`(`businessId`, `dayOfWeek`, `displayOrder`),
    INDEX `BusinessWorkingHour_businessId_isClosed_idx`(`businessId`, `isClosed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BusinessWorkingHour` ADD CONSTRAINT `BusinessWorkingHour_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
