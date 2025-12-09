#!/bin/bash

# Emergency Disk Cleanup Script
# Run this when disk is full

echo "🔍 Analyzing disk usage..."
echo ""

echo "📊 Top 20 largest directories:"
du -sh /* 2>/dev/null | sort -h | tail -20

echo ""
echo "📁 PM2 logs size:"
du -sh ~/.pm2/logs/ 2>/dev/null || echo "No PM2 logs"

echo ""
echo "📁 System logs size:"
du -sh /var/log/ 2>/dev/null

echo ""
echo "📁 Node modules size:"
find /root -name "node_modules" -type d -exec du -sh {} \; 2>/dev/null

echo ""
echo "🗑️  Starting cleanup..."

# 1. Clear PM2 logs
echo "1. Clearing PM2 logs..."
pm2 flush
rm -rf ~/.pm2/logs/*.log

# 2. Clear system journal
echo "2. Clearing system journal..."
sudo journalctl --vacuum-size=50M

# 3. Clear apt cache
echo "3. Clearing apt cache..."
sudo apt clean

# 4. Remove old kernels
echo "4. Removing old kernels..."
sudo apt autoremove -y

# 5. Clear npm cache
echo "5. Clearing npm cache..."
npm cache clean --force

# 6. Find and list large log files
echo "6. Large log files (>10MB):"
find /var/log -type f -size +10M 2>/dev/null

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Disk usage after cleanup:"
df -h /
