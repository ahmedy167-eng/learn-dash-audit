# Deployment Guide - How to Make Your Website Live

**Project:** Learn Dash Audit LMS  
**Status:** Ready for Production Deployment  
**Estimated Time:** 30-60 minutes

---

## 🚀 Quick Overview

Your website has two parts that need to go live:
1. **Frontend** (React/Vite) - The website users see
2. **Backend** (Supabase + Deno Functions) - Already hosted by Supabase ✅

---

## 📋 Prerequisites Checklist

Before deploying, make sure you have:

- [ ] A domain name (e.g., www.yourdomain.com)
- [ ] A GitHub/GitLab account for version control
- [ ] A deployment platform account (Vercel, Netlify, or Cloudflare)
- [ ] Your Supabase project set up and configured
- [ ] All environment variables ready
- [ ] SSL certificate (auto-provided by most platforms)

---

## 🔑 Step 1: Prepare Your Environment Variables

### 1.1 Create Production Environment File

Create a `.env.production` file in your project root:

```bash
# Frontend URL (where your site will be hosted)
VITE_APP_URL=https://www.yourdomain.com

# Supabase keys (KEEP THESE SECRET!)
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...

# Other environment variables
NODE_ENV=production
```

### 1.2 Get Your Supabase Keys

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon (public)** key → `VITE_SUPABASE_ANON_KEY`

⚠️ **IMPORTANT:** Never commit `.env.production` to GitHub! Add it to `.gitignore`

### 1.3 Verify .gitignore

Make sure your `.gitignore` includes:
```
.env
.env.local
.env.production.local
.env.*.local
```

---

## 📦 Step 2: Build Your Project Locally

### 2.1 Install Dependencies

```bash
npm install
# or
bun install
```

### 2.2 Build for Production

```bash
npm run build
```

This creates an optimized `dist/` folder with your compiled website.

**Expected Output:**
```
✓ 1234 modules transformed.
dist/index.html                  12.34 kb │ gzip:  3.21 kb
dist/assets/index-abc123.js     234.56 kb │ gzip: 78.90 kb
dist/assets/index-def456.css     12.34 kb │ gzip:  2.10 kb
```

### 2.3 Test Locally (Optional)

```bash
npm run preview
```

Opens your production build at `http://localhost:4173`

---

## 🌐 Step 3: Choose Your Deployment Platform

**Recommended Options:**

| Platform | Difficulty | Speed | Cost | Best For |
|----------|-----------|-------|------|----------|
| **Vercel** | ⭐ Easiest | ⚡ Fastest | Free tier available | React apps, teams |
| **Netlify** | ⭐ Easy | ⚡ Fast | Free tier available | Static sites, forms |
| **Cloudflare Pages** | ⭐⭐ Moderate | ⚡⚡ Very fast | Free tier | Global CDN needs |
| **AWS Amplify** | ⭐⭐⭐ Complex | Varies | Pay as you go | Large scale apps |

**→ For this project, I recommend Vercel (easiest setup)**

---

# 🎯 DEPLOYMENT PATH: VERCEL (Recommended)

## Step 4A: Deploy to Vercel

### 4A.1 Push to GitHub

First, push your code to GitHub:

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

Make sure you're on the `main` branch (or whatever your production branch is).

### 4A.2 Connect Vercel to GitHub

1. Go to [Vercel.com](https://vercel.com)
2. Click **Sign in** → **Deploy with GitHub**
3. Authorize Vercel to access your GitHub account
4. Click **Import Project**
5. Select your `learn-dash-audit` repository
6. Click **Import**

### 4A.3 Configure Build Settings

Vercel should auto-detect your project as a Vite project.

**Verify these settings:**

```
Framework Preset:    Vite (should be auto-detected)
Build Command:       npm run build
Output Directory:    dist
Install Command:     npm install
```

If not detected, set them manually.

### 4A.4 Add Environment Variables in Vercel

1. In the Vercel dashboard, go to your project
2. Click **Settings** → **Environment Variables**
3. Add each variable:

```
VITE_SUPABASE_URL        = https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGciOiJIUzI1NiIsInR5cCI...
NODE_ENV                 = production
```

4. Click **Add** for each variable
5. Click **Deploy**

**Your site deploys! 🎉**

### 4A.5 View Your Live Site

After deployment completes:

1. You'll get a preview URL: `https://your-project.vercel.app`
2. This is your temporary live site - share this to test!
3. Check that it works:
   - [ ] Login page loads
   - [ ] Can log in with student credentials
   - [ ] Can access dashboard
   - [ ] Chat feature works
   - [ ] No console errors

---

## 🌍 Step 5: Connect Your Custom Domain

### 5A.1 Get Your Domain

Options:
- Buy from [Namecheap](https://www.namecheap.com) ($3-15/year)
- Buy from [GoDaddy](https://www.godaddy.com) ($12-15/year)
- Buy from [Google Domains](https://domains.google.com) ($12/year)

**Example:** yourdomain.com, yourlms.com, audit-system.com

### 5A.2 Add Domain to Vercel

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Click **Add**

### 5A.3 Update Domain DNS Settings

Vercel shows you nameservers to configure.

**In your domain registrar (Namecheap, GoDaddy, etc.):**

1. Go to **DNS Settings** or **Nameservers**
2. Change nameservers to:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Save changes (takes 24-48 hours to fully propagate)

**Or use Vercel's CNAME method:**

If your registrar doesn't support nameserver changes:
1. Create a CNAME record:
   ```
   Name:   www
   Value:  cname.vercel-dns.com
   ```
2. Create an A record:
   ```
   Name:   @
   Value:  76.76.19.131
   ```

### 5A.4 Verify Domain Connection

After 24-48 hours:

```bash
# Check if domain is live
nslookup yourdomain.com
# Should show Vercel's IP address

# Visit your site
https://yourdomain.com
```

✅ **Your site is now LIVE!**

---

# Alternative: NETLIFY DEPLOYMENT

## Step 4B: Deploy to Netlify (If Preferring Netlify)

### 4B.1 Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 4B.2 Deploy with Netlify

1. Go to [Netlify.com](https://netlify.com)
2. Click **Connect from Git**
3. Choose GitHub
4. Select your `learn-dash-audit` repository
5. Configure build settings:

```
Build command:    npm run build
Publish directory: dist
```

6. Click **Deploy site**

### 4B.3 Add Environment Variables

1. Go to **Site settings** → **Environment**
2. Add your variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Click **Deploy** again to rebuild with env vars

### 4B.4 Connect Domain

1. In Netlify, go to **Domain settings**
2. Click **Add custom domain**
3. Follow the same DNS steps as Vercel section 5A.3

---

# Alternative: CLOUDFLARE PAGES DEPLOYMENT

## Step 4C: Deploy to Cloudflare Pages

### 4C.1 Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 4C.2 Deploy with Cloudflare

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Click **Create a project** → **Connect to Git**
3. Authorize GitHub and select your repository
4. Configure build:

```
Build command:    npm run build
Build output directory: dist
```

5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

6. Click **Save and Deploy**

### 4C.3 Connect Domain

1. In Cloudflare Pages, click your project
2. Go to **Custom domain**
3. Enter your domain
4. Update your domain's nameservers to Cloudflare

---

## 🔐 Step 6: Security & HTTPS Setup

### 6.1 Enable HTTPS (Auto)

Your deployment platform automatically provides:
- ✅ Free SSL certificate
- ✅ Auto-renewal
- ✅ Redirect HTTP → HTTPS

### 6.2 Update Supabase CORS Settings

In your Supabase project:

1. Go to **Project Settings** → **API**
2. Scroll to **CORS Settings**
3. Add your domain:
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   ```
4. Click **Save**

This allows your frontend to communicate with Supabase backend.

### 6.3 Update Environment Variables

Change your `.env.production` to use your live domain:

```
VITE_APP_URL=https://yourdomain.com
```

Redeploy after changing env vars.

---

## ✅ Step 7: Pre-Launch Testing Checklist

Before telling people the site is live, test everything:

- [ ] **Homepage loads** - Navigate to www.yourdomain.com
- [ ] **HTTPS works** - URL shows 🔒 lock icon
- [ ] **Login page loads** - Both admin and student login
- [ ] **Admin login works** - Test credentials work
- [ ] **Student login works** - Test student credentials
- [ ] **Dashboard displays** - All data loads
- [ ] **Chat feature works** - Send/receive messages
- [ ] **Quiz feature works** - Can submit answers
- [ ] **File uploads work** - If applicable
- [ ] **Dark mode works** - Theme toggle functions
- [ ] **Mobile responsive** - Works on phone/tablet
- [ ] **No console errors** - Open DevTools (F12) - Console should be clean
- [ ] **Performance good** - Pages load in < 2 seconds
- [ ] **Database connection** - Real data displays correctly

### Test Script:

```bash
# Check site is accessible
curl -I https://yourdomain.com
# Should show: HTTP/2 200

# Check HTTPS
curl -I https://yourdomain.com
# Should NOT redirect or show warnings

# Check environment variables loaded
# Open browser console (F12)
# Type: console.log(import.meta.env.VITE_SUPABASE_URL)
# Should show your Supabase URL
```

---

## 🚨 Step 8: Handle Issues & Troubleshooting

### 8.1 "Blank Page" or 404 Error

**Problem:** Site shows blank or 404 error

**Solutions:**
1. Check Vercel/Netlify build logs for errors
2. Verify `dist/` folder contains files:
   ```bash
   npm run build
   ls dist/
   ```
3. Check environment variables are set in dashboard
4. Force redeploy (re-trigger build)

### 8.2 "Cannot Reach Supabase" or API Errors

**Problem:** Login doesn't work, data doesn't load

**Solutions:**
1. Check Supabase URL is correct in env vars
2. Verify anon key is correct (starts with `eyJ`)
3. Check Supabase CORS settings include your domain
4. Open DevTools (F12) → **Network** tab
5. Look for failed requests to supabase
6. Check Supabase status: [status.supabase.com](https://status.supabase.com)

### 8.3 "Domain Not Connecting"

**Problem:** Domain shows error or old site

**Solutions:**
1. DNS changes take 24-48 hours
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private window
4. Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
5. Verify nameserver changes in registrar

### 8.4 "SSL Certificate Error"

**Problem:** Browser shows certificate warning

**Solutions:**
1. Verify domain is added to Vercel/Netlify
2. Wait 24 hours for certificate generation
3. Check domain DNS is pointing correctly
4. Try accessing with `https://` explicitly

---

## 📊 Step 9: Post-Launch Monitoring

After going live, monitor your site:

### 9.1 Set Up Monitoring

In Vercel/Netlify dashboard:
- [ ] Check analytics/view deployment logs
- [ ] Monitor error rates
- [ ] Check build status after each deployment

### 9.2 Enable Logging

In Supabase:
1. Go to **Logs** → **Edge Function Logs**
2. Review student-auth function logs for errors
3. Check activity logs for suspicious access

### 9.3 Regular Backups

In Supabase:
1. Go to **Backups** → Enable backups
2. Schedule daily backups
3. Keep offsite backup of important data

---

## 🔄 Step 10: Continuous Deployment (Auto Deploy on Git Push)

Your platform auto-deploys when you push to GitHub!

### Workflow:
```
1. Make code changes locally
2. Commit: git commit -m "Fix bug xyz"
3. Push: git push origin main
4. Vercel/Netlify automatically rebuilds and deploys
5. Your live site updates in 1-2 minutes ✅
```

### Monitor Deployments:
- Vercel: Dashboard shows build progress
- Netlify: Shows deploy log
- Cloudflare: Shows deploy status

---

## 📋 QUICK DEPLOYMENT CHECKLISTS

### Before Deploying:
```
✓ All code committed to GitHub
✓ Tests passing: npm run test
✓ No console errors: npm run build (check output)
✓ Environment variables configured
✓ Database migrations applied
✓ Supabase project set up
✓ Edge functions deployed
```

### After Deploying (First Time):
```
✓ Site loads without errors
✓ Login/authentication works
✓ Database queries work
✓ Chat feature works
✓ File uploads work (if any)
✓ Dark mode works
✓ Mobile responsive
✓ Performance acceptable (>60 Lighthouse)
✓ HTTPS enforced
✓ Domain points to site
```

### Before Launch Day:
```
✓ Backup database
✓ Test recovery process
✓ Brief team/stakeholders
✓ Have rollback plan ready
✓ Monitor logs closely first hour
✓ Have support contact info ready
```

---

## 🎯 Deployment Timeline

| Step | Time | Who |
|------|------|-----|
| Prepare environment variables | 5 min | You |
| Build locally & test | 5 min | You |
| Push to GitHub | 2 min | You |
| Deploy to Vercel/Netlify | 5 min | Platform |
| Wait for build (auto) | 2-5 min | Platform |
| Test live site | 10-15 min | You |
| Connect custom domain | 2 min | You |
| Wait for DNS propagation | 24-48 hrs | Internet |
| Configure Supabase CORS | 2 min | You |
| Final testing | 15 min | You |
| **TOTAL** | **~1 hour** (+DNS wait) | |

---

## 💰 Cost Estimate (Monthly)

| Item | Free Tier | Paid |
|------|-----------|------|
| **Frontend Hosting** | Vercel: $0 | Vercel Pro: $20 |
| **Domain** | - | Namecheap: $5-15 |
| **Database (Supabase)** | 500MB free | $25+ per month |
| **SSL Certificate** | Free (auto) | Free (auto) |
| **Email Alerts** | Basic | Included |
| **Monthly Total** | ~$5-15 | ~$50-100 |

**For starting out:** Free tier works great! Upgrade when you need more.

---

## 🆘 Need Help?

### Troubleshooting Resources:
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Supabase Docs: https://supabase.com/docs
- Vite Docs: https://vitejs.dev

### Getting Support:
- Vercel Support: Dashboard chat
- Netlify Support: Dashboard support
- Supabase Support: Discord community
- Next Steps: Email ahmed@yourdomain.com

---

## 📝 Final Deployment Command Summary

```bash
# 1. Prepare
git add .
git commit -m "Production ready"

# 2. Build locally (optional but recommended)
npm run build
npm run preview

# 3. Push to GitHub
git push origin main

# 4. Deploy (click button in Vercel/Netlify - auto triggers on push)
# [Visit Vercel/Netlify dashboard]

# 5. Test live site
# [Visit https://yourdomain.com]

# Done! 🎉
```

---

## ✨ Congratulations! Your site is LIVE! 🚀

Once you complete these steps, your website will be live and accessible to everyone on the internet!

**Next Steps After Launch:**
1. Tell people about your site
2. Monitor logs for errors
3. Gather user feedback
4. Plan improvements
5. Keep dependencies updated

---

**Last Updated:** February 6, 2026  
**Questions?** Refer to the troubleshooting section or platform documentation
