-- ================================================
-- AniKwento Database Setup for Railway
-- Combined Migration Script
--
-- This script creates all required tables in the correct order
-- Run this in Railway's MySQL database
-- ================================================

-- Set character set for full Unicode support
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Drop existing tables if they exist (BE CAREFUL - this deletes data!)
-- Comment out these lines if you want to preserve existing data
DROP TABLE IF EXISTS story_gamification;
DROP TABLE IF EXISTS story_scene_audio;
DROP TABLE IF EXISTS story_scenes;
DROP TABLE IF EXISTS stories;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS teacher_profiles;
DROP TABLE IF EXISTS pending_users;
DROP TABLE IF EXISTS users;

-- ================================================
-- TABLE 1: users
-- ================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_code VARCHAR(6),
    verification_code_expires DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 2: pending_users
-- ================================================
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

-- ================================================
-- TABLE 3: teacher_profiles
-- ================================================
CREATE TABLE teacher_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    bio TEXT,
    subject_specialty VARCHAR(255),
    grade_level VARCHAR(100),
    profile_image_url VARCHAR(500),
    school_name VARCHAR(255),
    teaching_years INT,
    expertise_areas JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 4: user_settings
-- ================================================
CREATE TABLE user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    voice_mode VARCHAR(50) DEFAULT 'teacher',
    custom_voice_id VARCHAR(255),
    custom_voice_name VARCHAR(255),
    custom_avatar_url VARCHAR(500),
    narration_volume INT DEFAULT 70,
    background_music BOOLEAN DEFAULT TRUE,
    music_volume INT DEFAULT 30,
    question_timing VARCHAR(20) DEFAULT 'during',
    question_types JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 5: stories
-- ================================================
CREATE TABLE stories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    theme VARCHAR(255),
    total_scenes INT DEFAULT 0,
    thumbnail_url VARCHAR(500),
    context_image_url VARCHAR(500),
    selected_voice VARCHAR(50),
    voice_id VARCHAR(255),
    voice_name_for_tts VARCHAR(255),
    avatar_url VARCHAR(500),
    music_name VARCHAR(100),
    music_file VARCHAR(255),
    music_volume INT DEFAULT 30,
    gamification_enabled BOOLEAN DEFAULT FALSE,
    question_timing VARCHAR(20),
    question_types JSON,
    total_questions INT DEFAULT 0,
    character_prompt TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 6: story_scenes
-- ================================================
CREATE TABLE story_scenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    story_id INT NOT NULL,
    scene_number INT NOT NULL,
    narration TEXT,
    narration_lines JSON,
    characters JSON,
    visual_description TEXT,
    image_url VARCHAR(500),
    scene_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_story_scene (story_id, scene_number),
    INDEX idx_story_id (story_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 7: story_scene_audio
-- ================================================
CREATE TABLE story_scene_audio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scene_id INT NOT NULL,
    line_number INT NOT NULL,
    audio_path VARCHAR(500),
    audio_url VARCHAR(500),
    audio_text TEXT,
    file_size INT,
    duration FLOAT DEFAULT 0,
    viseme_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scene_id) REFERENCES story_scenes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_scene_line (scene_id, line_number),
    INDEX idx_scene_id (scene_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLE 8: story_gamification
-- ================================================
CREATE TABLE story_gamification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    story_id INT NOT NULL,
    scene_id INT NULL,
    question_type VARCHAR(20) NOT NULL,
    question TEXT NOT NULL,
    choices JSON NOT NULL,
    correct_answer JSON NOT NULL,
    question_audio_path VARCHAR(500),
    question_audio_url VARCHAR(500),
    question_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES story_scenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Verify tables were created
-- ================================================
SHOW TABLES;

-- Display table structure for verification
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM
    information_schema.TABLES
WHERE
    TABLE_SCHEMA = DATABASE()
ORDER BY
    TABLE_NAME;

-- ================================================
-- Setup Complete!
-- ================================================
SELECT 'Database setup completed successfully!' AS status;
