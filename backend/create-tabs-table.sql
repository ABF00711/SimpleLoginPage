-- Create table for saving tab configurations
-- Table name: tab_interfaces
-- Columns match the actual database schema

CREATE TABLE IF NOT EXISTS `tab_interfaces` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) NULL,
  `tabs_name` VARCHAR(100) NULL,
  `tabs_json` LONGTEXT NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `tabs_name` (`tabs_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

