ALTER TABLE `ClassifiedSetting`
  ADD COLUMN `publicBrowseEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `appUserPostingEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `favoritesEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `reportsEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `maxReportsPerUserPerDay` INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN `mediaCleanupGraceHours` INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN `maintenanceMessage` VARCHAR(500) NULL;

CREATE TABLE `AppEventOutbox` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `eventType` VARCHAR(100) NOT NULL,
  `aggregateType` VARCHAR(80) NOT NULL,
  `aggregateId` VARCHAR(120) NOT NULL,
  `recipientAppUserId` INTEGER NULL,
  `payload` JSON NOT NULL,
  `dedupeKey` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` DATETIME(3) NULL,
  `lockToken` VARCHAR(80) NULL,
  `processedAt` DATETIME(3) NULL,
  `lastError` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AppEventOutbox_dedupeKey_key`(`dedupeKey`),
  INDEX `AppEventOutbox_status_availableAt_id_idx`(`status`, `availableAt`, `id`),
  INDEX `AppEventOutbox_recipientAppUserId_createdAt_idx`(`recipientAppUserId`, `createdAt`),
  INDEX `AppEventOutbox_aggregateType_aggregateId_createdAt_idx`(`aggregateType`, `aggregateId`, `createdAt`),
  INDEX `AppEventOutbox_lockToken_idx`(`lockToken`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AppNotification` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `appUserId` INTEGER NOT NULL,
  `sourceEventId` BIGINT NULL,
  `type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `data` JSON NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `AppNotification_sourceEventId_key`(`sourceEventId`),
  INDEX `AppNotification_appUserId_readAt_createdAt_idx`(`appUserId`, `readAt`, `createdAt`),
  INDEX `AppNotification_appUserId_createdAt_idx`(`appUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BackgroundJobState` (
  `jobName` VARCHAR(100) NOT NULL,
  `isRunning` BOOLEAN NOT NULL DEFAULT false,
  `lastStartedAt` DATETIME(3) NULL,
  `lastSucceededAt` DATETIME(3) NULL,
  `lastFailedAt` DATETIME(3) NULL,
  `lastDurationMs` INTEGER NULL,
  `lastScannedCount` INTEGER NOT NULL DEFAULT 0,
  `lastAffectedCount` INTEGER NOT NULL DEFAULT 0,
  `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
  `lastError` VARCHAR(1000) NULL,
  `metadata` JSON NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `BackgroundJobState_isRunning_updatedAt_idx`(`isRunning`, `updatedAt`),
  PRIMARY KEY (`jobName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AppEventOutbox`
  ADD CONSTRAINT `AppEventOutbox_recipientAppUserId_fkey`
  FOREIGN KEY (`recipientAppUserId`) REFERENCES `AppUser`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AppNotification`
  ADD CONSTRAINT `AppNotification_appUserId_fkey`
  FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `AppNotification_sourceEventId_fkey`
  FOREIGN KEY (`sourceEventId`) REFERENCES `AppEventOutbox`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
