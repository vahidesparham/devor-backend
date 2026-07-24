-- Keep configurable limits aligned with the persisted columns and API schemas.
ALTER TABLE `ClassifiedSetting`
    DROP CHECK `chk_cls_settings_images`,
    DROP CHECK `chk_cls_settings_limits`;

ALTER TABLE `ClassifiedSetting`
    ADD CONSTRAINT `chk_cls_settings_images` CHECK (
        `minImagesPerAd` >= 0
        AND `maxImagesPerAd` > 0
        AND `maxImagesPerAd` <= 100
        AND `minImagesPerAd` <= `maxImagesPerAd`
    ),
    ADD CONSTRAINT `chk_cls_settings_limits` CHECK (
        `maxActiveAdsPerAppUser` > 0
        AND `maxDraftAdsPerAppUser` > 0
        AND `maxTitleLength` BETWEEN 3 AND 120
        AND `maxDescriptionLength` BETWEEN 10 AND 10000
        AND `viewDeduplicationMinutes` > 0
    );
