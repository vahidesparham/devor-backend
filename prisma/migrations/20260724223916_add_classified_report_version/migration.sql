ALTER TABLE `ClassifiedReport`
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

ALTER TABLE `ClassifiedReport`
    ADD CONSTRAINT `chk_cls_report_version`
    CHECK (`version` > 0);
