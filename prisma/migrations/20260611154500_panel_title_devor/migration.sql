ALTER TABLE `PanelSetting` ALTER `panelTitle` SET DEFAULT 'Devor';

UPDATE `PanelSetting`
SET `panelTitle` = 'Devor'
WHERE `panelTitle` = CHAR(65, 116, 108, 97, 115, 32, 67, 111, 110, 115, 111, 108, 101);
