-- AlterTable
ALTER TABLE `Business`
    CHANGE COLUMN `primaryImage` `coverImage` VARCHAR(500) NULL,
    ADD COLUMN `logoImage` VARCHAR(500) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `economicLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `showInLatest` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `BusinessTranslation`
    DROP COLUMN `seoTitle`,
    DROP COLUMN `seoDescription`;

-- CreateIndex
CREATE INDEX `Business_showInLatest_idx` ON `Business`(`showInLatest`);
