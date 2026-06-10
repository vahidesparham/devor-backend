CREATE TABLE `ContentPage` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(160) NOT NULL,
  `image` VARCHAR(500) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ContentPage_slug_key`(`slug`),
  INDEX `ContentPage_isActive_idx`(`isActive`),
  INDEX `ContentPage_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContentPageTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `contentPageId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ContentPageTranslation_contentPageId_lang_key`(`contentPageId`, `lang`),
  INDEX `ContentPageTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `ContentPageTranslation_lang_isActive_idx`(`lang`, `isActive`),
  INDEX `ContentPageTranslation_contentPageId_idx`(`contentPageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContentPageTranslation`
  ADD CONSTRAINT `ContentPageTranslation_contentPageId_fkey`
  FOREIGN KEY (`contentPageId`) REFERENCES `ContentPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ContentPageTranslation`
  ADD CONSTRAINT `ContentPageTranslation_lang_fkey`
  FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
