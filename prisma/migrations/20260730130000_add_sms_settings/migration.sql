CREATE TABLE `SmsSetting` (
    `id` INTEGER NOT NULL,
    `provider` VARCHAR(30) NOT NULL DEFAULT 'PAYOM',
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `apiBaseUrl` VARCHAR(500) NULL,
    `apiTokenEncrypted` TEXT NULL,
    `apiTokenLastFour` VARCHAR(8) NULL,
    `senderName` VARCHAR(11) NULL,
    `sendMode` VARCHAR(20) NOT NULL DEFAULT 'TEMPLATE',
    `templateId` VARCHAR(191) NULL,
    `templateCodeVariable` VARCHAR(80) NOT NULL DEFAULT 'code',
    `textTemplate` VARCHAR(500) NOT NULL DEFAULT 'Devor verification code: {code}',
    `messageType` VARCHAR(20) NOT NULL DEFAULT 'SMS',
    `requestTimeoutMs` INTEGER NOT NULL DEFAULT 10000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SmsSetting` (
    `id`,
    `provider`,
    `isEnabled`,
    `sendMode`,
    `templateCodeVariable`,
    `textTemplate`,
    `messageType`,
    `requestTimeoutMs`,
    `createdAt`,
    `updatedAt`
) VALUES (
    1,
    'PAYOM',
    false,
    'TEMPLATE',
    'code',
    'Devor verification code: {code}',
    'SMS',
    10000,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
);
