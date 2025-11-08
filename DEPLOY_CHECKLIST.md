# 🚀 Quick Deployment Checklist

## What's Ready:
✅ Security fixes complete (API keys in environment variables)
✅ Railway project created
✅ Railway CLI installed
✅ MySQL database added
✅ Configuration files created
✅ Database schema SQL ready

---

## What You Need to Do Now:

### ⚡ Quick Path (15 minutes):

#### 1. Set Environment Variables (5 min)
```bash
# Open Railway dashboard
railway open

# In dashboard:
# 1. Create service: New → Empty Service → name it "anikwento-web"
# 2. Click service → Variables tab → RAW Editor
# 3. Paste variables from .env (see RAILWAY_DEPLOYMENT_GUIDE.md Step 6)
# 4. Add DB_* variables referencing MySQL service
```

#### 2. Deploy Database Schema (3 min)
```bash
# In Railway dashboard:
# 1. Click MySQL service → Data tab → Query
# 2. Copy content from: database/railway_setup.sql
# 3. Paste and click "Run"
# 4. Verify 8 tables created
```

#### 3. Deploy Application (5 min)
```bash
# Option A: Deploy from CLI
railway service  # Select "anikwento-web"
railway up

# Option B: Connect GitHub repo
# In Railway dashboard: Service → Settings → Connect Repo
```

#### 4. Generate Domain (1 min)
```bash
# In Railway dashboard:
# Service → Settings → Networking → "Generate Domain"
```

#### 5. Test Your App (2 min)
```bash
# Get URL
railway domain

# Open in browser and test:
# ✅ Home page loads
# ✅ Register (with @ub.edu.ph email)
# ✅ Login
# ✅ Create story
```

---

## 📋 Commands Reference

```bash
# View logs
railway logs

# Check status
railway status

# Open dashboard
railway open

# Get app URL
railway domain

# Redeploy
railway up --detach
```

---

## 🔗 Important Files Created

- `railway.json` - Railway configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Start command
- `index.php` - Entry point router
- `database/railway_setup.sql` - Database schema (all tables)
- `setup_railway_env.sh` - Environment variable setup script
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Detailed step-by-step guide

---

## ⚠️ Important Notes

1. **Database Variables**: Use `${{MySQL.VARIABLE}}` syntax to reference MySQL service
2. **Build time**: First deployment takes 2-3 minutes
3. **Logs**: Check `railway logs` if anything fails
4. **Domain**: Auto-generated, can add custom domain later

---

## 🎯 Expected Result

After following the steps, you'll have:

✅ App live at: `https://anikwento-production.up.railway.app`
✅ MySQL database with 8 tables
✅ Environment variables configured
✅ Login/register working
✅ Email verification working
✅ Story creation with AI APIs working

---

**Ready to deploy? Follow RAILWAY_DEPLOYMENT_GUIDE.md** 📖
