@echo off
cd /d "C:\Users\jiesh\Jobtracker-reverted\jobTracker\project"
echo Deleting test files...
del test-ai.js
del test-recategorize.js
del test-resume-analysis.js
del cleanup.ps1
echo Removing files from git tracking...
git rm --cached AI_RECATEGORIZATION_GUIDE.md
git rm --cached LINKEDIN_POST.md
echo Done!
git status
