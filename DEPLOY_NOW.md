# 🚀 Deploy AniKwento to Railway - Complete Guide

**Project URL:** https://railway.com/project/1065348a-0649-4579-a421-e7f98588bd49

## ✅ What's Already Done

1. ✅ Railway project created: `anikwento`
2. ✅ MySQL database service added
3. ✅ Code updated to work with Railway environment variables
4. ✅ Database schema ready to import

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Open Railway Dashboard

Go to: **https://railway.com/project/1065348a-0649-4579-a421-e7f98588bd49**

You should see:
- MySQL service (already created)
- You need to add a web service for the application

---

### Step 2: Create Web Service

1. Click **"+ New"** button
2. Select **"Empty Service"**
3. Name it: `anikwento-web`
4. Click **"Deploy"**

---

### Step 3: Connect GitHub Repository (RECOMMENDED)

**Option A: Connect GitHub Repo**

1. Click on the `anikwento-web` service
2. Go to **Settings** tab
3. Scroll to **"Source"** section
4. Click **"Connect Repo"**
5. Authorize Railway to access your GitHub
6. Select your repository
7. Set branch: `main`
8. Railway will auto-deploy on push

**Option B: Deploy from Local (Alternative)**

If you don't want to use GitHub, skip to Step 8 for CLI deployment.

---

### Step 4: Set Environment Variables for Web Service

1. Click on `anikwento-web` service
2. Go to **"Variables"** tab
3. Click **"RAW Editor"** button (top right)
4. Paste this entire block:

```env
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

5. Click **"Add"** to save

**Note:** The database variables (DB_HOST, etc.) will be automatically available from the MySQL service. The code has been updated to read Railway's `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE` variables directly.

---

### Step 5: Import Database Schema

Now we need to set up the database tables.

1. Click on the **MySQL** service
2. Go to **"Data"** tab
3. Click **"Query"**
4. Open the file: `database/railway_setup.sql` in a text editor
5. Copy ALL the SQL content
6. Paste into Railway's query editor
7. Click **"Run"** or **"Execute"**

**Verify tables were created:**
You should see 8 tables:
- users
- pending_users
- teacher_profiles
- user_settings
- stories
- story_scenes
- story_scene_audio
- story_gamification

---

### Step 6: Generate Public Domain

1. Click on `anikwento-web` service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"**
5. Copy the domain (it will be something like: `anikwento-production.up.railway.app`)

---

### Step 7: Verify Build Settings (Should Be Auto-Detected)

1. Still in **Settings** tab of `anikwento-web`
2. Scroll to **"Build"** section
3. Verify these are set (should be automatic from your config files):
   - **Builder:** Nixpacks
   - **Build Command:** `composer install --no-dev --optimize-autoloader`
   - **Start Command:** `php -S 0.0.0.0:$PORT -t . index.php`

If not set, add them manually.

---

### Step 8: Deploy! 🚀

**If using GitHub:**
- Railway will auto-deploy when you push to main
- Watch the deployment in the **"Deployments"** tab

**If deploying from local CLI:**

```bash
cd /Applications/MAMP/htdocs/AniKwento

# Link to the web service
railway service anikwento-web

# Deploy
railway up
```

---

### Step 9: Monitor Deployment

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Watch the build logs
4. Wait for status: ✅ **Success**

Common build steps you'll see:
- Installing Nixpacks
- Running composer install
- Starting PHP server

---

### Step 10: Test Your Application 🎉

Once deployed, test these URLs (replace with your actual Railway domain):

1. **Home Page**
   ```
   https://your-app.up.railway.app/
   ```

2. **Registration**
   ```
   https://your-app.up.railway.app/source/pages/auth/Register.php
   ```
   - Register with a UB email (@ub.edu.ph)
   - Check email for verification code

3. **Login**
   ```
   https://your-app.up.railway.app/source/pages/auth/Login.php
   ```
   - After email verification, try logging in

4. **Story Dashboard**
   ```
   https://your-app.up.railway.app/source/pages/dashboard/StoryDashboard.php
   ```
   - After login, create a test story
   - Verify ElevenLabs TTS works
   - Verify Fal.ai image generation works
   - Verify R2 storage works

---

## 🐛 Troubleshooting

### Problem: "Database connection failed"

**Solution:**
1. Check MySQL service is running
2. Verify environment variables in web service
3. The code automatically uses Railway's MySQL variables

### Problem: "API key not configured"

**Solution:**
1. Go to web service → Variables
2. Verify all API keys are set:
   - ELEVENLABS_API_KEY
   - FAL_API_KEY
   - R2_* variables

### Problem: Build fails

**Solution:**
1. Check build logs in Deployments tab
2. Common issues:
   - Composer dependencies missing → Check composer.json
   - PHP version → Should use PHP 8.3 (set in nixpacks.toml)

### Problem: 500 Internal Server Error

**Solution:**
1. Check deployment logs:
   ```bash
   railway logs
   ```
2. Common causes:
   - Missing environment variables
   - Database not connected
   - PHP syntax errors

---

## 📊 Post-Deployment Checklist

- [ ] Application deployed successfully
- [ ] Home page loads
- [ ] Registration works (email sent)
- [ ] Login works (session persists)
- [ ] Story dashboard loads
- [ ] Story creation works
- [ ] ElevenLabs API working (audio generation)
- [ ] Fal.ai API working (image generation)
- [ ] R2 storage working (file uploads)
- [ ] No errors in logs

---

## 🔐 Security Notes

After deployment, consider rotating these API keys (they were in .env.example):

1. **ElevenLabs:** https://elevenlabs.io/app/settings/api-keys
2. **Fal.ai:** https://fal.ai/dashboard/keys
3. **Cloudflare R2:** https://dash.cloudflare.com/ → R2 → API Tokens

Then update the variables in Railway dashboard.

---

## 💰 Cost Estimate

**Railway:**
- Hobby Plan: $5/month (includes $5 credit)
- MySQL: ~$5/month
- Web service: Included in hobby plan

**External APIs (pay-per-use):**
- ElevenLabs: Varies by usage
- Fal.ai: Varies by usage
- Cloudflare R2: $0.015/GB (10GB free)

---

## 🎯 Quick Commands

```bash
# View logs
railway logs

# Check status
railway status

# Redeploy
railway up

# Open dashboard
open https://railway.com/project/1065348a-0649-4579-a421-e7f98588bd49
```

---

## ✅ Summary

Your Railway project is set up with:
- ✅ MySQL database service
- ✅ Code configured for Railway deployment
- ✅ Environment variable handling
- ✅ Database schema ready to import
- ✅ All necessary config files (nixpacks.toml, Procfile, railway.json)

**Next Step:** Follow the steps above to complete the deployment in the Railway dashboard!

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
