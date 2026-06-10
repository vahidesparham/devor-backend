-- CreateTable
CREATE TABLE `BlogPost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image` VARCHAR(500) NULL,
    `readingMinutes` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlogPost_isActive_idx`(`isActive`),
    INDEX `BlogPost_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPostTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blogPostId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `shortDescription` VARCHAR(500) NULL,
    `body` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlogPostTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `BlogPostTranslation_lang_isActive_idx`(`lang`, `isActive`),
    INDEX `BlogPostTranslation_blogPostId_idx`(`blogPostId`),
    UNIQUE INDEX `BlogPostTranslation_blogPostId_lang_key`(`blogPostId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BlogPostTranslation` ADD CONSTRAINT `BlogPostTranslation_blogPostId_fkey` FOREIGN KEY (`blogPostId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostTranslation` ADD CONSTRAINT `BlogPostTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
