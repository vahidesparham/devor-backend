-- DropForeignKey
ALTER TABLE `BusinessFeature` DROP FOREIGN KEY `BusinessFeature_businessId_fkey`;

-- DropForeignKey
ALTER TABLE `BusinessFeature` DROP FOREIGN KEY `BusinessFeature_featureDefinitionId_fkey`;

-- DropForeignKey
ALTER TABLE `FeatureDefinition` DROP FOREIGN KEY `FeatureDefinition_serviceTypeId_fkey`;

-- DropTable
DROP TABLE `BusinessFeature`;

-- DropTable
DROP TABLE `FeatureDefinition`;
