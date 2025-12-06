// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MatrixDeliveryEscrow
 * @dev Escrow contract for Matrix Delivery platform with 15% commission
 */
contract MatrixDeliveryEscrow is ReentrancyGuard, Ownable {
    
    struct Order {
        string orderId;
        address customer;
        address driver;
        address token;
        uint256 amount;
        uint256 platformFee;
        uint256 driverAmount;
        OrderStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    enum OrderStatus {
        Created,        // 0: Order created but not funded
        Funded,         // 1: Customer deposited funds
        Accepted,       // 2: Driver accepted order
        InProgress,     // 3: Delivery in progress
        Completed,      // 4: Delivery completed, funds released
        Disputed,       // 5: Order disputed
        Refunded,       // 6: Order refunded to customer
        Cancelled       // 7: Order cancelled
    }
    
    // State variables
    mapping(string => Order) public orders;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public driverEarnings;
    
    address public platformWallet;
    uint256 public platformCommissionRate; // In basis points (1500 = 15%)
    uint256 public totalOrdersCompleted;
    uint256 public totalVolumeProcessed;
    
    // Events
    event OrderCreated(string indexed orderId, address indexed customer, uint256 amount, address token);
    event OrderFunded(string indexed orderId, address indexed customer, uint256 amount);
    event OrderAccepted(string indexed orderId, address indexed driver);
    event DeliveryStarted(string indexed orderId);
    event OrderCompleted(string indexed orderId, uint256 driverAmount, uint256 platformFee);
    event OrderRefunded(string indexed orderId, uint256 amount);
    event OrderDisputed(string indexed orderId, address indexed initiator);
    event OrderCancelled(string indexed orderId);
    event TokenAdded(address indexed token);
    event CommissionRateUpdated(uint256 oldRate, uint256 newRate);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    /**
     * @dev Constructor
     * @param _platformWallet Address to receive platform commissions
     * @param _commissionRate Commission rate in basis points (1500 = 15%)
     */
    constructor(address _platformWallet, uint256 _commissionRate) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_commissionRate <= 3000, "Commission rate too high"); // Max 30%
        
        platformWallet = _platformWallet;
        platformCommissionRate = _commissionRate;
    }
    
    /**
     * @dev Add supported token
     * @param token Address of ERC20 token to support
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }
    
    /**
     * @dev Remove supported token
     * @param token Address of ERC20 token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        supportedTokens[token] = false;
    }
    
    /**
     * @dev Create and fund order in one transaction
     * @param orderId Unique order identifier
     * @param token ERC20 token address for payment
     * @param amount Payment amount in token's smallest unit
     */
    function createOrder(
        string memory orderId,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(orders[orderId].customer == address(0), "Order already exists");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(orderId).length > 0, "Invalid order ID");
        
        // Calculate fees
        uint256 platformFee = (amount * platformCommissionRate) / 10000;
        uint256 driverAmount = amount - platformFee;
        
        // Create order
        orders[orderId] = Order({
            orderId: orderId,
            customer: msg.sender,
            driver: address(0),
            token: token,
            amount: amount,
            platformFee: platformFee,
            driverAmount: driverAmount,
            status: OrderStatus.Created,
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        emit OrderCreated(orderId, msg.sender, amount, token);
        
        // Transfer tokens to escrow
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        orders[orderId].status = OrderStatus.Funded;
        emit OrderFunded(orderId, msg.sender, amount);
    }
    
    /**
     * @dev Driver accepts order (called by platform backend)
     * @param orderId Order identifier
     * @param driver Driver's wallet address
     */
    function acceptOrder(string memory orderId, address driver) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Funded, "Order not funded");
        require(driver != address(0), "Invalid driver address");
        require(order.customer != driver, "Customer cannot be driver");
        
        order.driver = driver;
        order.status = OrderStatus.Accepted;
        
        emit OrderAccepted(orderId, driver);
    }
    
    /**
     * @dev Mark order in progress (delivery started)
     * @param orderId Order identifier
     */
    function startDelivery(string memory orderId) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Accepted, "Order not accepted");
        
        order.status = OrderStatus.InProgress;
        emit DeliveryStarted(orderId);
    }
    
    /**
     * @dev Complete order and release funds
     * @param orderId Order identifier
     */
    function completeOrder(string memory orderId) external nonReentrant onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.InProgress, "Order not in progress");
        require(order.driver != address(0), "No driver assigned");
        
        // Transfer driver amount to driver
        require(
            IERC20(order.token).transfer(order.driver, order.driverAmount),
            "Driver payment failed"
        );
        
        // Transfer platform fee to platform wallet
        require(
            IERC20(order.token).transfer(platformWallet, order.platformFee),
            "Platform fee transfer failed"
        );
        
        // Update order status
        order.status = OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        // Update statistics
        driverEarnings[order.driver] += order.driverAmount;
        totalOrdersCompleted++;
        totalVolumeProcessed += order.amount;
        
        emit OrderCompleted(orderId, order.driverAmount, order.platformFee);
    }
    
    /**
     * @dev Refund order (before driver accepts or in case of dispute resolution)
     * @param orderId Order identifier
     */
    function refundOrder(string memory orderId) external nonReentrant onlyOwner {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Funded || 
            order.status == OrderStatus.Disputed,
            "Cannot refund"
        );
        
        // Refund full amount to customer
        require(
            IERC20(order.token).transfer(order.customer, order.amount),
            "Refund transfer failed"
        );
        
        order.status = OrderStatus.Refunded;
        
        emit OrderRefunded(orderId, order.amount);
    }
    
    /**
     * @dev Mark order as disputed (can be called by customer or driver)
     * @param orderId Order identifier
     */
    function disputeOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.customer || msg.sender == order.driver || msg.sender == owner(),
            "Not authorized"
        );
        require(
            order.status == OrderStatus.InProgress || order.status == OrderStatus.Accepted,
            "Can only dispute active orders"
        );
        
        order.status = OrderStatus.Disputed;
        
        emit OrderDisputed(orderId, msg.sender);
    }
    
    /**
     * @dev Cancel order (only if not yet accepted by driver)
     * @param orderId Order identifier
     */
    function cancelOrder(string memory orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(
            msg.sender == order.customer || msg.sender == owner(),
            "Not authorized"
        );
        require(order.status == OrderStatus.Funded, "Can only cancel funded orders");
        
        // Refund to customer
        require(
            IERC20(order.token).transfer(order.customer, order.amount),
            "Refund transfer failed"
        );
        
        order.status = OrderStatus.Cancelled;
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev Get order details
     * @param orderId Order identifier
     * @return Order struct
     */
    function getOrder(string memory orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Get driver total earnings
     * @param driver Driver address
     * @return Total earnings amount
     */
    function getDriverEarnings(address driver) external view returns (uint256) {
        return driverEarnings[driver];
    }
    
    /**
     * @dev Update platform commission rate
     * @param newRate New commission rate in basis points
     */
    function updateCommissionRate(uint256 newRate) external onlyOwner {
        require(newRate <= 3000, "Rate too high"); // Max 30%
        
        uint256 oldRate = platformCommissionRate;
        platformCommissionRate = newRate;
        
        emit CommissionRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Update platform wallet address
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        
        address oldWallet = platformWallet;
        platformWallet = newWallet;
        
        emit PlatformWalletUpdated(oldWallet, newWallet);
    }
    
    /**
     * @dev Get contract statistics
     * @return totalOrders Total completed orders
     * @return totalVolume Total volume processed
     * @return currentCommission Current commission rate
     */
    function getStatistics() external view returns (
        uint256 totalOrders,
        uint256 totalVolume,
        uint256 currentCommission
    ) {
        return (totalOrdersCompleted, totalVolumeProcessed, platformCommissionRate);
    }
    
    /**
     * @dev Emergency withdraw (only owner, only for stuck funds)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Emergency withdraw failed");
    }
}
