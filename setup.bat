@echo off
cd /d "%~dp0"
echo ============================================
echo  Mind Matter Writing Dashboard - Setup
echo ============================================
echo.

echo [1/4] Initializing git...
git init -b main
git add .
git commit -m "Initial commit: Mind Matter Writing Dashboard"
echo.

echo [2/4] Creating GitHub repo...
gh repo create kh1emnguyen/mind-matter-writing --public --source=. --push --description "Mind Matter Writing Dashboard - live editorial feedback for Substack drafts"

if %ERRORLEVEL% neq 0 (
    echo.
    echo  gh CLI not found. Falling back to manual remote...
    echo  Please create the repo at https://github.com/new
    echo  Name: mind-matter-writing  /  Visibility: Public
    echo  Then come back here and press any key.
    pause >nul
    git remote add origin https://github.com/kh1emnguyen/mind-matter-writing.git
    git branch -M main
    git push -u origin main
)

echo.
echo [3/4] Enabling GitHub Pages via API...
gh api repos/kh1emnguyen/mind-matter-writing/pages --method POST --field source[branch]=gh-pages 2>nul || (
    gh api repos/kh1emnguyen/mind-matter-writing --method PATCH --field has_pages=true 2>nul
    echo  Note: enable GitHub Pages manually in Settings > Pages > Source: GitHub Actions
)

echo.
echo [4/4] Done!
echo.
echo  Dashboard will be live at:
echo  https://kh1emnguyen.github.io/mind-matter-writing/
echo.
echo  GitHub Actions is building now - check:
echo  https://github.com/kh1emnguyen/mind-matter-writing/actions
echo.
pause
