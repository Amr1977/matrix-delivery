#!/bin/bash

##############################################################################
# Git History Cleanup Script
# Removes sensitive files (.env, secrets) from git history
#
# WARNING: This rewrites git history and requires force push!
# Make sure all team members are aware before running this.
#
# Usage: bash cleanup-git-history.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Git History Cleanup - Remove Sensitive Files              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_warning "This script will rewrite git history and require a force push!"
print_warning "All team members will need to re-clone the repository."
echo ""
read -p "Are you sure you want to continue? (yes/NO) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    print_status "Aborted"
    exit 0
fi

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    print_warning "git-filter-repo not found. Installing..."
    
    if command -v pip3 &> /dev/null; then
        pip3 install git-filter-repo
    elif command -v pip &> /dev/null; then
        pip install git-filter-repo
    else
        print_error "pip not found. Please install git-filter-repo manually:"
        print_error "https://github.com/newren/git-filter-repo"
        exit 1
    fi
fi

# Backup current repository
print_status "Creating backup..."
BACKUP_DIR="../matrix-delivery-backup-$(date +%Y%m%d_%H%M%S)"
cp -r . "$BACKUP_DIR"
print_status "Backup created at: $BACKUP_DIR"

# Create list of files to remove
print_status "Identifying sensitive files to remove from history..."

cat > /tmp/git-cleanup-paths.txt <<EOF
.env
.env.local
.env.production
.env.development
.env.staging
.env.test
backend/.env
backend/.env.local
backend/.env.production
backend/.env.development
backend/.env.staging
backend/.env.test
frontend/.env
frontend/.env.local
frontend/.env.production
frontend/.env.development
*.pem
*.key
*.p12
*.jks
*-keystore
google-services.json
firebase-adminsdk-*.json
secrets*.txt
EOF

print_status "Files to remove from history:"
cat /tmp/git-cleanup-paths.txt
echo ""

# Remove files from history
print_status "Removing files from git history..."
git filter-repo --invert-paths --paths-from-file /tmp/git-cleanup-paths.txt --force

# Clean up
rm /tmp/git-cleanup-paths.txt

print_status "Git history cleaned!"
echo ""

# Show repository size reduction
echo "Repository size:"
du -sh .git
echo ""

# Instructions for force push
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  NEXT STEPS                                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Verify the changes:"
echo "   git log --all --oneline | head -20"
echo ""
echo "2. Add remote (if removed by filter-repo):"
echo "   git remote add origin <your-repo-url>"
echo ""
echo "3. Force push to remote (WARNING: Destructive!):"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "4. Notify all team members to:"
echo "   - Backup their local changes"
echo "   - Delete their local repository"
echo "   - Re-clone from remote"
echo ""
echo "5. Rotate all exposed secrets immediately:"
echo "   bash scripts/rotate-secrets.sh production"
echo ""

print_warning "Backup saved at: $BACKUP_DIR"
print_warning "Keep this backup until you verify everything works!"
