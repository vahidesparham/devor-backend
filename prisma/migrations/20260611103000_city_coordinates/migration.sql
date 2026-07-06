ALTER TABLE `City`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

UPDATE `City`
SET `latitude` = 35.6892000,
    `longitude` = 51.3890000
WHERE `code` = 'tehran'
  AND `latitude` IS NULL
  AND `longitude` IS NULL;
