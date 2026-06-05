CREATE TABLE `PanelSetting` (
    `id` INTEGER NOT NULL,
    `panelTitle` VARCHAR(120) NOT NULL DEFAULT 'Atlas Console',
    `panelLogo` VARCHAR(500) NULL,
    `panelFavicon` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `PanelSetting` (`id`, `panelTitle`, `panelLogo`, `panelFavicon`, `updatedAt`)
VALUES (1, 'Atlas Console', NULL, NULL, CURRENT_TIMESTAMP(3));
