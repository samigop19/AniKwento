# AniKwento Setup Guide

## Security Notice ⚠️
**IMPORTANT:** This codebase has been secured for GitHub upload. All hardcoded credentials have been removed and moved to environment variables.

## Setup Instructions

### 1. Environment Configuration
Copy the environment template and configure your settings:
```bash
cp .env.example .env
```

### 2. Configure Database
Edit the `.env` file with your database credentials:
```
DB_HOST=localhost
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=anikwento
```

### 3. Create Database and Tables
1. Create a MySQL database named `anikwento`
2. Import the database structure from `database/migrations/users.sql`
3. You may need to create the `password_resets` table if it's missing:

```sql
CREATE TABLE `password_resets` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `email` varchar(255) NOT NULL,
    `reset_code` varchar(6) NOT NULL,
    `expires_at` datetime NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `email` (`email`),
    KEY `reset_code` (`reset_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4. Configure Email (Gmail SMTP)
**CRITICAL:** Generate a new Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security > App passwords
4. Generate a new app password for "Mail"
5. Update your `.env` file:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_new_app_password
SMTP_ENCRYPTION=tls
```

### 5. Test Configuration
Run the configuration test:
```bash
php test_config.php
```

**Delete `test_config.php` after testing!**

### 6. Security Checklist
- [ ] `.env` file configured with your credentials
- [ ] New Gmail app password generated
- [ ] Old Gmail app password revoked
- [ ] Database connection working
- [ ] All required tables exist
- [ ] `test_config.php` deleted
- [ ] `.env` file is in `.gitignore`

## File Structure Changes
```
AniKwento/
├── .env                    # Environment configuration (DO NOT COMMIT)
├── .env.example           # Environment template
├── .gitignore             # Git ignore file
├── source/config/env.php  # Environment loader
├── test_config.php        # Configuration test (DELETE AFTER USE)
└── SETUP.md              # This file
```

## What Was Secured
- ✅ Hardcoded Gmail credentials removed from all PHP files
- ✅ Database credentials moved to environment variables
- ✅ Real user data removed from SQL dumps
- ✅ `phpinfo.php` renamed to `phpinfo_dev.php`
- ✅ Comprehensive `.gitignore` created
- ✅ Environment configuration system implemented

## Before Deploying to Production
1. Set `APP_ENV=production` in `.env`
2. Set `APP_DEBUG=false` in `.env`
3. Remove or secure `phpinfo_dev.php`
4. Remove `test_config.php`
5. Ensure all environment variables are properly set
6. Test all functionality (registration, login, password reset)

## Troubleshooting
- If database connection fails, check MySQL credentials in `.env`
- If email sending fails, verify Gmail app password is correct
- If tables are missing, import from `database/migrations/users.sql`
- Check file permissions on `.env` file

## Support
If you encounter issues, check:
1. MAMP/XAMPP/WAMP is running
2. MySQL service is active
3. PHP version compatibility
4. File permissions

**Remember:** Never commit the `.env` file to version control!