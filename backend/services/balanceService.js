/**
 * Balance Service - Core Implementation (JS Version)
 */

const { Pool } = require("pg");
const crypto = require("crypto");
const {
  Currency,
  TransactionType,
  TransactionStatus,
  DEFAULT_CURRENCY,
  TRANSACTION_LIMITS,
} = require("../types/balance.js");
const { PAYMENT_CONFIG } = require("../config/paymentConfig.js");
const logger = require("../config/logger");
const emailService = require("./emailService");

const WITHDRAWAL_PIN_REQUIRED = process.env.WITHDRAWAL_PIN_REQUIRED !== "false";

class BalanceService {
  constructor(pool) {
    this.pool = pool;
    this.notificationService = null;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async getBalance(userId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          user_id as "userId",
          available_balance as "availableBalance",
          pending_balance as "pendingBalance",
          held_balance as "heldBalance",
          total_balance as "totalBalance",
          currency,
          daily_withdrawal_limit as "dailyWithdrawalLimit",
          monthly_withdrawal_limit as "monthlyWithdrawalLimit",
          minimum_balance as "minimumBalance",
          auto_reload_threshold as "autoReloadThreshold",
          auto_reload_amount as "autoReloadAmount",
          lifetime_deposits as "lifetimeDeposits",
          lifetime_withdrawals as "lifetimeWithdrawals",
          lifetime_earnings as "lifetimeEarnings",
          total_transactions as "totalTransactions",
          is_active as "isActive",
          is_frozen as "isFrozen",
          freeze_reason as "freezeReason",
          frozen_at as "frozenAt",
          frozen_by as "frozenBy",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_transaction_at as "lastTransactionAt"
        FROM user_balances
        WHERE user_id = $1`,
        [userId],
      );

      if (result.rows.length === 0) {
        // If balance not found, create one implicitly or throw?
        // The TS version threw Error. But createBalance calls getBalance after proper insert.
        // Let's create one if not exists to be safe and robust?
        // No, behave like original.
        // Wait, logic in canAcceptOrders calls `getBalance`.
        // If user has no balance record, it throws.
        // Let's Auto-create if not found?
        // Safe approach: use createBalance logic if not found.
        return this.createBalance(userId);
      }

      const row = result.rows[0];
      return {
        ...row,
        availableBalance: parseFloat(row.availableBalance) || 0,
        pendingBalance: parseFloat(row.pendingBalance) || 0,
        heldBalance: parseFloat(row.heldBalance) || 0,
        totalBalance: parseFloat(row.totalBalance) || 0,
        dailyWithdrawalLimit: parseFloat(row.dailyWithdrawalLimit) || 0,
        monthlyWithdrawalLimit: parseFloat(row.monthlyWithdrawalLimit) || 0,
        minimumBalance: parseFloat(row.minimumBalance) || 0,
        lifetimeDeposits: parseFloat(row.lifetimeDeposits) || 0,
        lifetimeWithdrawals: parseFloat(row.lifetimeWithdrawals) || 0,
        lifetimeEarnings: parseFloat(row.lifetimeEarnings) || 0,
      };
    } catch (error) {
      // If strictly from getBalance call within createBalance, we need to avoid infinite loop
      // But createBalance calls this.pool.query INSERT then getBalance.
      if (error.message && error.message.includes("Balance not found")) {
        // Try to create
        const createRes = await this.pool.query(
          `INSERT INTO user_balances (user_id, currency, available_balance) 
                     VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING`,
          [userId, DEFAULT_CURRENCY],
        );
        // If we recursively call getBalance, it should find it now.
        // To avoid storing "Balance not found" in logs repeatedly:
        const retry = await this.pool.query(
          `SELECT user_id as "userId", available_balance as "availableBalance" FROM user_balances WHERE user_id = $1`,
          [userId],
        );
        if (retry.rows.length > 0) {
          return this.getBalance(userId); // call again to get full fields
        }
      }
      logger.error("Error getting balance", { userId, error: error.message });
      throw error;
    }
  }

  async createBalance(userId, currency = DEFAULT_CURRENCY) {
    try {
      await this.pool.query(
        `INSERT INTO user_balances (
          user_id, currency, available_balance, pending_balance, held_balance
        ) VALUES ($1, $2, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING`,
        [userId, currency],
      );
      return this.getBalance(userId);
    } catch (error) {
      logger.error("Error creating balance", {
        userId,
        currency,
        error: error.message,
      });
      throw error;
    }
  }

  // ... simplified versions of other methods ...

  async getBalanceForUpdate(client, userId) {
    // Helper
    const result = await client.query(
      `SELECT * FROM user_balances WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    if (result.rows.length === 0) {
      // Create on the fly if needed
      await client.query(
        `INSERT INTO user_balances (user_id, currency, available_balance) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
        [userId, DEFAULT_CURRENCY],
      );
      const retry = await client.query(
        `SELECT * FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (retry.rows.length === 0)
        throw new Error(`Balance not found for user ${userId}`);
      return {
        ...retry.rows[0],
        availableBalance: parseFloat(retry.rows[0].available_balance || 0),
      };
    }
    return {
      ...result.rows[0],
      availableBalance: parseFloat(result.rows[0].available_balance || 0),
      currency: result.rows[0].currency,
      isFrozen: result.rows[0].is_frozen,
    };
  }

  async createTransaction(client, data) {
    const txId = crypto.randomUUID();
    const query = `
           INSERT INTO balance_transactions (
             user_id, transaction_id, type, amount, currency, balance_before, balance_after, 
             status, description, order_id, withdrawal_request_id, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING id, transaction_id
         `;
    const res = await client.query(query, [
      data.userId,
      txId,
      data.type,
      data.amount,
      data.currency,
      data.balanceBefore ?? 0,
      data.balanceAfter ?? 0,
      data.status,
      data.description,
      data.orderId ?? null,
      data.withdrawalRequestId ?? null,
    ]);
    return { ...data, transactionId: res.rows[0]?.transaction_id || txId };
  }

  async deposit(dto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const balance = await this.getBalanceForUpdate(client, dto.userId);
      const balanceBefore = balance.availableBalance;
      const balanceAfter = balanceBefore + dto.amount;

      const transaction = await this.createTransaction(client, {
        userId: dto.userId,
        type: TransactionType.DEPOSIT,
        amount: dto.amount,
        currency: dto.currency || balance.currency,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: dto.description || "Deposit",
      });

      await client.query(
        `UPDATE user_balances
                 SET available_balance = available_balance + $1,
                     lifetime_deposits = lifetime_deposits + $1,
                     total_transactions = total_transactions + 1,
                     last_transaction_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2`,
        [dto.amount, dto.userId],
      );

      await client.query("COMMIT");
      const updatedBalance = await this.getBalance(dto.userId);
      return {
        transaction,
        balance: updatedBalance,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Deposit failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async withdraw(dto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const amount = parseFloat(dto.amount);
      if (!amount || amount <= 0) {
        throw new Error("Invalid withdrawal amount");
      }

      const balance = await this.getBalanceForUpdate(client, dto.userId);

      if (balance.isFrozen) {
        throw new Error("Your balance is frozen. Contact support.");
      }

      if (balance.availableBalance < amount) {
        throw new Error(
          `Insufficient balance. Required: ${amount}, Available: ${balance.availableBalance}`,
        );
      }

      const dailyLimit =
        balance.dailyWithdrawalLimit != null
          ? parseFloat(balance.dailyWithdrawalLimit)
          : 0;
      if (dailyLimit > 0 && amount > dailyLimit) {
        throw new Error("Daily withdrawal limit exceeded");
      }

      const currency = balance.currency || DEFAULT_CURRENCY;
      const requestNumber = `WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const metadata = dto.metadata || {};
      const method = metadata.withdrawalMethod || "manual";
      const destinationType = metadata.destinationType || "manual";

      let destinationDetails = metadata.destinationDetails;
      if (!destinationDetails) {
        if (metadata.walletNumber) {
          destinationDetails = {
            walletNumber: metadata.walletNumber,
          };
        } else if (metadata.instapayAlias) {
          destinationDetails = {
            instapayAlias: metadata.instapayAlias,
          };
        } else {
          destinationDetails = {
            destination: dto.destination,
          };
        }
      }

      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date();
      const requiresVerification = WITHDRAWAL_PIN_REQUIRED;
      const verificationCode = requiresVerification ? pin : null;
      const verificationSentAt = requiresVerification ? now : null;

      const insertQuery = `
                INSERT INTO withdrawal_requests (
                    request_number,
                    user_id,
                    amount,
                    currency,
                    withdrawal_method,
                    destination_type,
                    destination_details,
                    status,
                    requires_verification,
                    verification_code,
                    verification_sent_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                RETURNING id
            `;

      const insertResult = await client.query(insertQuery, [
        requestNumber,
        dto.userId,
        amount,
        currency,
        method,
        destinationType,
        JSON.stringify(destinationDetails),
        "pending",
        requiresVerification,
        verificationCode,
        verificationSentAt,
      ]);

      const requestId = insertResult.rows[0].id;

      const userResult = await client.query(
        "SELECT name, email FROM users WHERE id = $1",
        [dto.userId],
      );

      const userRow = userResult.rows[0] || null;

      await client.query("COMMIT");

      if (!requiresVerification) {
        const request = {
          id: requestId,
          user_id: dto.userId,
          amount,
          currency,
        };
        this._notifyAdminsOfWithdrawal(request).catch((error) => {
          logger.error("Failed to notify admins of new withdrawal", {
            error: error.message,
            requestId,
          });
        });
      }

      if (requiresVerification && userRow && userRow.email) {
        try {
          await emailService.sendWithdrawalPinEmail(
            userRow.email,
            userRow.name || "User",
            pin,
            {
              amount,
              currency,
              destination: dto.destination,
            },
          );
        } catch (emailError) {
          logger.error("Failed to send withdrawal PIN email", {
            userId: dto.userId,
            error: emailError.message,
          });
        }
      }

      const updatedBalance = await this.getBalance(dto.userId);
      const result = {
        withdrawalRequestId: requestId,
        balance: updatedBalance,
      };
      if (
        requiresVerification &&
        process.env.NODE_ENV &&
        process.env.NODE_ENV !== "production"
      ) {
        result.verificationCodeDebug = pin;
      }
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Withdrawal initiation failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyWithdrawal(dto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const requestResult = await client.query(
        "SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE",
        [dto.withdrawalRequestId],
      );

      if (requestResult.rows.length === 0) {
        throw new Error("Withdrawal request not found");
      }

      const request = requestResult.rows[0];
      const requestUserId = request.user_id;

      if (String(requestUserId) !== String(dto.userId)) {
        throw new Error("Unauthorized withdrawal verification");
      }

      if (!request.requires_verification) {
        throw new Error("Withdrawal request already verified");
      }

      if (request.status !== "pending") {
        throw new Error("Withdrawal request is not pending");
      }

      const sentAt = request.verification_sent_at;
      if (sentAt) {
        const sentTime = new Date(sentAt).getTime();
        if (Date.now() - sentTime > 15 * 60 * 1000) {
          throw new Error("Verification code expired");
        }
      }

      if (request.verification_code !== dto.code) {
        throw new Error("Invalid verification code");
      }

      const amount = parseFloat(request.amount);
      if (!amount || amount <= 0) {
        throw new Error("Invalid withdrawal amount");
      }

      const balance = await this.getBalanceForUpdate(client, dto.userId);

      if (balance.availableBalance < amount) {
        throw new Error(
          `Insufficient balance. Required: ${amount}, Available: ${balance.availableBalance}`,
        );
      }

      const currency = balance.currency || DEFAULT_CURRENCY;
      const balanceBefore = balance.availableBalance;
      const balanceAfter = balance.availableBalance - amount;

      await client.query(
        `UPDATE user_balances
                 SET available_balance = available_balance - $1,
                     held_balance = held_balance + $1,
                     lifetime_withdrawals = lifetime_withdrawals + $1,
                     total_transactions = total_transactions + 1,
                     last_transaction_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2`,
        [amount, dto.userId],
      );

      const transaction = await this.createTransaction(client, {
        userId: dto.userId,
        type: TransactionType.WITHDRAWAL,
        amount: -amount,
        currency,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.PENDING,
        description: "Withdrawal request pending manual processing",
        withdrawalRequestId: dto.withdrawalRequestId,
      });

      await client.query(
        `UPDATE withdrawal_requests
                 SET requires_verification = FALSE,
                     verified_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`,
        [dto.withdrawalRequestId],
      );

      await client.query("COMMIT");

      const updatedBalance = await this.getBalance(dto.userId);
      const requestForNotification = {
        id: dto.withdrawalRequestId,
        user_id: dto.userId,
        amount,
        currency,
      };
      this._notifyAdminsOfWithdrawal(requestForNotification).catch((error) => {
        logger.error("Failed to notify admins after withdrawal verification", {
          error: error.message,
          requestId: dto.withdrawalRequestId,
        });
      });
      return {
        transaction,
        balance: updatedBalance,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Withdrawal verification failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingWithdrawals(options = {}) {
    const { limit = 20, offset = 0 } = options;
    const query = `
            SELECT 
                wr.id,
                wr.request_number,
                wr.user_id,
                u.name as user_name,
                u.email as user_email,
                wr.amount,
                wr.currency,
                wr.withdrawal_method,
                wr.destination_type,
                wr.destination_details,
                wr.status,
                wr.created_at,
                wr.verified_at
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            WHERE wr.status = 'pending' 
            AND wr.requires_verification = FALSE
            ORDER BY wr.verified_at ASC
            LIMIT $1 OFFSET $2
        `;
    const result = await this.pool.query(query, [limit, offset]);

    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM withdrawal_requests 
             WHERE status = 'pending' AND requires_verification = FALSE`,
    );

    return {
      requests: result.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  async approveWithdrawal(adminId, requestId, reference) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get request
      const res = await client.query(
        `SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      if (res.rows.length === 0) throw new Error("Request not found");
      const request = res.rows[0];

      if (request.status !== "pending" || request.requires_verification) {
        throw new Error("Request not eligible for approval");
      }

      // Update request status
      await client.query(
        `UPDATE withdrawal_requests 
                 SET status = 'completed', 
                     processed_at = NOW(), 
                     processed_by = $1,
                     transaction_reference = $2
                 WHERE id = $3`,
        [adminId, reference, requestId],
      );

      // Update balance transaction
      await client.query(
        `UPDATE balance_transactions
                 SET status = $1, description = $2
                 WHERE user_id = $3 AND withdrawal_request_id = $4 AND type = $5 AND status = $6`,
        [
          TransactionStatus.COMPLETED,
          `Withdrawal processed: ${reference}`,
          request.user_id,
          requestId,
          TransactionType.WITHDRAWAL,
          TransactionStatus.PENDING,
        ],
      );

      // Deduct held balance
      await client.query(
        `UPDATE user_balances
                 SET held_balance = held_balance - $1,
                     updated_at = NOW()
                 WHERE user_id = $2`,
        [request.amount, request.user_id],
      );

      // Notify user
      const userRes = await client.query(
        "SELECT email, name FROM users WHERE id = $1",
        [request.user_id],
      );
      if (userRes.rows.length > 0) {
        const { email, name } = userRes.rows[0];
        try {
          await emailService.sendWithdrawalProcessedEmail(
            email,
            name,
            request.amount,
            request.currency,
            "completed",
            reference,
          );
        } catch (e) {
          logger.warn("Failed to send processed email", e);
        }
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectWithdrawal(adminId, requestId, reason) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query(
        `SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      if (res.rows.length === 0) throw new Error("Request not found");
      const request = res.rows[0];

      if (request.status !== "pending" || request.requires_verification) {
        throw new Error("Request not eligible for rejection");
      }

      // Update request status
      await client.query(
        `UPDATE withdrawal_requests 
                 SET status = 'rejected', 
                     processed_at = NOW(), 
                     processed_by = $1,
                     rejection_reason = $2
                 WHERE id = $3`,
        [adminId, reason, requestId],
      );

      // Update balance transaction
      await client.query(
        `UPDATE balance_transactions
                 SET status = $1, description = $2
                 WHERE user_id = $3 AND withdrawal_request_id = $4 AND type = $5 AND status = $6`,
        [
          TransactionStatus.FAILED,
          `Withdrawal rejected: ${reason}`,
          request.user_id,
          requestId,
          TransactionType.WITHDRAWAL,
          TransactionStatus.PENDING,
        ],
      );

      // Refund held balance back to available
      await client.query(
        `UPDATE user_balances
                 SET held_balance = held_balance - $1,
                     available_balance = available_balance + $1,
                     lifetime_withdrawals = lifetime_withdrawals - $1,
                     updated_at = NOW()
                 WHERE user_id = $2`,
        [request.amount, request.user_id],
      );

      // Notify user
      const userRes = await client.query(
        "SELECT email, name FROM users WHERE id = $1",
        [request.user_id],
      );
      if (userRes.rows.length > 0) {
        const { email, name } = userRes.rows[0];
        try {
          await emailService.sendWithdrawalProcessedEmail(
            email,
            name,
            request.amount,
            request.currency,
            "rejected",
            reason,
          );
        } catch (e) {
          logger.warn("Failed to send processed email", e);
        }
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelWithdrawal(dto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const res = await client.query(
        `SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`,
        [dto.withdrawalRequestId],
      );

      if (res.rows.length === 0) {
        throw new Error("Withdrawal request not found");
      }

      const request = res.rows[0];

      if (String(request.user_id) !== String(dto.userId)) {
        throw new Error("Unauthorized withdrawal cancellation");
      }

      if (request.status !== "pending") {
        throw new Error("Withdrawal request is not pending");
      }

      const amount = parseFloat(request.amount);
      if (!amount || amount <= 0) {
        throw new Error("Invalid withdrawal amount");
      }

      if (request.requires_verification) {
        await client.query(
          `UPDATE withdrawal_requests
                     SET status = 'cancelled',
                         updated_at = NOW()
                     WHERE id = $1`,
          [dto.withdrawalRequestId],
        );
      } else {
        const reason = dto.reason || "Cancelled by user";

        await client.query(
          `UPDATE withdrawal_requests
                     SET status = 'cancelled',
                         processed_at = NOW(),
                         processed_by = $1,
                         rejection_reason = $2,
                         updated_at = NOW()
                     WHERE id = $3`,
          [dto.userId, reason, dto.withdrawalRequestId],
        );

        await client.query(
          `UPDATE balance_transactions
                     SET status = $1,
                         description = $2,
                         updated_at = NOW()
                     WHERE user_id = $3
                       AND withdrawal_request_id = $4
                       AND type = $5
                       AND status = $6`,
          [
            TransactionStatus.CANCELLED,
            `Withdrawal cancelled by user: ${reason}`,
            request.user_id,
            dto.withdrawalRequestId,
            TransactionType.WITHDRAWAL,
            TransactionStatus.PENDING,
          ],
        );

        await client.query(
          `UPDATE user_balances
                     SET held_balance = held_balance - $1,
                         available_balance = available_balance + $1,
                         lifetime_withdrawals = lifetime_withdrawals - $1,
                         updated_at = NOW()
                     WHERE user_id = $2`,
          [amount, request.user_id],
        );
      }

      await client.query("COMMIT");
      const balance = await this.getBalance(request.user_id);
      return { balance };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Cancel withdrawal failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async creditEarnings(dto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const balance = await this.getBalanceForUpdate(client, dto.driverId);
      const balanceBefore = balance.availableBalance;
      const balanceAfter = balanceBefore + dto.amount;

      await this.createTransaction(client, {
        userId: dto.driverId,
        type: TransactionType.EARNINGS,
        amount: dto.amount,
        currency: dto.currency || balance.currency,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: dto.description,
        orderId: dto.orderId,
      });

      await client.query(
        `UPDATE user_balances
                 SET available_balance = available_balance + $1,
                     lifetime_earnings = lifetime_earnings + $1,
                     total_transactions = total_transactions + 1,
                     last_transaction_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2`,
        [dto.amount, dto.driverId],
      );

      await client.query("COMMIT");
      return this.getBalance(dto.driverId);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Credit earnings failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deductCommission(driverId, orderId, commission) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const balance = await this.getBalanceForUpdate(client, driverId);
      const balanceBefore = balance.availableBalance;
      const balanceAfter = balanceBefore - commission;

      if (commission <= 0) {
        await client.query("ROLLBACK");
        return this.getBalance(driverId);
      }

      await this.createTransaction(client, {
        userId: driverId,
        type: TransactionType.COMMISSION_DEDUCTION,
        amount: -commission,
        currency: balance.currency,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        description: `Platform commission for order #${orderId}`,
        orderId: orderId,
      });

      await client.query(
        `UPDATE user_balances
                 SET available_balance = available_balance - $1,
                     total_transactions = total_transactions + 1,
                     last_transaction_at = CURRENT_TIMESTAMP
                 WHERE user_id = $2`,
        [commission, driverId],
      );

      await client.query("COMMIT");

      // Notifications (simplified)
      // check payment config thresholds
      // ...

      return this.getBalance(driverId);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Commission deduction failed", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction history with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} options.userId - User ID
   * @param {number} [options.limit=20] - Number of transactions per page (max 100)
   * @param {number} [options.offset=0] - Offset for pagination
   * @param {string} [options.type] - Filter by transaction type
   * @param {string} [options.status] - Filter by transaction status
   * @param {Date} [options.startDate] - Filter by start date
   * @param {Date} [options.endDate] - Filter by end date
   * @param {string} [options.orderId] - Filter by order ID
   * @param {string} [options.sortBy='created_at'] - Sort field
   * @param {string} [options.sortOrder='DESC'] - Sort order (ASC/DESC)
   * @returns {Promise<Object>} Transaction history with pagination info
   */
  async getTransactionHistory(options = {}) {
    try {
      const {
        userId,
        limit = 20,
        offset = 0,
        type,
        status,
        startDate,
        endDate,
        orderId,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;

      // Validation
      if (!userId) {
        throw new Error("userId is required");
      }

      // Sanitize and validate limit (max 100, min 1)
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const sanitizedOffset = Math.max(parseInt(offset) || 0, 0);

      // Validate sort fields to prevent SQL injection
      const allowedSortFields = ["created_at", "amount", "type", "status"];
      const sanitizedSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "created_at";
      const sanitizedSortOrder =
        sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // Build WHERE clause dynamically
      const conditions = ["user_id = $1"];
      const params = [userId];
      let paramIndex = 2;

      if (type) {
        conditions.push(`type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      if (orderId) {
        conditions.push(`order_id = $${paramIndex}`);
        params.push(orderId);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // Get total count for pagination
      const countQuery = `
                SELECT COUNT(*) as total
                FROM balance_transactions
                WHERE ${whereClause}
            `;
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || 0);

      // Get transactions
      const query = `
                SELECT 
                    id,
                    transaction_id as "transactionId",
                    user_id as "userId",
                    type,
                    amount,
                    currency,
                    balance_before as "balanceBefore",
                    balance_after as "balanceAfter",
                    status,
                    description,
                    metadata,
                    order_id as "orderId",
                    wallet_payment_id as "walletPaymentId",
                    withdrawal_request_id as "withdrawalRequestId",
                    related_transaction_id as "relatedTransactionId",
                    processed_by as "processedBy",
                    processing_method as "processingMethod",
                    processed_at as "processedAt",
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                FROM balance_transactions
                WHERE ${whereClause}
                ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

      params.push(sanitizedLimit, sanitizedOffset);
      const result = await this.pool.query(query, params);

      // Format transactions
      const transactions = result.rows.map((tx) => ({
        ...tx,
        amount: parseFloat(tx.amount) || 0,
        balanceBefore: parseFloat(tx.balanceBefore) || 0,
        balanceAfter: parseFloat(tx.balanceAfter) || 0,
        createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : null,
        updatedAt: tx.updatedAt ? new Date(tx.updatedAt).toISOString() : null,
        processedAt: tx.processedAt
          ? new Date(tx.processedAt).toISOString()
          : null,
      }));

      // Calculate pagination metadata
      const hasMore = sanitizedOffset + sanitizedLimit < total;
      const totalPages = Math.ceil(total / sanitizedLimit);
      const currentPage = Math.floor(sanitizedOffset / sanitizedLimit) + 1;

      return {
        transactions,
        pagination: {
          total,
          limit: sanitizedLimit,
          offset: sanitizedOffset,
          currentPage,
          totalPages,
          hasMore,
          hasPrevious: sanitizedOffset > 0,
        },
      };
    } catch (error) {
      logger.error("Error getting transaction history", {
        userId: options.userId,
        error: error.message,
      });
      throw error;
    }
  }

  async canAcceptOrders(driverId) {
    try {
      const balance = await this.getBalance(driverId);
      const threshold = PAYMENT_CONFIG.DEBT_MANAGEMENT.MAX_DEBT_THRESHOLD; // e.g. -200

      // If balance is -250, threshold is -200. -250 <= -200 is TRUE.
      if (balance.availableBalance <= threshold) {
        return {
          canAccept: false,
          reason: `Balance (${balance.availableBalance} EGP) below minimum threshold (${threshold} EGP).`,
          currentBalance: balance.availableBalance,
          debtThreshold: threshold,
        };
      }

      return {
        canAccept: true,
        currentBalance: balance.availableBalance,
        debtThreshold: threshold,
      };
    } catch (error) {
      logger.error("Error checking canAcceptOrders", error);
      // Fail safe?
      return { canAccept: false, reason: "Error checking balance" };
    }
  }

  /**
   * Check if driver can bid on orders
   * Used for bidding eligibility check
   * @param {string} driverId - Driver user ID
   * @returns {Promise<Object>} { canBid: boolean, reason?: string }
   */
  async canBid(driverId) {
    try {
      const balance = await this.getBalance(driverId);
      const threshold = PAYMENT_CONFIG.DEBT_MANAGEMENT.MAX_DEBT_THRESHOLD;

      if (balance.availableBalance < threshold) {
        return {
          canBid: false,
          reason: `Balance (${balance.availableBalance} EGP) below minimum threshold (${threshold} EGP). Please top up to continue bidding.`,
          currentBalance: balance.availableBalance,
          debtThreshold: threshold,
        };
      }

      return {
        canBid: true,
        currentBalance: balance.availableBalance,
        debtThreshold: threshold,
      };
    } catch (error) {
      logger.error("Error checking canBid", error);
      return { canBid: false, reason: "Error checking balance" };
    }
  }

  /**
   * Check if driver has active orders
   * @param {string} driverId - Driver user ID
   * @returns {Promise<boolean>}
   */
  async hasActiveOrders(driverId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as count FROM orders 
                 WHERE assigned_driver_user_id = $1 
                 AND status IN ('accepted', 'picked_up', 'in_transit')`,
        [driverId],
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error("Error checking hasActiveOrders", error);
      return false;
    }
  }

  /**
   * Deduct platform fee from courier balance on COD delivery
   * @param {string} userId - Courier user ID
   * @param {string} orderId - Order ID
   * @param {number} amount - Fee amount to deduct (10% of bid price)
   * @returns {Promise<Object>} Updated balance
   */
  async deductPlatformFee(userId, orderId, amount) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get current balance with lock
      const balance = await this.getBalanceForUpdate(client, userId);

      // Deduct fee from available balance
      const newBalance = balance.availableBalance - amount;
      await client.query(
        `
                UPDATE user_balances 
                SET available_balance = $1,
                    updated_at = NOW(),
                    last_transaction_at = NOW()
                WHERE user_id = $2
            `,
        [newBalance, userId],
      );

      // Create transaction record
      await this.createTransaction(client, {
        userId,
        type: TransactionType.PLATFORM_FEE,
        amount: -amount,
        currency: balance.currency || DEFAULT_CURRENCY,
        balanceBefore: balance.availableBalance,
        balanceAfter: newBalance,
        status: TransactionStatus.COMPLETED,
        orderId,
        description: `Platform fee for COD order #${orderId}`,
      });

      await client.query("COMMIT");

      logger.info("Platform fee deducted", {
        userId,
        orderId,
        feeAmount: amount,
        newBalance,
      });

      return {
        success: true,
        previousBalance: balance.availableBalance,
        newBalance,
        feeDeducted: amount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to deduct platform fee", {
        userId,
        orderId,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deduct cancellation fee from customer balance and credit driver for COD orders
   * @param {string} customerId - Customer user ID
   * @param {string} orderId - Order ID
   * @param {number} feeAmount - Cancellation fee amount
   * @param {string} driverId - Driver user ID to credit
   * @returns {Promise<Object>} Result
   */
  async deductCancellationFee(customerId, orderId, feeAmount, driverId) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Deduct from customer
      const customerBalance = await this.getBalanceForUpdate(
        client,
        customerId,
      );
      const customerAfter = customerBalance.availableBalance - feeAmount;
      await client.query(
        `UPDATE user_balances SET available_balance = $1, updated_at = NOW() WHERE user_id = $2`,
        [customerAfter, customerId],
      );
      await this.createTransaction(client, {
        userId: customerId,
        type: TransactionType.PENALTY,
        amount: -feeAmount,
        currency: customerBalance.currency || DEFAULT_CURRENCY,
        balanceBefore: customerBalance.availableBalance,
        balanceAfter: customerAfter,
        status: TransactionStatus.COMPLETED,
        orderId,
        description: `Cancellation fee for order #${orderId}`,
      });

      // Credit driver
      const driverBalance = await this.getBalanceForUpdate(client, driverId);
      const driverAfter = driverBalance.availableBalance + feeAmount;
      await client.query(
        `UPDATE user_balances SET available_balance = $1, lifetime_earnings = lifetime_earnings + $2, updated_at = NOW() WHERE user_id = $3`,
        [driverAfter, feeAmount, driverId],
      );
      await this.createTransaction(client, {
        userId: driverId,
        type: TransactionType.COMPENSATION,
        amount: feeAmount,
        currency: driverBalance.currency || DEFAULT_CURRENCY,
        balanceBefore: driverBalance.availableBalance,
        balanceAfter: driverAfter,
        status: TransactionStatus.COMPLETED,
        orderId,
        description: `Cancellation compensation for order #${orderId}`,
      });

      await client.query("COMMIT");
      logger.info("Cancellation fee processed", {
        customerId,
        driverId,
        orderId,
        feeAmount,
      });
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to deduct cancellation fee", {
        customerId,
        orderId,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // ESCROW METHODS - Order Balance Hold System
  // ============================================

  /**
   * Hold funds from customer's available balance for an order
   * Called when bid is accepted
   * @param {string} userId - Customer user ID
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount to hold (upfront + delivery_fee)
   * @returns {Promise<Object>} Updated balance
   */
  async holdFunds(userId, orderId, amount) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get current balance with lock
      const balance = await this.getBalanceForUpdate(client, userId);

      if (balance.availableBalance < amount) {
        throw new Error(
          `Insufficient balance. Required: ${amount}, Available: ${balance.availableBalance}`,
        );
      }

      // Move from available to held
      await client.query(
        `
                UPDATE user_balances 
                SET available_balance = available_balance - $1,
                    held_balance = held_balance + $1,
                    updated_at = NOW()
                WHERE user_id = $2
            `,
        [amount, userId],
      );

      // Create transaction record
      const balanceBefore = balance.availableBalance;
      const balanceAfter = balance.availableBalance - amount;
      await this.createTransaction(client, {
        userId,
        // Use canonical transaction type that matches DB constraint
        type: TransactionType.HOLD,
        amount: -amount,
        currency: balance.currency || DEFAULT_CURRENCY,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        orderId,
        description: `Escrow hold for order #${orderId}`,
      });

      await client.query("COMMIT");

      logger.info("Funds held for order", { userId, orderId, amount });
      return await this.getBalance(userId);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error holding funds", {
        userId,
        orderId,
        amount,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release held funds back to customer (order cancelled with no penalty)
   * Or release to complete order (funds go to driver)
   * @param {string} userId - Customer user ID
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount to release
   * @param {Object} options - Options
   * @param {string} [options.destinationUserId] - If specified, transfer to this user (driver)
   * @param {number} [options.platformCommission] - Platform commission to deduct
   * @param {number} [options.takafulContribution] - Takaful contribution to deduct
   * @returns {Promise<Object>} Updated balance
   */
  async releaseHold(userId, orderId, amount, options = {}) {
    const client = await this.pool.connect();
    try {
      console.log(
        `[DEBUG] releaseHold called for order ${orderId}, amount ${amount}, user ${userId}`,
      );
      await client.query("BEGIN");

      // SERIALIZATION LOCK: Lock the order to prevent concurrent payment processing
      // This ensures multiple requests wait here, and subsequent ones see the transaction created by the first
      console.log(`[DEBUG] releaseHold acquiring lock for order ${orderId}`);
      await client.query("SELECT id FROM orders WHERE id = $1 FOR UPDATE", [
        orderId,
      ]);
      console.log(`[DEBUG] releaseHold lock acquired for order ${orderId}`);

      // IDEMPOTENCY CHECK: Ensure we haven't already processed this order
      console.log(
        `[DEBUG] releaseHold checking idempotency for order ${orderId}`,
      );
      const idempotencyCheck = await client.query(
        `SELECT id, type, created_at FROM balance_transactions 
                 WHERE order_id = $1 
                 AND type IN ($2, $3, $4) 
                 LIMIT 1`,
        [
          orderId,
          TransactionType.EARNINGS,
          TransactionType.ORDER_REFUND,
          TransactionType.ORDER_PAYMENT,
        ],
      );

      if (idempotencyCheck.rows.length > 0) {
        logger.info(
          `[DEBUG] Release hold already processed for order ${orderId} - skipping duplicate. Found tx: ${JSON.stringify(idempotencyCheck.rows[0])}`,
          { userId, orderId },
        );
        console.log(
          `[DEBUG] releaseHold idempotency hit for order ${orderId}. Transaction found: ${idempotencyCheck.rows[0].id}`,
        );
        await client.query("ROLLBACK");
        return await this.getBalance(userId);
      }

      console.log(
        `[DEBUG] releaseHold processing new transaction for order ${orderId}`,
      );
      logger.info(
        `[DEBUG] Processing releaseHold for order ${orderId}. No existing transactions found.`,
        { userId, orderId },
      );

      // Verify held balance
      const balance = await this.getBalanceForUpdate(client, userId);
      if (balance.heldBalance < amount) {
        throw new Error(
          `Insufficient held balance. Required: ${amount}, Held: ${balance.heldBalance}`,
        );
      }

      // Remove from held balance
      await client.query(
        `
                UPDATE user_balances 
                SET held_balance = held_balance - $1,
                    updated_at = NOW()
                WHERE user_id = $2
            `,
        [amount, userId],
      );

      if (options.destinationUserId) {
        // Order completed - transfer to driver (minus commission)
        let driverAmount = amount;

        if (options.platformCommission) {
          driverAmount -= options.platformCommission;
        }
        if (options.takafulContribution) {
          driverAmount -= options.takafulContribution;
        }

        // Credit driver balance
        await client.query(
          `
                    UPDATE user_balances 
                    SET available_balance = available_balance + $1,
                        lifetime_earnings = lifetime_earnings + $1,
                        updated_at = NOW()
                    WHERE user_id = $2
                `,
          [driverAmount, options.destinationUserId],
        );

        // Create driver earning transaction
        const driverBalance = await this.getBalanceForUpdate(
          client,
          options.destinationUserId,
        );
        await this.createTransaction(client, {
          userId: options.destinationUserId,
          // Driver receives earnings for a completed order
          type: TransactionType.EARNINGS,
          amount: driverAmount,
          currency: driverBalance.currency || DEFAULT_CURRENCY,
          balanceBefore: driverBalance.availableBalance,
          balanceAfter: driverBalance.availableBalance + driverAmount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Earnings from order #${orderId}`,
        });

        // Create customer payment transaction for completed order
        await this.createTransaction(client, {
          userId,
          type: TransactionType.ORDER_PAYMENT,
          amount: -amount,
          currency: balance.currency || DEFAULT_CURRENCY,
          balanceBefore: balance.heldBalance,
          balanceAfter: balance.heldBalance - amount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Order #${orderId} completed`,
        });
      } else {
        // Refund to customer (cancelled order)
        await client.query(
          `
                    UPDATE user_balances 
                    SET available_balance = available_balance + $1,
                        updated_at = NOW()
                    WHERE user_id = $2
                `,
          [amount, userId],
        );

        await this.createTransaction(client, {
          userId,
          type: TransactionType.ORDER_REFUND,
          amount: amount,
          currency: balance.currency || DEFAULT_CURRENCY,
          balanceBefore: balance.availableBalance,
          balanceAfter: balance.availableBalance + amount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Refund for cancelled order #${orderId}`,
        });
      }

      await client.query("COMMIT");

      logger.info("Hold released", {
        userId,
        orderId,
        amount,
        destination: options.destinationUserId,
      });
      return await this.getBalance(userId);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error releasing hold", {
        userId,
        orderId,
        amount,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Forfeit held funds - used when cancellation requires compensation
   * @param {string} customerId - Customer user ID
   * @param {string} orderId - Order ID
   * @param {number} totalHeld - Total amount held
   * @param {number} penaltyAmount - Amount to pay driver
   * @param {string} driverId - Driver user ID to receive compensation
   * @returns {Promise<Object>} Result with customer and driver balances
   */
  async forfeitHold(customerId, orderId, totalHeld, penaltyAmount, driverId) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Verify held balance
      const customerBalance = await this.getBalanceForUpdate(
        client,
        customerId,
      );
      if (customerBalance.heldBalance < totalHeld) {
        throw new Error(`Insufficient held balance for forfeit`);
      }

      // Remove from customer held
      await client.query(
        `
                UPDATE user_balances 
                SET held_balance = held_balance - $1,
                    updated_at = NOW()
                WHERE user_id = $2
            `,
        [totalHeld, customerId],
      );

      // Return remainder to customer
      const refundAmount = totalHeld - penaltyAmount;
      if (refundAmount > 0) {
        await client.query(
          `
                    UPDATE user_balances 
                    SET available_balance = available_balance + $1,
                        updated_at = NOW()
                    WHERE user_id = $2
                `,
          [refundAmount, customerId],
        );

        await this.createTransaction(client, {
          userId: customerId,
          type: TransactionType.ORDER_REFUND,
          amount: refundAmount,
          currency: customerBalance.currency || DEFAULT_CURRENCY,
          balanceBefore: customerBalance.availableBalance,
          balanceAfter: customerBalance.availableBalance + refundAmount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Partial refund for cancelled order #${orderId}`,
        });
      }

      // Pay penalty to driver
      if (penaltyAmount > 0) {
        await client.query(
          `
                    UPDATE user_balances 
                    SET available_balance = available_balance + $1,
                        lifetime_earnings = lifetime_earnings + $1,
                        updated_at = NOW()
                    WHERE user_id = $2
                `,
          [penaltyAmount, driverId],
        );

        const driverBalance = await this.getBalanceForUpdate(client, driverId);
        await this.createTransaction(client, {
          userId: driverId,
          // Driver receives compensation as earnings
          type: TransactionType.EARNINGS,
          amount: penaltyAmount,
          currency: driverBalance.currency || DEFAULT_CURRENCY,
          balanceBefore: driverBalance.availableBalance,
          balanceAfter: driverBalance.availableBalance + penaltyAmount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Compensation for cancelled order #${orderId}`,
        });

        await this.createTransaction(client, {
          userId: customerId,
          // Customer pays a penalty/cancellation fee
          type: TransactionType.PENALTY,
          amount: -penaltyAmount,
          currency: customerBalance.currency || DEFAULT_CURRENCY,
          balanceBefore: customerBalance.availableBalance + refundAmount,
          balanceAfter:
            customerBalance.availableBalance + refundAmount - penaltyAmount,
          status: TransactionStatus.COMPLETED,
          orderId,
          description: `Cancellation fee for order #${orderId}`,
        });
      }

      await client.query("COMMIT");

      logger.info("Hold forfeited", {
        customerId,
        orderId,
        totalHeld,
        penaltyAmount,
        refundAmount,
        driverId,
      });

      return {
        customerBalance: await this.getBalance(customerId),
        driverBalance: await this.getBalance(driverId),
        penaltyAmount,
        refundAmount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error forfeiting hold", {
        customerId,
        orderId,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if customer has sufficient balance for order
   * @param {string} userId - Customer user ID
   * @param {number} upfrontPayment - Upfront payment amount
   * @param {number} estimatedFee - Estimated delivery fee
   * @returns {Promise<Object>} Result with canCreate and details
   */
  async checkOrderBalance(userId, upfrontPayment, estimatedFee) {
    const requiredBalance = upfrontPayment + estimatedFee;

    try {
      const balance = await this.getBalance(userId);
      return {
        canCreate: balance.availableBalance >= requiredBalance,
        availableBalance: balance.availableBalance,
        requiredBalance,
        shortfall: Math.max(0, requiredBalance - balance.availableBalance),
      };
    } catch (error) {
      // If user doesn't exist (FK error), treat as insufficient balance
      if (error.code === "23503" || error.message.includes("foreign key")) {
        logger.warn("Balance check failed - user may not exist", {
          userId,
          error: error.message,
        });
        return {
          canCreate: false,
          availableBalance: 0,
          requiredBalance,
          shortfall: requiredBalance,
          error: "User not found",
        };
      }
      throw error;
    }
  }

  async _notifyAdminsOfWithdrawal(request) {
    if (!this.notificationService) {
      return;
    }

    try {
      const adminResult = await this.pool.query(
        `SELECT id FROM users WHERE primary_role = 'admin' AND is_active = true`,
      );

      const admins = adminResult.rows;
      const amount = parseFloat(request.amount);
      const currency = request.currency || DEFAULT_CURRENCY;

      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin.id,
          orderId: null,
          type: "withdrawal_pending",
          title: "New Withdrawal Request",
          message: `New withdrawal request of ${amount} ${currency} pending processing`,
        });
      }

      logger.info("Admin notifications sent for withdrawal request", {
        requestId: request.id,
        adminCount: admins.length,
      });
    } catch (error) {
      logger.error("Error notifying admins of withdrawal", {
        error: error.message,
        requestId: request.id,
      });
    }
  }
}

module.exports = { BalanceService };
