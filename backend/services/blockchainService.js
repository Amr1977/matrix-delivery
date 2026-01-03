const { ethers } = require('ethers');
const logger = require('../config/logger');

// Contract ABI - Essential functions only
const ESCROW_ABI = [
    'function createOrder(string orderId, address token, uint256 amount) external',
    'function acceptOrder(string orderId, address driver) external',
    'function startDelivery(string orderId) external',
    'function completeOrder(string orderId) external',
    'function refundOrder(string orderId) external',
    'function disputeOrder(string orderId) external',
    'function cancelOrder(string orderId) external',
    'function getOrder(string orderId) external view returns (tuple(string orderId, address customer, address driver, address token, uint256 amount, uint256 platformFee, uint256 driverAmount, uint8 status, uint256 createdAt, uint256 completedAt))',
    'function getDriverEarnings(address driver) external view returns (uint256)',
    'function supportedTokens(address token) external view returns (bool)',
    'event OrderCreated(string indexed orderId, address indexed customer, uint256 amount, address token)',
    'event OrderFunded(string indexed orderId, address indexed customer, uint256 amount)',
    'event OrderAccepted(string indexed orderId, address indexed driver)',
    'event DeliveryStarted(string indexed orderId)',
    'event OrderCompleted(string indexed orderId, uint256 driverAmount, uint256 platformFee)',
    'event OrderRefunded(string indexed orderId, uint256 amount)',
    'event OrderDisputed(string indexed orderId, address indexed initiator)',
    'event OrderCancelled(string indexed orderId)'
];

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

/**
 * Blockchain Service for Matrix Delivery
 * Handles all smart contract interactions
 */
class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.escrowContract = null;
        this.isInitialized = false;
        this.supportedTokens = new Map();
    }

    /**
     * Initialize blockchain connection
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Connect to blockchain
            this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

            // Platform wallet for contract interactions
            this.wallet = new ethers.Wallet(
                process.env.PLATFORM_WALLET_PRIVATE_KEY,
                this.provider
            );

            // Escrow contract instance
            this.escrowContract = new ethers.Contract(
                process.env.ESCROW_CONTRACT_ADDRESS,
                ESCROW_ABI,
                this.wallet
            );

            // Load supported tokens
            await this.loadSupportedTokens();

            this.isInitialized = true;

            logger.info('✅ Blockchain service initialized', {
                network: process.env.BLOCKCHAIN_NETWORK,
                chainId: process.env.BLOCKCHAIN_CHAIN_ID,
                platformWallet: this.wallet.address,
                escrowContract: process.env.ESCROW_CONTRACT_ADDRESS
            });
        } catch (error) {
            logger.error(`❌ Blockchain initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load supported tokens from environment
     */
    async loadSupportedTokens() {
        const tokens = [
            {
                symbol: 'USDC',
                address: process.env.USDC_CONTRACT_ADDRESS,
                decimals: 6
            },
            {
                symbol: 'USDT',
                address: process.env.USDT_CONTRACT_ADDRESS,
                decimals: 6
            }
        ];

        for (const token of tokens) {
            if (token.address) {
                this.supportedTokens.set(token.symbol, token);
                logger.info(`Token registered: ${token.symbol} at ${token.address}`);
            }
        }
    }

    /**
     * Get token contract instance
     */
    getTokenContract(tokenAddress) {
        return new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    }

    /**
     * Get supported tokens list
     */
    getSupportedTokens() {
        return Array.from(this.supportedTokens.values());
    }

    /**
     * Get token by symbol
     */
    getToken(symbol) {
        return this.supportedTokens.get(symbol.toUpperCase());
    }

    /**
     * Check if customer has sufficient balance
     */
    async checkBalance(customerAddress, tokenSymbol, amount) {
        if (!this.isInitialized) await this.initialize();

        try {
            const token = this.getToken(tokenSymbol);
            if (!token) throw new Error(`Token ${tokenSymbol} not supported`);

            const tokenContract = this.getTokenContract(token.address);
            const balance = await tokenContract.balanceOf(customerAddress);
            const requiredAmount = ethers.parseUnits(amount.toString(), token.decimals);

            return {
                hasBalance: balance >= requiredAmount,
                balance: ethers.formatUnits(balance, token.decimals),
                required: amount.toString()
            };
        } catch (error) {
            logger.error(`Balance check failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if customer has approved escrow contract
     */
    async checkAllowance(customerAddress, tokenSymbol, amount) {
        if (!this.isInitialized) await this.initialize();

        try {
            const token = this.getToken(tokenSymbol);
            if (!token) throw new Error(`Token ${tokenSymbol} not supported`);

            const tokenContract = this.getTokenContract(token.address);
            const allowance = await tokenContract.allowance(
                customerAddress,
                process.env.ESCROW_CONTRACT_ADDRESS
            );
            const requiredAmount = ethers.parseUnits(amount.toString(), token.decimals);

            return {
                hasAllowance: allowance >= requiredAmount,
                allowance: ethers.formatUnits(allowance, token.decimals),
                required: amount.toString()
            };
        } catch (error) {
            logger.error(`Allowance check failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Accept order and assign driver
     */
    async acceptOrder(orderId, driverAddress) {
        if (!this.isInitialized) await this.initialize();

        try {
            logger.info(`Accepting order ${orderId} for driver ${driverAddress}`);

            const tx = await this.escrowContract.acceptOrder(orderId, driverAddress);
            const receipt = await tx.wait();

            logger.info(`✅ Order accepted on blockchain`, {
                orderId,
                driverAddress,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            logger.error(`❌ Accept order failed: ${error.message}`, { orderId });
            throw error;
        }
    }

    /**
     * Start delivery
     */
    async startDelivery(orderId) {
        if (!this.isInitialized) await this.initialize();

        try {
            logger.info(`Starting delivery for order ${orderId}`);

            const tx = await this.escrowContract.startDelivery(orderId);
            const receipt = await tx.wait();

            logger.info(`✅ Delivery started on blockchain`, {
                orderId,
                txHash: receipt.hash
            });

            return {
                success: true,
                txHash: receipt.hash
            };
        } catch (error) {
            logger.error(`❌ Start delivery failed: ${error.message}`, { orderId });
            throw error;
        }
    }

    /**
     * Complete order and release funds
     */
    async completeOrder(orderId) {
        if (!this.isInitialized) await this.initialize();

        try {
            logger.info(`Completing order ${orderId}`);

            const tx = await this.escrowContract.completeOrder(orderId);
            const receipt = await tx.wait();

            // Parse OrderCompleted event
            const completedEvent = receipt.logs.find(log => {
                try {
                    const parsed = this.escrowContract.interface.parseLog(log);
                    return parsed && parsed.name === 'OrderCompleted';
                } catch {
                    return false;
                }
            });

            let driverAmount, platformFee;
            if (completedEvent) {
                const parsed = this.escrowContract.interface.parseLog(completedEvent);
                driverAmount = parsed.args.driverAmount;
                platformFee = parsed.args.platformFee;
            }

            logger.info(`✅ Order completed on blockchain`, {
                orderId,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                driverAmount: driverAmount ? ethers.formatUnits(driverAmount, 6) : 'N/A',
                platformFee: platformFee ? ethers.formatUnits(platformFee, 6) : 'N/A'
            });

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                driverAmount: driverAmount ? ethers.formatUnits(driverAmount, 6) : null,
                platformFee: platformFee ? ethers.formatUnits(platformFee, 6) : null
            };
        } catch (error) {
            logger.error(`❌ Complete order failed: ${error.message}`, { orderId });
            throw error;
        }
    }

    /**
     * Refund order
     */
    async refundOrder(orderId) {
        if (!this.isInitialized) await this.initialize();

        try {
            logger.info(`Refunding order ${orderId}`);

            const tx = await this.escrowContract.refundOrder(orderId);
            const receipt = await tx.wait();

            logger.info(`✅ Order refunded on blockchain`, {
                orderId,
                txHash: receipt.hash
            });

            return {
                success: true,
                txHash: receipt.hash
            };
        } catch (error) {
            logger.error(`❌ Refund order failed: ${error.message}`, { orderId });
            throw error;
        }
    }

    /**
     * Get order details from blockchain
     */
    async getOrderDetails(orderId) {
        if (!this.isInitialized) await this.initialize();

        try {
            const order = await this.escrowContract.getOrder(orderId);

            // Determine token decimals
            const tokenContract = this.getTokenContract(order.token);
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();

            return {
                orderId: order.orderId,
                customer: order.customer,
                driver: order.driver,
                token: order.token,
                tokenSymbol: symbol,
                amount: ethers.formatUnits(order.amount, decimals),
                platformFee: ethers.formatUnits(order.platformFee, decimals),
                driverAmount: ethers.formatUnits(order.driverAmount, decimals),
                status: this.getStatusName(order.status),
                statusCode: order.status,
                createdAt: new Date(Number(order.createdAt) * 1000),
                completedAt: order.completedAt > 0 ? new Date(Number(order.completedAt) * 1000) : null
            };
        } catch (error) {
            logger.error(`Get order details failed: ${error.message}`, { orderId });
            throw error;
        }
    }

    /**
     * Get driver total earnings
     */
    async getDriverEarnings(driverAddress) {
        if (!this.isInitialized) await this.initialize();

        try {
            const earnings = await this.escrowContract.getDriverEarnings(driverAddress);

            // Assuming USDC (6 decimals) - adjust if needed
            return {
                totalEarnings: ethers.formatUnits(earnings, 6),
                address: driverAddress
            };
        } catch (error) {
            logger.error(`Get driver earnings failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get status name from enum value
     */
    getStatusName(status) {
        const statuses = [
            'Created',
            'Funded',
            'Accepted',
            'InProgress',
            'Completed',
            'Disputed',
            'Refunded',
            'Cancelled'
        ];
        return statuses[status] || 'Unknown';
    }

    /**
     * Estimate gas for transaction
     */
    async estimateGas(method, ...args) {
        if (!this.isInitialized) await this.initialize();

        try {
            const gasEstimate = await this.escrowContract[method].estimateGas(...args);
            const feeData = await this.provider.getFeeData();

            const estimatedCost = gasEstimate * feeData.gasPrice;

            return {
                gasLimit: gasEstimate.toString(),
                gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
                estimatedCostMATIC: ethers.formatEther(estimatedCost),
                estimatedCostUSD: null // Can be calculated with price oracle
            };
        } catch (error) {
            logger.error(`Gas estimation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get network info
     */
    async getNetworkInfo() {
        if (!this.isInitialized) await this.initialize();

        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            const feeData = await this.provider.getFeeData();

            return {
                name: network.name,
                chainId: network.chainId.toString(),
                blockNumber,
                gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei'
            };
        } catch (error) {
            logger.error(`Get network info failed: ${error.message}`);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new BlockchainService();
