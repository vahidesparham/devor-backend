-- Classified settings must remain within operationally safe bounds.
ALTER TABLE `ClassifiedSetting`
    ADD CONSTRAINT `chk_cls_settings_publication` CHECK (`publicationDays` > 0),
    ADD CONSTRAINT `chk_cls_settings_images` CHECK (
        `minImagesPerAd` >= 0
        AND `maxImagesPerAd` > 0
        AND `minImagesPerAd` <= `maxImagesPerAd`
    ),
    ADD CONSTRAINT `chk_cls_settings_limits` CHECK (
        `maxActiveAdsPerAppUser` > 0
        AND `maxDraftAdsPerAppUser` > 0
        AND `maxTitleLength` >= 3
        AND `maxDescriptionLength` >= 10
        AND `viewDeduplicationMinutes` > 0
    );

-- Attribute validation ranges cannot contradict themselves.
ALTER TABLE `ClassifiedAttribute`
    ADD CONSTRAINT `chk_cls_attribute_number_range` CHECK (
        `minValue` IS NULL OR `maxValue` IS NULL OR `minValue` <= `maxValue`
    ),
    ADD CONSTRAINT `chk_cls_attribute_length_range` CHECK (
        (`minLength` IS NULL OR `minLength` >= 0)
        AND (`maxLength` IS NULL OR `maxLength` >= 0)
        AND (`minLength` IS NULL OR `maxLength` IS NULL OR `minLength` <= `maxLength`)
    );

-- Business invariants that do not involve foreign-key columns are enforced here.
-- MySQL disallows CHECK constraints on columns used by cascading foreign keys,
-- so owner and typed attribute-value invariants remain service-enforced.
ALTER TABLE `ClassifiedAd`
    ADD CONSTRAINT `chk_cls_ad_price` CHECK (
        (`priceType` IN ('FIXED', 'NEGOTIABLE') AND `price` IS NOT NULL AND `price` > 0)
        OR
        (`priceType` IN ('FREE', 'CONTACT') AND `price` IS NULL)
    ),
    ADD CONSTRAINT `chk_cls_ad_coordinates_pair` CHECK (
        (`latitude` IS NULL AND `longitude` IS NULL)
        OR
        (`latitude` IS NOT NULL AND `longitude` IS NOT NULL)
    ),
    ADD CONSTRAINT `chk_cls_ad_coordinates_range` CHECK (
        (`latitude` IS NULL OR (`latitude` BETWEEN -90 AND 90))
        AND
        (`longitude` IS NULL OR (`longitude` BETWEEN -180 AND 180))
    ),
    ADD CONSTRAINT `chk_cls_ad_counters` CHECK (
        `version` > 0
        AND `viewCount` >= 0
        AND `favoriteCount` >= 0
        AND `reportCount` >= 0
    );

ALTER TABLE `ClassifiedAdImage`
    ADD CONSTRAINT `chk_cls_ad_image_order` CHECK (`displayOrder` >= 0),
    ADD CONSTRAINT `chk_cls_ad_image_dimensions` CHECK (
        (`width` IS NULL OR `width` > 0)
        AND (`height` IS NULL OR `height` > 0)
    );

ALTER TABLE `ClassifiedAdStatusHistory`
    ADD CONSTRAINT `chk_cls_status_history_change` CHECK (
        `fromStatus` IS NULL OR `fromStatus` <> `toStatus`
    );

ALTER TABLE `ClassifiedAdViewDaily`
    ADD CONSTRAINT `chk_cls_daily_counters` CHECK (
        `viewCount` >= 0 AND `contactCount` >= 0
    );
