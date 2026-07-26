ALTER TABLE `ClassifiedSetting`
  MODIFY `allowChatContact` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `chatStarterMessageLimit` INTEGER NOT NULL DEFAULT 3;

ALTER TABLE `ClassifiedAd`
  MODIFY `allowChat` BOOLEAN NOT NULL DEFAULT true;

UPDATE `ClassifiedSetting`
SET `allowChatContact` = true,
    `chatStarterMessageLimit` = 3
WHERE `id` = 1;

UPDATE `ClassifiedAd`
SET `allowChat` = true
WHERE `ownerType` = 'APP_USER';

CREATE TABLE `ClassifiedConversation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `adId` INTEGER NOT NULL,
  `buyerAppUserId` INTEGER NOT NULL,
  `ownerAppUserId` INTEGER NOT NULL,
  `status` ENUM('ACTIVE', 'BLOCKED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `starterMessageCount` INTEGER NOT NULL DEFAULT 0,
  `ownerRepliedAt` DATETIME(3) NULL,
  `buyerUnreadCount` INTEGER NOT NULL DEFAULT 0,
  `ownerUnreadCount` INTEGER NOT NULL DEFAULT 0,
  `lastMessageAt` DATETIME(3) NULL,
  `lastMessagePreview` VARCHAR(200) NULL,
  `blockedByAdminId` INTEGER NULL,
  `blockedReason` VARCHAR(500) NULL,
  `blockedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ClassifiedConversation_adId_buyerAppUserId_key`(`adId`, `buyerAppUserId`),
  INDEX `ClassifiedConversation_buyerAppUserId_lastMessageAt_idx`(`buyerAppUserId`, `lastMessageAt`),
  INDEX `ClassifiedConversation_ownerAppUserId_lastMessageAt_idx`(`ownerAppUserId`, `lastMessageAt`),
  INDEX `ClassifiedConversation_status_lastMessageAt_idx`(`status`, `lastMessageAt`),
  INDEX `ClassifiedConversation_blockedByAdminId_idx`(`blockedByAdminId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ClassifiedMessage` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `conversationId` BIGINT NOT NULL,
  `senderAppUserId` INTEGER NOT NULL,
  `senderRole` ENUM('BUYER', 'OWNER') NOT NULL,
  `clientMessageId` VARCHAR(80) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `classified_message_client_id_key`(`conversationId`, `senderAppUserId`, `clientMessageId`),
  INDEX `ClassifiedMessage_conversationId_id_idx`(`conversationId`, `id`),
  INDEX `ClassifiedMessage_senderAppUserId_createdAt_idx`(`senderAppUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClassifiedConversation`
  ADD CONSTRAINT `ClassifiedConversation_adId_fkey`
  FOREIGN KEY (`adId`) REFERENCES `ClassifiedAd`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClassifiedConversation_buyerAppUserId_fkey`
  FOREIGN KEY (`buyerAppUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClassifiedConversation_ownerAppUserId_fkey`
  FOREIGN KEY (`ownerAppUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClassifiedConversation_blockedByAdminId_fkey`
  FOREIGN KEY (`blockedByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ClassifiedMessage`
  ADD CONSTRAINT `ClassifiedMessage_conversationId_fkey`
  FOREIGN KEY (`conversationId`) REFERENCES `ClassifiedConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClassifiedMessage_senderAppUserId_fkey`
  FOREIGN KEY (`senderAppUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
