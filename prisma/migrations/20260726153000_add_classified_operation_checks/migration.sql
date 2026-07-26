ALTER TABLE `ClassifiedSetting`
  ADD CONSTRAINT `chk_cls_settings_report_limit`
    CHECK (`maxReportsPerUserPerDay` BETWEEN 1 AND 100),
  ADD CONSTRAINT `chk_cls_settings_media_grace`
    CHECK (`mediaCleanupGraceHours` BETWEEN 1 AND 720);
