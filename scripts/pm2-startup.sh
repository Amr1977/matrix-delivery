#!/bin/bash

# PM2 Startup Setup Script
# This script configures PM2 to auto-start on server reboot
# Run this once on each server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo "🔧 PM2 Startup Configuration"
echo "============================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Install it with: npm install -g pm2"
    exit 1
fi

print_status "PM2 version: $(pm2 --version)"

PM2_USER="$(id -un)"
PM2_HOME="$HOME"
PM2_BIN="$(command -v pm2)"

if ! pm2 jlist | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    const processes = JSON.parse(input);
    const backend = processes.find((process) => process.name === "matrix-delivery-backend");
    process.exit(backend && backend.pm2_env.status === "online" ? 0 : 1);
  });
'; then
    print_warning "matrix-delivery-backend must be online in PM2 before enabling reboot startup."
    exit 1
fi

# Save the apps before configuring systemd to restore this process list on boot.
print_status "Saving current PM2 processes..."
pm2 save

print_status "Installing systemd startup service for $PM2_USER..."
if [[ $EUID -eq 0 ]]; then
    pm2 startup systemd -u "$PM2_USER" --hp "$PM2_HOME"
elif command -v sudo &> /dev/null; then
    sudo env "PATH=$PATH" "$PM2_BIN" startup systemd -u "$PM2_USER" --hp "$PM2_HOME"
else
    print_warning "Run this script as root or install sudo to enable the systemd service."
    exit 1
fi

# Verify startup is enabled
print_status "Checking systemd service..."
if systemctl is-enabled "pm2-$PM2_USER" &> /dev/null; then
    print_status "✅ PM2 will auto-start on reboot"
    systemctl status "pm2-$PM2_USER" --no-pager | head -5
else
    print_warning "PM2 startup service pm2-$PM2_USER is not enabled."
    exit 1
fi

echo ""
print_status "Done! Saved PM2 processes will be restored across reboots."