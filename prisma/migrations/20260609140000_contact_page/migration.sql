CREATE TABLE `ContactPage` (
  `id` INTEGER NOT NULL,
  `instagram` VARCHAR(500) NULL,
  `telegram` VARCHAR(500) NULL,
  `whatsapp` VARCHAR(500) NULL,
  `youtube` VARCHAR(500) NULL,
  `tiktok` VARCHAR(500) NULL,
  `email` VARCHAR(191) NULL,
  `supportPhoneNumber` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContactPageTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `contactPageId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `phoneNumber` VARCHAR(80) NULL,
  `address` TEXT NULL,
  `workingHours` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ContactPageTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `ContactPageTranslation_lang_isActive_idx`(`lang`, `isActive`),
  INDEX `ContactPageTranslation_contactPageId_idx`(`contactPageId`),
  UNIQUE INDEX `ContactPageTranslation_contactPageId_lang_key`(`contactPageId`, `lang`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContactPageTranslation`
  ADD CONSTRAINT `ContactPageTranslation_contactPageId_fkey`
  FOREIGN KEY (`contactPageId`) REFERENCES `ContactPage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ContactPageTranslation`
  ADD CONSTRAINT `ContactPageTranslation_lang_fkey`
  FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
