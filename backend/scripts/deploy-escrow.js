const hre = require('hardhat');

async function main() {
    console.log('🚀 Deploying MatrixDeliveryEscrow contract...\n');

    const [deployer] = await hre.ethers.getSigners();

    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'MATIC\n');

    // Import payment configuration
    const { PAYMENT_CONFIG } = require('../config/paymentConfig.js') /* P0 FIX: .ts → .js, no .ts file exists */;

    // Configuration
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS || deployer.address;
    const commissionRate = PAYMENT_CONFIG.COMMISSION_RATE * 10000; // Convert 0.15 to 1500 basis points

    console.log('Configuration:');
    console.log('- Platform Wallet:', platformWallet);
    console.log('- Commission Rate:', PAYMENT_CONFIG.COMMISSION_RATE_PERCENT + '%', `(${commissionRate} basis points)\n`);

    // Deploy contract
    const MatrixDeliveryEscrow = await hre.ethers.getContractFactory('MatrixDeliveryEscrow');
    const escrow = await MatrixDeliveryEscrow.deploy(platformWallet, commissionRate);

    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();

    console.log('✅ MatrixDeliveryEscrow deployed to:', escrowAddress, '\n');

    // Add supported tokens
    console.log('Adding supported tokens...');

    const network = await hre.ethers.provider.getNetwork();
    let USDC_ADDRESS, USDT_ADDRESS;

    if (network.chainId === 137n) {
        // Polygon Mainnet
        USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
        USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    } else if (network.chainId === 80001n) {
        // Mumbai Testnet
        USDC_ADDRESS = '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23'; // Mumbai USDC
        USDT_ADDRESS = '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832'; // Mumbai USDT
    } else {
        console.log('⚠️  Unknown network, skipping token addition');
    }

    if (USDC_ADDRESS && USDT_ADDRESS) {
        const tx1 = await escrow.addSupportedToken(USDC_ADDRESS);
        await tx1.wait();
        console.log('✅ Added USDC:', USDC_ADDRESS);

        const tx2 = await escrow.addSupportedToken(USDT_ADDRESS);
        await tx2.wait();
        console.log('✅ Added USDT:', USDT_ADDRESS);
    }

    console.log('\n=== Deployment Complete ===');
    console.log('Contract Address:', escrowAddress);
    console.log('Platform Wallet:', platformWallet);
    console.log('Commission Rate:', commissionRate / 100, '%');
    console.log('Network:', network.name, '(Chain ID:', network.chainId.toString(), ')');

    console.log('\n📝 Add these to your .env file:');
    console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
    console.log(`BLOCKCHAIN_NETWORK=${network.name}`);
    console.log(`BLOCKCHAIN_CHAIN_ID=${network.chainId.toString()}`);

    if (network.chainId === 137n || network.chainId === 80001n) {
        console.log('\n⏳ Waiting 30 seconds before verification...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('\n🔍 Verifying contract on PolygonScan...');
        try {
            await hre.run('verify:verify', {
                address: escrowAddress,
                constructorArguments: [platformWallet, commissionRate],
            });
            console.log('✅ Contract verified!');
        } catch (error) {
            console.log('⚠️  Verification failed:', error.message);
            console.log('You can verify manually later with:');
            console.log(`npx hardhat verify --network ${network.name} ${escrowAddress} ${platformWallet} ${commissionRate}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
