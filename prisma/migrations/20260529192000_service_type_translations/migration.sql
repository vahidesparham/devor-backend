-- AlterTable
ALTER TABLE `servicetype` ADD COLUMN `image` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `ServiceTypeTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceTypeId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceTypeTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `ServiceTypeTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `ServiceTypeTranslation_serviceTypeId_lang_key`(`serviceTypeId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceTypeTranslation` ADD CONSTRAINT `ServiceTypeTranslation_serviceTypeId_fkey` FOREIGN KEY (`serviceTypeId`) REFERENCES `ServiceType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTypeTranslation` ADD CONSTRAINT `ServiceTypeTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
