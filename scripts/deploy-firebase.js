#!/usr/bin/env node

/**
 * Firebase Deployment Script
 * 
 * Deploys either maintenance page or production build to Firebase Hosting
 * 
 * Usage:
 *   node scripts/deploy-firebase.js maintenance
 *   node scripts/deploy-firebase.js production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line argument
const mode = process.argv[2];

if (!mode || !['maintenance', 'production'].includes(mode)) {
    console.error('\n❌ Invalid argument!');
    console.log('\n📖 Usage:');
    console.log('   node scripts/deploy-firebase.js maintenance');
    console.log('   node scripts/deploy-firebase.js production\n');
    process.exit(1);
}

const frontendDir = path.join(__dirname, '..', 'frontend');
const firebaseConfigPath = path.join(frontendDir, 'firebase.json');

// Backup original firebase.json
const backupPath = path.join(frontendDir, 'firebase.json.backup');

function execCommand(command, cwd = frontendDir) {
    console.log(`\n🔧 Running: ${command}`);
    try {
        execSync(command, {
            cwd,
            stdio: 'inherit',
            shell: true
        });
    } catch (error) {
        console.error(`\n❌ Command failed: ${command}`);
        throw error;
    }
}

async function deployMaintenance() {
    console.log('\n🚧 Deploying MAINTENANCE page...\n');

    // Backup current firebase.json
    if (fs.existsSync(firebaseConfigPath)) {
        fs.copyFileSync(firebaseConfigPath, backupPath);
        console.log('✅ Backed up firebase.json');
    }

    // Create maintenance firebase.json
    const maintenanceConfig = {
        hosting: {
            public: "public/maintenance",
            ignore: [
                "firebase.json",
                "**/.*",
                "**/node_modules/**"
            ],
            rewrites: [
                {
                    source: "**",
                    destination: "/index.html"
                }
            ]
        }
    };

    fs.writeFileSync(
        firebaseConfigPath,
        JSON.stringify(maintenanceConfig, null, 2)
    );
    console.log('✅ Created maintenance firebase.json');

    // Ensure maintenance page exists
    const maintenanceDir = path.join(frontendDir, 'public', 'maintenance');
    const maintenanceIndexPath = path.join(maintenanceDir, 'index.html');

    if (!fs.existsSync(maintenanceIndexPath)) {
        console.log('⚠️  Maintenance page not found, creating default...');

        if (!fs.existsSync(maintenanceDir)) {
            fs.mkdirSync(maintenanceDir, { recursive: true });
        }

        const defaultMaintenancePage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - Matrix Delivery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        .logo {
            font-size: 64px;
            margin-bottom: 20px;
            animation: pulse 2s ease-in-out infinite;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            font-size: 20px;
            color: #94a3b8;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .status {
            display: inline-block;
            padding: 12px 24px;
            background: rgba(16, 185, 129, 0.1);
            border: 2px solid #10b981;
            border-radius: 8px;
            color: #10b981;
            font-weight: bold;
            margin-top: 20px;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🚀</div>
        <h1>Under Maintenance</h1>
        <p>
            We're currently performing scheduled maintenance to improve your experience.
            We'll be back online shortly!
        </p>
        <div class="status">⏱️ Expected downtime: 15-30 minutes</div>
    </div>
</body>
</html>`;

        fs.writeFileSync(maintenanceIndexPath, defaultMaintenancePage);
        console.log('✅ Created default maintenance page');
    }

    // Deploy to Firebase
    execCommand('firebase deploy --only hosting');

    // Restore original firebase.json
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, firebaseConfigPath);
        fs.unlinkSync(backupPath);
        console.log('✅ Restored original firebase.json');
    }

    console.log('\n✅ Maintenance page deployed successfully!');
    console.log('🌐 Visit: https://matrix-delivery-1.web.app\n');
}

async function deployProduction() {
    console.log('\n🚀 Deploying PRODUCTION build...\n');

    // Backup current firebase.json
    if (fs.existsSync(firebaseConfigPath)) {
        fs.copyFileSync(firebaseConfigPath, backupPath);
        console.log('✅ Backed up firebase.json');
    }

    // Create production firebase.json
    const productionConfig = {
        hosting: {
            public: "build",
            ignore: [
                "firebase.json",
                "**/.*",
                "**/node_modules/**"
            ],
            rewrites: [
                {
                    source: "**",
                    destination: "/index.html"
                }
            ],
            headers: [
                {
                    source: "**/*.@(jpg|jpeg|gif|png|svg|webp)",
                    headers: [
                        {
                            key: "Cache-Control",
                            value: "max-age=31536000"
                        }
                    ]
                },
                {
                    source: "**/*.@(js|css)",
                    headers: [
                        {
                            key: "Cache-Control",
                            value: "max-age=31536000"
                        }
                    ]
                }
            ]
        }
    };

    fs.writeFileSync(
        firebaseConfigPath,
        JSON.stringify(productionConfig, null, 2)
    );
    console.log('✅ Created production firebase.json');

    // Build the app
    console.log('\n📦 Building production bundle...');
    execCommand('npm run build');

    // Deploy to Firebase
    execCommand('firebase deploy --only hosting');

    // Restore original firebase.json
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, firebaseConfigPath);
        fs.unlinkSync(backupPath);
        console.log('✅ Restored original firebase.json');
    }

    console.log('\n✅ Production build deployed successfully!');
    console.log('🌐 Visit: https://matrix-delivery-1.web.app\n');
}

async function main() {
    try {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   Matrix Delivery - Firebase Deploy   ║');
        console.log('╚════════════════════════════════════════╝');

        if (mode === 'maintenance') {
            await deployMaintenance();
        } else {
            await deployProduction();
        }

        console.log('✨ Deployment complete!\n');
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);

        // Restore backup if it exists
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, firebaseConfigPath);
            fs.unlinkSync(backupPath);
            console.log('✅ Restored original firebase.json');
        }

        process.exit(1);
    }
}

main();
