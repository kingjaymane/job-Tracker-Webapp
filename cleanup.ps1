#!/usr/bin/env powershell
# Script to clean up repository

Write-Host "🧹 Cleaning up JobTracker repository..." -ForegroundColor Cyan

# Navigate to project directory
Set-Location "C:\Users\jiesh\Jobtracker-reverted\jobTracker\project"

# Remove files from git tracking that should be ignored
Write-Host "📝 Removing documentation files from git tracking..." -ForegroundColor Yellow
git rm --cached AI_RECATEGORIZATION_GUIDE.md 2>$null
git rm --cached LINKEDIN_POST.md 2>$null

# Show current status
Write-Host "📊 Current git status:" -ForegroundColor Green
git status

Write-Host "✅ Cleanup completed!" -ForegroundColor Green
