-- Each category defines the one-time fee charged when an ad is first submitted.
ALTER TABLE `ClassifiedCategory`
    ADD COLUMN `postingFee` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- Ads retain a payment snapshot so later category price changes cannot cause
-- duplicate or ambiguous charges.
ALTER TABLE `ClassifiedAd`
    ADD COLUMN `postingFee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `postingFeeCurrency` VARCHAR(10) NOT NULL DEFAULT 'TJS',
    ADD COLUMN `postingFeePaidAt` DATETIME(3) NULL,
    ADD COLUMN `postingFeeTransactionId` BIGINT NULL;

CREATE UNIQUE INDEX `ClassifiedAd_postingFeeTransactionId_key`
    ON `ClassifiedAd`(`postingFeeTransactionId`);

ALTER TABLE `ClassifiedCategory`
    ADD CONSTRAINT `chk_cls_category_posting_fee`
    CHECK (`postingFee` >= 0);

ALTER TABLE `ClassifiedAd`
    ADD CONSTRAINT `chk_cls_ad_posting_fee`
    CHECK (`postingFee` >= 0);

ALTER TABLE `ClassifiedAd`
    ADD CONSTRAINT `ClassifiedAd_postingFeeTransactionId_fkey`
    FOREIGN KEY (`postingFeeTransactionId`)
    REFERENCES `AppWalletTransaction`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
