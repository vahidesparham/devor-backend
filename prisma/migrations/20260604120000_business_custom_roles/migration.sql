CREATE TABLE `BusinessPermission` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(160) NOT NULL,
  `groupName` VARCHAR(80) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` VARCHAR(255) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessPermission_key_key`(`key`),
  INDEX `BusinessPermission_groupName_displayOrder_idx`(`groupName`, `displayOrder`),
  INDEX `BusinessPermission_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessRole` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `businessId` INTEGER NOT NULL,
  `code` VARCHAR(120) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` VARCHAR(255) NULL,
  `color` VARCHAR(30) NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `isOwnerRole` BOOLEAN NOT NULL DEFAULT false,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `BusinessRole_businessId_code_key`(`businessId`, `code`),
  INDEX `BusinessRole_businessId_isActive_displayOrder_idx`(`businessId`, `isActive`, `displayOrder`),
  INDEX `BusinessRole_businessId_isOwnerRole_idx`(`businessId`, `isOwnerRole`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BusinessRolePermission` (
  `roleId` INTEGER NOT NULL,
  `permissionId` INTEGER NOT NULL,

  INDEX `BusinessRolePermission_permissionId_idx`(`permissionId`),
  PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `BusinessPermission` (`key`, `groupName`, `title`, `description`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('business.profile.read', 'profile', 'مشاهده پروفایل', 'View business core profile', 10, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.profile.update', 'profile', 'ویرایش پروفایل', 'Update business core profile', 20, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.media.read', 'media', 'مشاهده رسانه‌ها', 'View gallery and slideshow', 30, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.media.manage', 'media', 'مدیریت رسانه‌ها', 'Manage gallery and slideshow', 40, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.working_hours.read', 'working_hours', 'مشاهده ساعات کاری', 'View working hours', 50, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.working_hours.manage', 'working_hours', 'مدیریت ساعات کاری', 'Manage working hours', 60, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.offerings.read', 'offerings', 'مشاهده آیتم‌ها', 'View offerings and categories', 70, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.offerings.manage', 'offerings', 'مدیریت آیتم‌ها', 'Manage offerings, categories and options', 80, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.members.read', 'members', 'مشاهده اعضا', 'View business members', 90, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.members.manage', 'members', 'مدیریت اعضا', 'Manage business members', 100, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.roles.read', 'roles', 'مشاهده نقش‌ها', 'View business roles', 110, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.roles.manage', 'roles', 'مدیریت نقش‌ها', 'Manage business roles and permissions', 120, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('business.preview.read', 'preview', 'مشاهده پیش‌نمایش', 'View business app preview', 130, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `BusinessRole` (`businessId`, `code`, `title`, `description`, `color`, `isSystem`, `isOwnerRole`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, 'owner', 'مالک', 'دسترسی کامل به همه بخش‌های کسب‌وکار', '#7367f0', true, true, 10, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Business`;

INSERT INTO `BusinessRole` (`businessId`, `code`, `title`, `description`, `color`, `isSystem`, `isOwnerRole`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, 'manager', 'مدیر', 'مدیریت محتوای اصلی کسب‌وکار بدون کنترل مالکیت', '#00bad1', true, false, 20, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Business`;

INSERT INTO `BusinessRole` (`businessId`, `code`, `title`, `description`, `color`, `isSystem`, `isOwnerRole`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, 'staff', 'کارمند', 'دسترسی محدود برای مشاهده و مدیریت روزمره', '#28c76f', true, false, 30, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Business`;

INSERT INTO `BusinessRolePermission` (`roleId`, `permissionId`)
SELECT role.`id`, permission.`id`
FROM `BusinessRole` role
CROSS JOIN `BusinessPermission` permission
WHERE role.`code` = 'owner';

INSERT INTO `BusinessRolePermission` (`roleId`, `permissionId`)
SELECT role.`id`, permission.`id`
FROM `BusinessRole` role
INNER JOIN `BusinessPermission` permission ON permission.`key` IN (
  'business.profile.read',
  'business.profile.update',
  'business.media.read',
  'business.media.manage',
  'business.working_hours.read',
  'business.working_hours.manage',
  'business.offerings.read',
  'business.offerings.manage',
  'business.members.read',
  'business.preview.read'
)
WHERE role.`code` = 'manager';

INSERT INTO `BusinessRolePermission` (`roleId`, `permissionId`)
SELECT role.`id`, permission.`id`
FROM `BusinessRole` role
INNER JOIN `BusinessPermission` permission ON permission.`key` IN (
  'business.profile.read',
  'business.media.read',
  'business.working_hours.read',
  'business.offerings.read',
  'business.preview.read'
)
WHERE role.`code` = 'staff';

ALTER TABLE `BusinessMembership` ADD COLUMN `roleId` INTEGER NULL;

UPDATE `BusinessMembership` membership
INNER JOIN `BusinessRole` role ON role.`businessId` = membership.`businessId`
  AND role.`code` = CASE membership.`role`
    WHEN 'OWNER' THEN 'owner'
    WHEN 'MANAGER' THEN 'manager'
    ELSE 'staff'
  END
SET membership.`roleId` = role.`id`;

ALTER TABLE `BusinessMembership` MODIFY `roleId` INTEGER NOT NULL;
ALTER TABLE `BusinessMembership` DROP FOREIGN KEY `BusinessMembership_businessId_fkey`;
ALTER TABLE `BusinessMembership` DROP FOREIGN KEY `BusinessMembership_userId_fkey`;
ALTER TABLE `BusinessMembership` DROP INDEX `BusinessMembership_businessId_role_idx`;
ALTER TABLE `BusinessMembership` DROP INDEX `BusinessMembership_userId_role_idx`;
ALTER TABLE `BusinessMembership` DROP COLUMN `role`;
CREATE INDEX `BusinessMembership_businessId_roleId_idx` ON `BusinessMembership`(`businessId`, `roleId`);
CREATE INDEX `BusinessMembership_userId_roleId_idx` ON `BusinessMembership`(`userId`, `roleId`);

ALTER TABLE `BusinessRole`
  ADD CONSTRAINT `BusinessRole_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BusinessRolePermission`
  ADD CONSTRAINT `BusinessRolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `BusinessRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessRolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `BusinessPermission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BusinessMembership`
  ADD CONSTRAINT `BusinessMembership_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `BusinessUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BusinessMembership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `BusinessRole`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
