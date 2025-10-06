# 🚀 Quick Deployment Script for GitHub Pages
# Run this in PowerShell to quickly set up and deploy your portfolio

Write-Host "🎨 Portfolio Deployment Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean up unnecessary files
Write-Host "🧹 Step 1: Cleaning up unnecessary files..." -ForegroundColor Yellow
$filesToDelete = @(
    "ADMIN_DASHBOARD_FIXED.md",
    "MANAGE_PROJECTS_GUIDE.md",
    "seo.html"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "   ✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Not found: $file" -ForegroundColor Gray
    }
}

# Delete empty js folder if it exists
if (Test-Path "js" -PathType Container) {
    $jsFolder = Get-ChildItem "js" -ErrorAction SilentlyContinue
    if ($jsFolder.Count -eq 0) {
        Remove-Item "js" -Recurse -Force
        Write-Host "   ✅ Deleted: js/ (empty folder)" -ForegroundColor Green
    }
}

Write-Host ""

# Step 2: Create .gitignore
Write-Host "📝 Step 2: Creating .gitignore..." -ForegroundColor Yellow
$gitignoreContent = @"
# Development files
*.log
*.tmp
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp

# Backup files
*.bak
*~

# Deployment scripts
deploy.ps1
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding utf8
Write-Host "   ✅ Created .gitignore" -ForegroundColor Green
Write-Host ""

# Step 3: Initialize Git
Write-Host "🐙 Step 3: Initializing Git repository..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "   ⚠️  Git already initialized!" -ForegroundColor Yellow
} else {
    git init
    Write-Host "   ✅ Git initialized" -ForegroundColor Green
}
Write-Host ""

# Step 4: Configure Git
Write-Host "⚙️  Step 4: Configuring Git..." -ForegroundColor Yellow
Write-Host "   Please enter your GitHub username:" -ForegroundColor Cyan
$username = Read-Host
Write-Host "   Please enter your GitHub email:" -ForegroundColor Cyan
$email = Read-Host

git config user.name $username
git config user.email $email
Write-Host "   ✅ Git configured" -ForegroundColor Green
Write-Host ""

# Step 5: Add files to Git
Write-Host "📦 Step 5: Adding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "   ✅ Files staged" -ForegroundColor Green
Write-Host ""

# Step 6: Commit files
Write-Host "💾 Step 6: Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Portfolio with admin dashboard and Supabase backend"
Write-Host "   ✅ Files committed" -ForegroundColor Green
Write-Host ""

# Step 7: Instructions for GitHub
Write-Host "🌐 Step 7: Next Steps - Create GitHub Repository" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Now go to GitHub and:" -ForegroundColor Cyan
Write-Host "   1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "   2. Repository name: portfolio (or any name)" -ForegroundColor White
Write-Host "   3. Make it PUBLIC" -ForegroundColor White
Write-Host "   4. DO NOT add README, .gitignore, or license" -ForegroundColor White
Write-Host "   5. Click 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "   After creating the repository, copy the URL and paste it here:" -ForegroundColor Cyan
$repoUrl = Read-Host "   Repository URL"

# Step 8: Add remote and push
Write-Host ""
Write-Host "🚀 Step 8: Pushing to GitHub..." -ForegroundColor Yellow
git remote add origin $repoUrl
git branch -M main

Write-Host "   Pushing to GitHub... (you may need to enter credentials)" -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "✅ ================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "✅ ================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Go to your GitHub repository" -ForegroundColor White
Write-Host "   2. Click 'Settings' → 'Pages'" -ForegroundColor White
Write-Host "   3. Source: main branch, / (root)" -ForegroundColor White
Write-Host "   4. Click 'Save'" -ForegroundColor White
Write-Host "   5. Wait 2-5 minutes for deployment" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Your site will be live at:" -ForegroundColor Cyan
Write-Host "   https://$username.github.io/portfolio/" -ForegroundColor Green
Write-Host ""
Write-Host "📚 For detailed instructions, see: DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 Happy deploying!" -ForegroundColor Cyan

