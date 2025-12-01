-- Add 2FA columns to users table
-- Run this SQL in your database to add the necessary columns for 2FA

-- Add mfa column (INT, default 0) if it doesn't exist
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `mfa` INT(1) NOT NULL DEFAULT 0 COMMENT 'Two-factor authentication enabled (1) or disabled (0)';

-- Add secret column (VARCHAR(64)) if it doesn't exist
-- This stores the TOTP secret key for generating verification codes
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `secret` VARCHAR(64) NULL DEFAULT NULL COMMENT 'TOTP secret key for 2FA';

