# 🗄️ Supabase Backend Setup Guide

## Your Site is Live! Now Configure Supabase

**Live URLs:**
- 🌐 **GitHub Pages:** https://rohitgunthal18.github.io/portfolio/
- 🌐 **Custom Domain:** https://rohitgunthal.is-a.dev

---

## ✅ **STEP 1: Configure Allowed URLs in Supabase**

### **1. Go to Supabase Dashboard**

1. Open: **[https://supabase.com/dashboard](https://supabase.com/dashboard)**
2. Sign in with your account
3. Select your project: **`portfolio-backend`**

---

### **2. Add Site URL**

1. Click **"Settings"** ⚙️ (left sidebar)
2. Click **"API"**
3. Scroll to **"Configuration"** section
4. Find **"Site URL"**
5. Enter: `https://rohitgunthal.is-a.dev`
6. Click **"Save"**

---

### **3. Add Redirect URLs**

Still in **Settings → API**, scroll to **"Redirect URLs"**:

Click **"Add URL"** and add these one by one:

```
✅ https://rohitgunthal18.github.io/portfolio/
✅ https://rohitgunthal.is-a.dev
✅ https://rohitgunthal.is-a.dev/admin.html
✅ https://rohitgunthal.is-a.dev/admin-login.html
✅ http://localhost:5500
✅ http://127.0.0.1:5500
```

Click **"Save"** after each URL.

---

## 🔒 **STEP 2: Set Up Row Level Security (RLS)**

### **4. Enable Public Read Access**

Your portfolio visitors need to see your projects:

1. Go to **"Authentication"** → **"Policies"** (left sidebar)
2. Select table: **`dynamic_projects`**
3. Click **"New Policy"**
4. Choose **"Get started quickly"**
5. Select **"Enable read access for all users"**
6. Click **"Review"**
7. Click **"Save policy"**

✅ **Done!** Now anyone can view your projects.

---

### **5. Enable Admin Access**

Only you should be able to add/edit/delete projects:

1. Still in **Policies** → **`dynamic_projects`** table
2. Click **"New Policy"**
3. Choose **"For full customization"**
4. **Policy name:** `Allow authenticated users full access`
5. **Allowed operation:** Select **ALL** (SELECT, INSERT, UPDATE, DELETE)
6. **Target roles:** `authenticated`
7. **Policy definition:** Use these expressions:
   - **USING expression:** `true`
   - **WITH CHECK expression:** `true`
8. Click **"Save policy"**

✅ **Done!** Only logged-in admins can manage projects.

---

## 👤 **STEP 3: Create Admin User**

### **6. Create Your Admin Account**

1. Go to **"Authentication"** → **"Users"** (left sidebar)
2. Click **"Add user"** button (top right)
3. Choose **"Create new user"**
4. **Email:** `rohitgunthal1819@gmail.com` (or your preferred email)
5. **Password:** Choose a **strong password** (remember this!)
6. ✅ Check **"Auto Confirm User"**
7. Click **"Create user"**

**⚠️ IMPORTANT:** Save your password in a secure place!

✅ **Done!** Your admin account is ready.

---

## 📤 **STEP 4: Upload New Files to GitHub**

I've created 3 new files for admin authentication:

1. **`admin-auth.js`** - Authentication checker
2. **`admin-login.html`** - Login page
3. **Updated `admin.html`** - With logout button
4. **Updated `admin-style.css`** - Logout button styles

### **Upload to GitHub:**

**Option 1: Using GitHub Web Interface**

1. Go to: https://github.com/rohitgunthal18/portfolio
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop these files:
   - `admin-auth.js`
   - `admin-login.html`
   - `admin.html` (overwrite existing)
   - `admin-style.css` (overwrite existing)
4. Add commit message: `Added admin authentication system`
5. Click **"Commit changes"**
6. ✅ GitHub Pages will auto-deploy in 1-2 minutes!

**Option 2: Using Git Commands** (if you set up Git locally)

```powershell
cd C:\Users\rohit\Desktop\portfolio-1
git add .
git commit -m "Added admin authentication system"
git push origin main
```

---

## 🧪 **STEP 5: Test Everything**

### **7. Test Homepage**

1. Visit: **[https://rohitgunthal.is-a.dev](https://rohitgunthal.is-a.dev)**
2. Press **F12** (open browser console)
3. Go to **"Console"** tab
4. Check for errors (should see green ✅ messages)
5. Verify projects load from database

✅ **Expected:** No Supabase errors, projects display

---

### **8. Test Admin Login**

1. Visit: **[https://rohitgunthal.is-a.dev/admin-login.html](https://rohitgunthal.is-a.dev/admin-login.html)**
2. Enter your email and password (from Step 6)
3. Click **"Login"**
4. Should redirect to admin dashboard

✅ **Expected:** Successful login → admin dashboard loads

---

### **9. Test Admin Dashboard**

1. After logging in, you should see the dashboard
2. Try clicking **"Manage Projects"**
3. Try adding/editing a project
4. Try the **logout button** (top right)

✅ **Expected:** All features work, logout redirects to login page

---

## 🎯 **Quick Reference**

### **Your URLs:**

| Page | URL |
|------|-----|
| Homepage | https://rohitgunthal.is-a.dev |
| Admin Login | https://rohitgunthal.is-a.dev/admin-login.html |
| Admin Dashboard | https://rohitgunthal.is-a.dev/admin.html |

### **Your Credentials:**

- **Email:** `rohitgunthal1819@gmail.com` (or what you set)
- **Password:** [The password you created in Step 6]

---

## 🆘 **Troubleshooting**

### **Issue 1: "Failed to fetch" error**

**Solution:**
- Make sure you added all URLs to Supabase (Step 1)
- Check if CORS is enabled in Supabase Settings → API
- Wait 5 minutes for changes to propagate

---

### **Issue 2: "Invalid login credentials"**

**Solution:**
- Check if you typed the correct email and password
- Make sure user is created in Supabase (Step 3)
- Verify "Auto Confirm User" was checked

---

### **Issue 3: "Access denied" after login**

**Solution:**
- Check RLS policies are set correctly (Step 2)
- Make sure both policies are enabled
- Try signing out and signing in again

---

### **Issue 4: Projects not loading**

**Solution:**
- Check browser console (F12) for errors
- Verify `dynamic_projects` table exists in Supabase
- Check if table has data
- Verify RLS policy allows read access

---

### **Issue 5: Can't add/edit projects**

**Solution:**
- Make sure you're logged in
- Check "Allow authenticated users full access" policy exists
- Verify policy targets `authenticated` role
- Try logging out and back in

---

## 📊 **Database Structure**

Your `dynamic_projects` table should have:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `title` | text | Project title |
| `description` | text | Project description |
| `category` | text | Project category |
| `tech_tags` | text[] | Array of technologies |
| `image_url` | text | Project image URL |
| `live_url` | text | Live project URL |
| `github_url` | text | GitHub repository URL |
| `is_active` | boolean | Show/hide project |
| `display_order` | integer | Sort order |
| `created_at` | timestamp | Creation date |
| `updated_at` | timestamp | Last update |

---

## 🔐 **Security Best Practices**

✅ **What's Secure:**
- Admin dashboard requires login
- Only authenticated users can manage projects
- Public can only read projects (not edit)
- Passwords are hashed by Supabase
- HTTPS encryption on all pages

⚠️ **Recommendations:**
- Use a strong, unique password
- Don't share your admin credentials
- Regularly check Supabase logs
- Enable 2FA on your Supabase account

---

## 📈 **Monitor Your Backend**

### **View Database Activity:**

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Select your project
3. Go to **"Logs"** → **"API Logs"**
4. See all requests to your database

### **Check Active Sessions:**

1. Go to **"Authentication"** → **"Users"**
2. Click on your user
3. View **"Sessions"** tab
4. See all active logins

---

## ✅ **Setup Complete Checklist**

Use this to verify everything is configured:

```
✅ Added Site URL to Supabase
✅ Added all Redirect URLs
✅ Created "Enable read access" policy
✅ Created "Allow authenticated users" policy
✅ Created admin user in Supabase
✅ Uploaded new files to GitHub
✅ Tested homepage (projects load)
✅ Tested admin login (can sign in)
✅ Tested admin dashboard (can manage projects)
✅ Tested logout (redirects to login)
```

---

## 🎉 **YOU'RE ALL SET!**

Your portfolio now has:
- ✅ **Live website** on GitHub Pages
- ✅ **Custom domain** working
- ✅ **Dynamic backend** with Supabase
- ✅ **Secure admin panel** with login
- ✅ **Project management** system
- ✅ **Free hosting** forever!

---

## 📞 **Need More Help?**

**Check These:**
1. Supabase Documentation: https://supabase.com/docs
2. GitHub Pages Docs: https://docs.github.com/en/pages
3. Browser Console (F12) for error messages

**Your Supabase Config:**
- URL: `https://fkdcxkbbpaufcihkbmxo.supabase.co`
- Your anon key is in `supabase-config.js`

---

**Created:** October 2025  
**Last Updated:** After deployment  
**Status:** ✅ Ready for Production

---

## 🚀 **Next Steps (Optional):**

1. Add more projects through admin panel
2. Customize admin dashboard colors
3. Add analytics to track visitors
4. Enable email notifications for form submissions
5. Add image upload feature for projects

**Happy Managing! 🎨**

