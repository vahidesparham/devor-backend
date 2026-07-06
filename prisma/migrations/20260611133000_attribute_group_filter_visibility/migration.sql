ALTER TABLE `AttributeGroup`
  ADD COLUMN `showInFilters` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `AttrGroup_filter_idx`
  ON `AttributeGroup`(`serviceTypeId`, `showInFilters`, `isActive`, `displayOrder`);
