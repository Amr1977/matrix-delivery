const { expect } = require("chai");
const {
  PAYMENT_CONFIG,
  calculateCommission,
  calculatePaymentFee,
  calculateTotalWithFees,
  validatePaymentAmount,
} = require("../../../backend/config/paymentConfig");

describe("Payment Configuration Tests", function () {
  describe("Configuration Constants", function () {
    it("should have correct commission rate", function () {
      expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(0.1);
    });

    it("should calculate percentage from decimal", function () {
      expect(PAYMENT_CONFIG.COMMISSION_RATE_PERCENT).to.equal(10);
    });

    it("should calculate basis points from decimal", function () {
      expect(PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS).to.equal(1000);
    });

    it("should have correct minimum payment amount", function () {
      expect(PAYMENT_CONFIG.MIN_DIGITAL_PAYMENT_AMOUNT).to.equal(5);
    });

    it("should have correct default currency", function () {
      expect(PAYMENT_CONFIG.DEFAULT_CURRENCY).to.equal("EGP");
    });

    it("should support multiple currencies", function () {
      expect(PAYMENT_CONFIG.SUPPORTED_CURRENCIES).to.include.members([
        "EGP",
        "USD",
        "EUR",
      ]);
    });
  });

  describe("Payment Fees", function () {
    it("should have correct card fee", function () {
      expect(PAYMENT_CONFIG.FEES.CARD).to.equal(0.025);
    });

    it("should have correct wallet fee", function () {
      expect(PAYMENT_CONFIG.FEES.WALLET).to.equal(0.025);
    });

    it("should have zero crypto fee", function () {
      expect(PAYMENT_CONFIG.FEES.CRYPTO).to.equal(0);
    });

    it("should have zero COD fee", function () {
      expect(PAYMENT_CONFIG.FEES.COD).to.equal(0);
    });
  });

  describe("Commission Calculation", function () {
    it("should calculate 10% commission correctly", function () {
      const { commission, payout, rate } = calculateCommission(100);
      expect(commission).to.equal(10.0);
      expect(payout).to.equal(90.0);
      expect(rate).to.equal(0.1);
    });

    it("should handle decimal amounts", function () {
      const { commission, payout } = calculateCommission(99.99);
      expect(commission).to.equal(10.0);
      expect(payout).to.equal(89.99);
    });

    it("should handle large amounts", function () {
      const { commission, payout } = calculateCommission(10000);
      expect(commission).to.equal(1000.0);
      expect(payout).to.equal(9000.0);
    });

    it("should handle small amounts", function () {
      const { commission, payout } = calculateCommission(10);
      expect(commission).to.equal(1.0);
      expect(payout).to.equal(9.0);
    });

    it("should support custom commission rates", function () {
      const { commission, payout, rate } = calculateCommission(100, 0.1);
      expect(commission).to.equal(10.0);
      expect(payout).to.equal(90.0);
      expect(rate).to.equal(0.1);
    });
  });

  describe("Payment Fee Calculation", function () {
    it("should calculate card fee correctly", function () {
      const fee = calculatePaymentFee(100, "card");
      expect(fee).to.equal(2.5);
    });

    it("should calculate wallet fee correctly", function () {
      const fee = calculatePaymentFee(100, "wallet");
      expect(fee).to.equal(2.5);
    });

    it("should return zero for crypto", function () {
      const fee = calculatePaymentFee(100, "crypto");
      expect(fee).to.equal(0);
    });

    it("should return zero for COD", function () {
      const fee = calculatePaymentFee(100, "cod");
      expect(fee).to.equal(0);
    });

    it("should handle different amounts", function () {
      expect(calculatePaymentFee(200, "card")).to.equal(5.0);
      expect(calculatePaymentFee(500, "wallet")).to.equal(12.5);
    });
  });

  describe("Total with Fees Calculation", function () {
    it("should calculate total with card fee", function () {
      const total = calculateTotalWithFees(100, "card");
      expect(total).to.equal(102.5);
    });

    it("should calculate total with wallet fee", function () {
      const total = calculateTotalWithFees(100, "wallet");
      expect(total).to.equal(102.5);
    });

    it("should not add fee for crypto", function () {
      const total = calculateTotalWithFees(100, "crypto");
      expect(total).to.equal(100.0);
    });

    it("should not add fee for COD", function () {
      const total = calculateTotalWithFees(100, "cod");
      expect(total).to.equal(100.0);
    });
  });

  describe("Payment Amount Validation", function () {
    it("should validate valid card payment", function () {
      const result = validatePaymentAmount(10, "card");
      expect(result.valid).to.be.true;
      expect(result.error).to.be.undefined;
    });

    it("should reject amount below minimum for card", function () {
      const result = validatePaymentAmount(3, "card");
      expect(result.valid).to.be.false;
      expect(result.error).to.include("Minimum amount");
    });

    it("should reject zero amount", function () {
      const result = validatePaymentAmount(0, "card");
      expect(result.valid).to.be.false;
      expect(result.error).to.include("greater than 0");
    });

    it("should reject negative amount", function () {
      const result = validatePaymentAmount(-10, "card");
      expect(result.valid).to.be.false;
    });

    it("should allow any amount for COD", function () {
      const result = validatePaymentAmount(1, "cod");
      expect(result.valid).to.be.true;
    });
  });

  describe("Payment Methods Configuration", function () {
    it("should have all payment methods enabled", function () {
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.CARD.enabled).to.be.true;
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.WALLET.enabled).to.be.true;
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.CRYPTO.enabled).to.be.true;
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.COD.enabled).to.be.true;
    });

    it("should have correct minimum amounts", function () {
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.CARD.minAmount).to.equal(5);
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.WALLET.minAmount).to.equal(5);
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.CRYPTO.minAmount).to.equal(5);
      expect(PAYMENT_CONFIG.PAYMENT_METHODS.COD.minAmount).to.equal(0);
    });

    it("should have crypto supported tokens", function () {
      expect(
        PAYMENT_CONFIG.PAYMENT_METHODS.CRYPTO.supportedTokens,
      ).to.include.members(["USDC", "USDT"]);
    });
  });

  describe("Edge Cases", function () {
    it("should handle very small commission", function () {
      const { commission } = calculateCommission(1);
      expect(commission).to.equal(0.1);
    });

    it("should handle very large commission", function () {
      const { commission } = calculateCommission(1000000);
      expect(commission).to.equal(100000.0);
    });

    it("should round correctly", function () {
      const { commission, payout } = calculateCommission(33.33);
      expect(commission + payout).to.be.closeTo(33.33, 0.01);
    });
  });

  describe("Consistency Tests", function () {
    it("should maintain commission + payout = total", function () {
      const amounts = [10, 50, 100, 250, 500, 1000];

      amounts.forEach((amount) => {
        const { commission, payout } = calculateCommission(amount);
        expect(commission + payout).to.be.closeTo(amount, 0.01);
      });
    });

    it("should use same rate across all calculations", function () {
      const rate1 = PAYMENT_CONFIG.COMMISSION_RATE;
      const { rate: rate2 } = calculateCommission(100);
      expect(rate1).to.equal(rate2);
    });
  });
});
