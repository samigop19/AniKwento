-- ================================================
-- Fix Railway Database - Migration Script
-- This fixes the column name mismatch in pending_users table
-- ================================================

-- Check if pending_users table exists and has data
SELECT 'Checking pending_users table...' AS status;

-- Drop the pending_users table and recreate with correct column name
DROP TABLE IF EXISTS pending_users;

-- Recreate with correct column name
CREATE TABLE pending_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'pending_users table fixed successfully!' AS status;

-- Verify the table structure
DESCRIBE pending_users;
