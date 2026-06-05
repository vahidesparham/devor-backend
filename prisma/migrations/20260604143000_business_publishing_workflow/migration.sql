ALTER TABLE `Business`
  ADD COLUMN `publicationStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewNote` VARCHAR(500) NULL;

CREATE INDEX `Business_publicationStatus_isActive_displayOrder_idx` ON `Business`(`publicationStatus`, `isActive`, `displayOrder`);
