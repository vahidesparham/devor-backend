ALTER TABLE `BusinessOffering`
  ADD COLUMN `oldPrice` DECIMAL(12, 2) NULL,
  ADD COLUMN `preparationMinutes` INTEGER NULL,
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isPopular` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isNew` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isUnavailable` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `BusinessOfferingTranslation`
  ADD COLUMN `shortDescription` VARCHAR(320) NULL;

CREATE INDEX `BusinessOffering_isFeatured_idx` ON `BusinessOffering`(`isFeatured`);
CREATE INDEX `BusinessOffering_isPopular_idx` ON `BusinessOffering`(`isPopular`);
CREATE INDEX `BusinessOffering_isNew_idx` ON `BusinessOffering`(`isNew`);
