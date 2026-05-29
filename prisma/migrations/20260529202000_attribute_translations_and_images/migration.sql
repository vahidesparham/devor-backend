-- AlterTable
ALTER TABLE `AttributeGroup`
    CHANGE COLUMN `icon` `image` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `AttributeGroupTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AttributeGroupTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `AttributeGroupTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `AttributeGroupTranslation_groupId_lang_key`(`groupId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeOptionTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `optionId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AttributeOptionTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `AttributeOptionTranslation_lang_isActive_idx`(`lang`, `isActive`),
    UNIQUE INDEX `AttributeOptionTranslation_optionId_lang_key`(`optionId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill translations using existing fallback titles for every active language.
INSERT INTO `AttributeGroupTranslation` (`groupId`, `lang`, `title`, `isActive`, `createdAt`, `updatedAt`)
SELECT `AttributeGroup`.`id`, `Language`.`code`, `AttributeGroup`.`title`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `AttributeGroup`
JOIN `Language` ON `Language`.`isActive` = true;

INSERT INTO `AttributeOptionTranslation` (`optionId`, `lang`, `title`, `isActive`, `createdAt`, `updatedAt`)
SELECT `AttributeOption`.`id`, `Language`.`code`, `AttributeOption`.`title`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `AttributeOption`
JOIN `Language` ON `Language`.`isActive` = true;

-- AddForeignKey
ALTER TABLE `AttributeGroupTranslation` ADD CONSTRAINT `AttributeGroupTranslation_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `AttributeGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeGroupTranslation` ADD CONSTRAINT `AttributeGroupTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeOptionTranslation` ADD CONSTRAINT `AttributeOptionTranslation_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `AttributeOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeOptionTranslation` ADD CONSTRAINT `AttributeOptionTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
