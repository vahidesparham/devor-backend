INSERT INTO `Permission` (`key`, `description`, `createdAt`)
VALUES
  ('classified_chats.read', 'View classified conversations and messages', CURRENT_TIMESTAMP(3)),
  ('classified_chats.moderate', 'Block and unblock classified conversations', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

INSERT INTO `RolePermission` (`roleId`, `permissionId`, `createdAt`)
SELECT role_row.`id`, permission_row.`id`, CURRENT_TIMESTAMP(3)
FROM `Role` role_row
CROSS JOIN `Permission` permission_row
LEFT JOIN `RolePermission` existing
  ON existing.`roleId` = role_row.`id`
  AND existing.`permissionId` = permission_row.`id`
WHERE role_row.`name` = 'SUPER_ADMIN'
  AND permission_row.`key` IN ('classified_chats.read', 'classified_chats.moderate')
  AND existing.`roleId` IS NULL;
