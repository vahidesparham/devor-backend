-- Backfill legacy ads with the first active area from their city.
UPDATE `ClassifiedAd` AS `ad`
JOIN (
    SELECT `cityId`, MIN(`id`) AS `areaId`
    FROM `Area`
    WHERE `isActive` = true
    GROUP BY `cityId`
) AS `fallback` ON `fallback`.`cityId` = `ad`.`cityId`
SET `ad`.`areaId` = `fallback`.`areaId`
WHERE `ad`.`areaId` IS NULL;

-- Neighborhood is a required part of every classified ad.
ALTER TABLE `ClassifiedAd`
    DROP FOREIGN KEY `ClassifiedAd_areaId_fkey`;

ALTER TABLE `ClassifiedAd`
    MODIFY `areaId` INTEGER NOT NULL;

ALTER TABLE `ClassifiedAd`
    ADD CONSTRAINT `ClassifiedAd_areaId_fkey`
    FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
