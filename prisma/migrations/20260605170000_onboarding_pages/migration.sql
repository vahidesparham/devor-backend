CREATE TABLE `OnboardingPage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image` VARCHAR(500) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OnboardingPage_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    INDEX `OnboardingPage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OnboardingPageTranslation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `onboardingPageId` INTEGER NOT NULL,
    `lang` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OnboardingPageTranslation_onboardingPageId_lang_key`(`onboardingPageId`, `lang`),
    INDEX `OnboardingPageTranslation_lang_title_idx`(`lang`, `title`),
    INDEX `OnboardingPageTranslation_lang_isActive_idx`(`lang`, `isActive`),
    INDEX `OnboardingPageTranslation_onboardingPageId_idx`(`onboardingPageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OnboardingPageTranslation` ADD CONSTRAINT `OnboardingPageTranslation_onboardingPageId_fkey` FOREIGN KEY (`onboardingPageId`) REFERENCES `OnboardingPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OnboardingPageTranslation` ADD CONSTRAINT `OnboardingPageTranslation_lang_fkey` FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
