ALTER TABLE `ClassifiedAttribute`
  ADD COLUMN `dependsOnAttributeId` INTEGER NULL;

ALTER TABLE `ClassifiedAttributeOption`
  ADD COLUMN `parentOptionId` INTEGER NULL;

CREATE INDEX `ClassifiedAttribute_dependsOnAttributeId_idx`
  ON `ClassifiedAttribute`(`dependsOnAttributeId`);

CREATE INDEX `ClassifiedAttributeOption_parentOptionId_idx`
  ON `ClassifiedAttributeOption`(`parentOptionId`);

ALTER TABLE `ClassifiedAttribute`
  ADD CONSTRAINT `ClassifiedAttribute_dependsOnAttributeId_fkey`
  FOREIGN KEY (`dependsOnAttributeId`) REFERENCES `ClassifiedAttribute`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ClassifiedAttributeOption`
  ADD CONSTRAINT `ClassifiedAttributeOption_parentOptionId_fkey`
  FOREIGN KEY (`parentOptionId`) REFERENCES `ClassifiedAttributeOption`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
