# Database Migration: User-Specific Teacher Profiles

## Overview
This migration adds support for unique teacher profiles per user, replacing the previous shared profile system.

## Changes Made
- Added `user_id` column to `teacher_profiles` table
- Each user now gets their own unique teacher profile
- Profiles are automatically created when a new user registers
- First-time users see a welcome modal to set up their profile

## How to Apply the Migration

### Option 1: Using phpMyAdmin (Recommended for MAMP users)

1. Open phpMyAdmin (usually at http://localhost:8888/phpMyAdmin or http://localhost/phpMyAdmin)
2. Select your database (default: `anikwento` or `anikwento_db`)
3. Go to the "SQL" tab
4. Copy and paste the contents of `add_user_id_to_teacher_profiles.sql`
5. Click "Go" to execute the migration

### Option 2: Using MySQL Command Line

```bash
# For MAMP users on macOS:
/Applications/MAMP/Library/bin/mysql -u root -p anikwento < add_user_id_to_teacher_profiles.sql

# For standard MySQL installation:
mysql -u root -p anikwento < add_user_id_to_teacher_profiles.sql
```

### Option 3: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database server
3. Open the file `add_user_id_to_teacher_profiles.sql`
4. Execute the script

## Post-Migration Steps

### For Existing Users

If you have existing users in your database:

1. Run this SQL to assign the existing teacher profile to a specific user:
   ```sql
   UPDATE teacher_profiles SET user_id = 1 WHERE id = 1;
   ```
   (Replace `1` with the actual user ID you want to assign the profile to)

2. For other existing users without profiles, they will get empty profiles automatically created on their next login, or you can create them manually:
   ```sql
   INSERT INTO teacher_profiles (user_id, full_name, position, degree, institution, year_graduated, experience_years, experience_desc, email, certifications, skills, photo)
   SELECT id, '', '', '', '', 0, 0, '', email, '[]', '[]', ''
   FROM users
   WHERE id NOT IN (SELECT user_id FROM teacher_profiles WHERE user_id IS NOT NULL);
   ```

## Verification

After applying the migration, verify it worked:

```sql
-- Check the new column exists
DESCRIBE teacher_profiles;

-- Should show the user_id column with a UNIQUE key
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
ALTER TABLE teacher_profiles DROP COLUMN user_id;
```

**Warning**: This will remove the link between users and their profiles!

## Files Modified

- `source/handlers/verify_process.php` - Auto-creates teacher profile on user registration
- `source/pages/dashboard/TeacherProfile.php` - Loads user-specific profile and shows welcome modal for new users
- `source/handlers/save_profile.php` - Saves to user-specific profile
- `source/handlers/generate_share_token.php` - Generates share token for user-specific profile

## Support

If you encounter any issues during migration, please check:
1. Database connection settings in `source/handlers/db_connection.php`
2. Ensure the database user has ALTER privileges
3. Check error logs in MAMP/logs or your MySQL error log
