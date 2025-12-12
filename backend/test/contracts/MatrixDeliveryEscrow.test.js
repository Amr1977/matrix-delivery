const { expect } = require("chai");
const hre = require("hardhat");
const { PAYMENT_CONFIG } = require('../../config/paymentConfig.ts');

describe("MatrixDeliveryEscrow", function () {
    let escrow;
    let mockToken;
    let owner;
    let platformWallet;
    let customer;
    let driver;
    let addrs;
    let ORDER_AMOUNT;

    const COMMISSION_RATE = PAYMENT_CONFIG.COMMISSION_RATE * 10000; // Convert to basis points (1500)

    beforeEach(async function () {
        [owner, platformWallet, customer, driver, ...addrs] = await hre.ethers.getSigners();

        ORDER_AMOUNT = hre.ethers.parseUnits("100", 6); // 100 USDC (6 decimals)

        // Deploy mock ERC20 token
        const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock USDC", "USDC", 6);
        await mockToken.waitForDeployment();

        // Mint tokens to customer
        await mockToken.mint(customer.address, hre.ethers.parseUnits("1000", 6));

        // Deploy escrow contract
        const MatrixDeliveryEscrow = await hre.ethers.getContractFactory("MatrixDeliveryEscrow");
        escrow = await MatrixDeliveryEscrow.deploy(platformWallet.address, COMMISSION_RATE);
        await escrow.waitForDeployment();

        // Add token as supported
        await escrow.addSupportedToken(await mockToken.getAddress());
    });

    describe("Deployment", function () {
        it("Should set the correct platform wallet", async function () {
            expect(await escrow.platformWallet()).to.equal(platformWallet.address);
        });

        it("Should set the correct commission rate", async function () {
            expect(await escrow.platformCommissionRate()).to.equal(COMMISSION_RATE);
        });

        it("Should add supported token", async function () {
            expect(await escrow.supportedTokens(await mockToken.getAddress())).to.be.true;
        });
    });

    describe("Order Creation", function () {
        it("Should create and fund order successfully", async function () {
            const orderId = "ORDER_001";

            // Approve escrow to spend tokens
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);

            // Create order
            await expect(
                escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT)
            )
                .to.emit(escrow, "OrderCreated")
                .and.to.emit(escrow, "OrderFunded");

            // Check order details
            const order = await escrow.getOrder(orderId);
            expect(order.customer).to.equal(customer.address);
            expect(order.amount).to.equal(ORDER_AMOUNT);
            expect(order.status).to.equal(1); // Funded

            // Check fee calculation (15%)
            const expectedFee = (ORDER_AMOUNT * BigInt(COMMISSION_RATE)) / 10000n;
            expect(order.platformFee).to.equal(expectedFee);
            expect(order.driverAmount).to.equal(ORDER_AMOUNT - expectedFee);
        });

        it("Should fail if token not supported", async function () {
            const orderId = "ORDER_002";
            const unsupportedToken = addrs[0].address;

            await expect(
                escrow.connect(customer).createOrder(orderId, unsupportedToken, ORDER_AMOUNT)
            ).to.be.revertedWith("Token not supported");
        });

        it("Should fail if order already exists", async function () {
            const orderId = "ORDER_003";

            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT * 2n);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);

            await expect(
                escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT)
            ).to.be.revertedWith("Order already exists");
        });
    });

    describe("Order Acceptance", function () {
        let orderId;

        beforeEach(async function () {
            orderId = "ORDER_ACCEPT_001";
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);
        });

        it("Should allow owner to accept order", async function () {
            await expect(escrow.acceptOrder(orderId, driver.address))
                .to.emit(escrow, "OrderAccepted")
                .withArgs(orderId, driver.address);

            const order = await escrow.getOrder(orderId);
            expect(order.driver).to.equal(driver.address);
            expect(order.status).to.equal(2); // Accepted
        });

        it("Should fail if not owner", async function () {
            await expect(
                escrow.connect(customer).acceptOrder(orderId, driver.address)
            ).to.be.reverted;
        });
    });

    describe("Order Completion", function () {
        let orderId;

        beforeEach(async function () {
            orderId = "ORDER_COMPLETE_001";
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);
            await escrow.acceptOrder(orderId, driver.address);
            await escrow.startDelivery(orderId);
        });

        it("Should complete order and transfer funds correctly", async function () {
            const driverBalanceBefore = await mockToken.balanceOf(driver.address);
            const platformBalanceBefore = await mockToken.balanceOf(platformWallet.address);

            await expect(escrow.completeOrder(orderId))
                .to.emit(escrow, "OrderCompleted");

            const order = await escrow.getOrder(orderId);
            expect(order.status).to.equal(4); // Completed

            // Check balances
            const driverBalanceAfter = await mockToken.balanceOf(driver.address);
            const platformBalanceAfter = await mockToken.balanceOf(platformWallet.address);

            expect(driverBalanceAfter - driverBalanceBefore).to.equal(order.driverAmount);
            expect(platformBalanceAfter - platformBalanceBefore).to.equal(order.platformFee);

            // Check statistics
            expect(await escrow.totalOrdersCompleted()).to.equal(1);
            expect(await escrow.getDriverEarnings(driver.address)).to.equal(order.driverAmount);
        });
    });

    describe("Order Refund", function () {
        let orderId;

        beforeEach(async function () {
            orderId = "ORDER_REFUND_001";
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);
        });

        it("Should refund order before acceptance", async function () {
            const customerBalanceBefore = await mockToken.balanceOf(customer.address);

            await expect(escrow.refundOrder(orderId))
                .to.emit(escrow, "OrderRefunded")
                .withArgs(orderId, ORDER_AMOUNT);

            const order = await escrow.getOrder(orderId);
            expect(order.status).to.equal(6); // Refunded

            const customerBalanceAfter = await mockToken.balanceOf(customer.address);
            expect(customerBalanceAfter - customerBalanceBefore).to.equal(ORDER_AMOUNT);
        });
    });

    describe("Order Cancellation", function () {
        let orderId;

        beforeEach(async function () {
            orderId = "ORDER_CANCEL_001";
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);
        });

        it("Should allow customer to cancel funded order", async function () {
            const customerBalanceBefore = await mockToken.balanceOf(customer.address);

            await expect(escrow.connect(customer).cancelOrder(orderId))
                .to.emit(escrow, "OrderCancelled")
                .withArgs(orderId);

            const order = await escrow.getOrder(orderId);
            expect(order.status).to.equal(7); // Cancelled

            const customerBalanceAfter = await mockToken.balanceOf(customer.address);
            expect(customerBalanceAfter - customerBalanceBefore).to.equal(ORDER_AMOUNT);
        });

        it("Should fail to cancel after driver acceptance", async function () {
            await escrow.acceptOrder(orderId, driver.address);

            await expect(
                escrow.connect(customer).cancelOrder(orderId)
            ).to.be.revertedWith("Can only cancel funded orders");
        });
    });

    describe("Dispute", function () {
        let orderId;

        beforeEach(async function () {
            orderId = "ORDER_DISPUTE_001";
            await mockToken.connect(customer).approve(await escrow.getAddress(), ORDER_AMOUNT);
            await escrow.connect(customer).createOrder(orderId, await mockToken.getAddress(), ORDER_AMOUNT);
            await escrow.acceptOrder(orderId, driver.address);
            await escrow.startDelivery(orderId);
        });

        it("Should allow customer to dispute order", async function () {
            await expect(escrow.connect(customer).disputeOrder(orderId))
                .to.emit(escrow, "OrderDisputed")
                .withArgs(orderId, customer.address);

            const order = await escrow.getOrder(orderId);
            expect(order.status).to.equal(5); // Disputed
        });

        it("Should allow driver to dispute order", async function () {
            await expect(escrow.connect(driver).disputeOrder(orderId))
                .to.emit(escrow, "OrderDisputed")
                .withArgs(orderId, driver.address);

            const order = await escrow.getOrder(orderId);
            expect(order.status).to.equal(5); // Disputed
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update commission rate", async function () {
            const newRate = 2000; // 20%

            await expect(escrow.updateCommissionRate(newRate))
                .to.emit(escrow, "CommissionRateUpdated")
                .withArgs(COMMISSION_RATE, newRate);

            expect(await escrow.platformCommissionRate()).to.equal(newRate);
        });

        it("Should allow owner to update platform wallet", async function () {
            const newWallet = addrs[0].address;

            await expect(escrow.updatePlatformWallet(newWallet))
                .to.emit(escrow, "PlatformWalletUpdated")
                .withArgs(platformWallet.address, newWallet);

            expect(await escrow.platformWallet()).to.equal(newWallet);
        });

        it("Should fail to set commission rate above 30%", async function () {
            await expect(
                escrow.updateCommissionRate(3001)
            ).to.be.revertedWith("Rate too high");
        });
    });
});
