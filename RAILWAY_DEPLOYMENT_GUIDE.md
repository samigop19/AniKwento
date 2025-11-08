# AniKwento Railway Deployment Guide

## 🎯 Current Status
- ✅ Steps 1-5: Project created, Railway installed, logged in, MySQL added
- 🔄 **Next**: Steps 6-10 (Environment variables, database schema, deployment)

---

## Step 6: Set Environment Variables

### Option A: Using the Web Dashboard (RECOMMENDED - Easiest)

1. **Go to Railway Dashboard**
   - Open: https://railway.app/project/anikwento
   - Or click: `railway open`

2. **Click on your web service** (not MySQL)
   - If you don't have a web service yet, click "New" → "Empty Service"
   - Name it: "anikwento-web"

3. **Go to "Variables" tab**

4. **Click "RAW Editor"** (top right)

5. **Paste this (all at once)**:
```
APP_NAME=AniKwento
APP_ENV=production
APP_DEBUG=false

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=anikwentosms@gmail.com
SMTP_PASSWORD=qahy icao wqnz hpmu
SMTP_ENCRYPTION=tls

ELEVENLABS_API_KEY=REDACTED_ELEVENLABS_KEY
FAL_API_KEY=b0852658-2b1a-49f9-afd9-81d038b6746f:ed19f385ea5b1a83bed43ead306d619a

R2_ACCESS_KEY=73ee8edabb09e2c2d7feb12a2302f0f9
R2_SECRET_KEY=fdcfe9fc493ab89dc1b51c9e0ed6b471d626b8e16b5a04541e5c72b69fb23b5c
R2_ENDPOINT=https://5a68964aa57fac638f37b64ba1176de5.r2.cloudflarestorage.com
R2_BUCKET=anikwento-stories-dev
R2_PUBLIC_URL=https://anikwento-r2-public.thesamz20.workers.dev
R2_REGION=auto
```

6. **Add Database Variables** (from MySQL service)
   - Click on the **MySQL** service in your project
   - Go to **Variables** tab
   - Copy these values:
     - `MYSQLHOST`
     - `MYSQLPORT`
     - `MYSQLUSER`
     - `MYSQLPASSWORD`
     - `MYSQLDATABASE`

7. **Go back to your web service → Variables tab**

8. **Add these database variables**:
```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
```

   **Note**: The `${{MySQL.VARIABLE}}` syntax references the MySQL service variables automatically.

9. **Click "Save" or "Add"**

---

### Option B: Using Terminal (Advanced)

**Important**: You need to link to a service first. Do this manually:

```bash
# In Railway dashboard:
# 1. Create a service (New → Empty Service → name it "anikwento-web")
# 2. Then come back to terminal

# Link to the web service
railway service

# Then run the setup script
./setup_railway_env.sh
```

---

## Step 7: Deploy Database Schema

### Method 1: Using Railway Dashboard (Easiest)

1. **Click on MySQL service**

2. **Click "Data" tab**

3. **Click "Query"**

4. **Open this file in a text editor**:
```bash
cat database/railway_setup.sql
```

5. **Copy ALL the SQL content**

6. **Paste into Railway's query editor**

7. **Click "Run" or "Execute"**

8. **Verify tables were created**
   - You should see 8 tables:
     - users
     - pending_users
     - teacher_profiles
     - user_settings
     - stories
     - story_scenes
     - story_scene_audio
     - story_gamification

---

### Method 2: Using MySQL Client (Terminal)

**First, install MySQL client** (if not installed):
```bash
brew install mysql-client
```

**Get your MySQL credentials from Railway**:
```bash
railway open
# Click MySQL service → Variables tab → Copy connection details
```

**Connect and run the schema**:
```bash
# Replace with your actual Railway MySQL credentials
mysql -h containers-us-west-xyz.railway.app \
      -P 3306 \
      -u root \
      -p \
      railway < database/railway_setup.sql
```

**When prompted, enter your MYSQLPASSWORD**

**Verify**:
```bash
mysql -h containers-us-west-xyz.railway.app \
      -P 3306 \
      -u root \
      -p \
      -e "SHOW TABLES;" railway
```

---

## Step 8: Deploy Your Application

### Link your web service to the code:

1. **Go to Railway dashboard**

2. **Click your web service** (anikwento-web)

3. **Click "Settings" tab**

4. **Scroll to "Source"**

5. **Click "Connect Repo"**

6. **Choose:**
   - If using GitHub: Connect your GitHub repo
   - If deploying locally: Use "Deploy from CLI" (see below)

### Deploy from CLI (if not using GitHub):

```bash
# Make sure you're in the project directory
cd /Applications/MAMP/htdocs/AniKwento

# Link to your web service
railway service
# Select "anikwento-web" from the list

# Deploy
railway up
```

---

## Step 9: Configure Service Settings

While the deployment is running, configure these settings:

1. **Go to Railway dashboard → Your web service → Settings**

2. **Scroll to "Networking"**
   - Click "Generate Domain"
   - Your app will be available at: `https://anikwento-production.up.railway.app`

3. **Scroll to "Deploy"**
   - Build Command: `composer install --no-dev --optimize-autoloader`
   - Start Command: `php -S 0.0.0.0:$PORT`
   (These should be auto-detected from your Procfile)

---

## Step 10: Verify Deployment

### Check deployment status:

```bash
# View deployment logs
railway logs

# Check if service is running
railway status

# Open your app in browser
railway open
```

### Test your application:

1. **Open the Railway URL** (from `railway domain` or Railway dashboard)

2. **Test Home Page**
   - Should load: `https://your-app.railway.app/`

3. **Test Registration**
   - Go to: `https://your-app.railway.app/source/pages/auth/Register.php`
   - Register with a UB email (@ub.edu.ph)
   - Check if verification email is sent

4. **Test Login**
   - After verification, try logging in
   - URL: `https://your-app.railway.app/source/pages/auth/Login.php`

5. **Test Story Dashboard**
   - After login, navigate to story dashboard
   - Try creating a story (test ElevenLabs + Fal.ai APIs)

---

## 🚨 Troubleshooting

### Error: "Database connection failed"

**Solution**: Check that database variables are set correctly

```bash
# In Railway dashboard:
# Web Service → Variables → Verify DB_* variables reference MySQL service
```

### Error: "API key not configured"

**Solution**: Verify API keys are set

```bash
# In Railway dashboard:
# Web Service → Variables → Check:
# - ELEVENLABS_API_KEY
# - FAL_API_KEY
# - R2_* variables
```

### Error: "500 Internal Server Error"

**Solution**: Check logs

```bash
railway logs --service anikwento-web
```

Common causes:
- Missing environment variables
- Database not connected
- PHP syntax errors

### Build fails with "composer: command not found"

**Solution**: The `nixpacks.toml` file should handle this. If it doesn't:

1. Go to Railway dashboard → Settings
2. Add build command: `composer install --no-dev`

---

## 📊 Post-Deployment Checklist

- [ ] Application deployed successfully
- [ ] Home page loads
- [ ] Registration works (email sent)
- [ ] Login works (session persists)
- [ ] Story creation works
- [ ] ElevenLabs API working (audio generation)
- [ ] Fal.ai API working (image generation)
- [ ] R2 storage working (audio uploads)
- [ ] Database queries working
- [ ] No errors in logs

---

## 🔒 Security Reminders

After deployment, rotate these API keys (since they were in Git):

1. **ElevenLabs**:
   - Go to: https://elevenlabs.io/app/settings/api-keys
   - Create new key
   - Update Railway variable: `ELEVENLABS_API_KEY`

2. **Fal.ai**:
   - Go to: https://fal.ai/dashboard/keys
   - Create new key
   - Update Railway variable: `FAL_API_KEY`

3. **Cloudflare R2**:
   - Go to: https://dash.cloudflare.com/
   - R2 → Manage R2 API Tokens
   - Create new token
   - Update Railway variables: `R2_ACCESS_KEY`, `R2_SECRET_KEY`

---

## 💰 Cost Estimate

**Railway**:
- Free trial: $5/month credit
- Production: $5-15/month
  - MySQL: ~$5/month
  - Web service: ~$5/month
  - Bandwidth: Included

**External APIs** (pay-per-use):
- ElevenLabs: Varies by usage
- Fal.ai: Varies by usage
- Cloudflare R2: $0.015/GB (10GB free)

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check logs: `railway logs`

---

**Your application is ready to deploy!** 🚀

Follow the steps above, and your AniKwento app will be live on Railway with working login/register functionality!
