ALTER TABLE `ServiceType` ADD COLUMN `parentId` INTEGER NULL;

CREATE INDEX `ServiceType_parentId_isActive_displayOrder_idx`
  ON `ServiceType`(`parentId`, `isActive`, `displayOrder`);

ALTER TABLE `ServiceType`
  ADD CONSTRAINT `ServiceType_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `ServiceType`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
