CREATE TABLE `Faq` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `categoryId` INTEGER NOT NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Faq_categoryId_isActive_displayOrder_idx`(`categoryId`, `isActive`, `displayOrder`),
  INDEX `Faq_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FaqTranslation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `faqId` INTEGER NOT NULL,
  `lang` VARCHAR(20) NOT NULL,
  `question` VARCHAR(500) NOT NULL,
  `answer` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `FaqTranslation_faqId_lang_key`(`faqId`, `lang`),
  INDEX `FaqTranslation_lang_question_idx`(`lang`, `question`),
  INDEX `FaqTranslation_lang_isActive_idx`(`lang`, `isActive`),
  INDEX `FaqTranslation_faqId_idx`(`faqId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Faq`
  ADD CONSTRAINT `Faq_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `FaqCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FaqTranslation`
  ADD CONSTRAINT `FaqTranslation_faqId_fkey`
  FOREIGN KEY (`faqId`) REFERENCES `Faq`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FaqTranslation`
  ADD CONSTRAINT `FaqTranslation_lang_fkey`
  FOREIGN KEY (`lang`) REFERENCES `Language`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
