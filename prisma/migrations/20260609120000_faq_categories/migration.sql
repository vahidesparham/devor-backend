CREATE TABLE `FaqCategory` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `image` VARCHAR(500) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `FaqCategory_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
  INDEX `FaqCategory_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FaqCategoryTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `faqCategoryId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `FaqCategoryTranslation_faqCategoryId_lang_key`(`faqCategoryId`, `lang`),
  INDEX `FaqCategoryTranslation_lang_title_idx`(`lang`, `title`),
  INDEX `FaqCategoryTranslation_lang_isActive_idx`(`lang`, `isActive`),
  INDEX `FaqCategoryTranslation_faqCategoryId_idx`(`faqCategoryId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FaqCategoryTranslation`
  ADD CONSTRAINT `FaqCategoryTranslation_faqCategoryId_fkey`
  FOREIGN KEY (`faqCategoryId`) REFERENCES `FaqCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FaqCategoryTranslation`
  ADD CONSTRAINT `FaqCategoryTranslation_lang_fkey`
  FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
