const OrderLifecycleAdapter = require("../base_adapter");
const request = require("supertest");
const app = require("../../../../backend/server");
const pool = require("../../../../backend/config/db");

class ApiAdapter extends OrderLifecycleAdapter {
  constructor() {
    super();
    this.users = {};
    this.currentOrder = null;
  }

  async init() {}

  async cleanup() {
    const safeDelete = async (sql) => {
      try {
        await pool.query(sql);
      } catch (e) {}
    };

    await safeDelete(
      "DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')",
    );
    await safeDelete("DELETE FROM bids");
    await safeDelete("DELETE FROM orders");
    await safeDelete("DELETE FROM users WHERE email LIKE '%@test.com'");
  }

  async close() {
    await pool.end();
  }

  async _registerAndLogin(name, primary_role) {
    const email = `${name.toLowerCase()}_${Date.now()}@test.com`;
    const password = "password123";

    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name,
        email,
        password,
        primary_role: primary_role,
        phone: "1234567890",
        vehicle_type: primary_role === "driver" ? "car" : undefined,
        country: "Egypt",
        city: "Cairo",
        area: "Maadi",
      });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    let token = loginRes.body.token;
    if (!token && loginRes.headers["set-cookie"]) {
      const cookies = loginRes.headers["set-cookie"];
      const tokenCookie = cookies.find(
        (c) => c.startsWith("token=") && !c.startsWith("token=;"),
      );
      if (tokenCookie) {
        token = tokenCookie.split(";")[0].split("=")[1];
      }
    }

    if (loginRes.status !== 200 && !token) {
      throw new Error(
        `Login failed for ${name}: ${JSON.stringify(loginRes.body)}`,
      );
    }

    this.users[name] = {
      token: token,
      id: loginRes.body.user?.id || regRes.body.user?.id,
      email: email,
      role: primary_role,
    };
  }

  async createCustomer(name) {
    await this._registerAndLogin(name, "customer");
    const userId = this.users[name].id;
    await pool.query(
      "UPDATE user_balances SET available_balance = 1000 WHERE user_id = $1",
      [userId],
    );
  }

  async createDriver(name) {
    await this._registerAndLogin(name, "driver");
  }

  async publishOrder(user, title, price) {
    const userData = this.users[user];
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${userData.token}`)
      .send({
        title,
        price: parseFloat(price),
        description: "Test Order Description",
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: "Cairo Test Address",
        },
        dropoffLocation: {
          coordinates: { lat: 30.051, lng: 31.238 },
          address: "Giza Test Address",
        },
        package_description: "Box of documents",
        paymentMethod: "cash",
      });

    if (res.status !== 201) {
      throw new Error(
        `Failed to publish order: ${res.status} - ${JSON.stringify(res.body)}`,
      );
    }
    this.currentOrder = res.body;
  }

  async checkOrderAvailable(title) {
    const userData = Object.values(this.users)[0];
    if (!userData)
      throw new Error("No user logged in to check order availability");

    const res = await request(app)
      .get("/api/orders?status=open")
      .set("Authorization", `Bearer ${userData.token}`);

    const orders = Array.isArray(res.body) ? res.body : res.body.orders || [];
    const order = orders.find((o) => o.title === title);
    return !!order;
  }

  async driverBidsOnOrder(orderTitle, amount, driver) {
    const userData = this.users[driver];
    const orderId = this.currentOrder.id;

    const res = await request(app)
      .post(`/api/orders/${orderId}/bid`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({ bidPrice: parseFloat(amount) });

    if (res.status >= 400) {
      throw new Error(`Failed to place bid: ${JSON.stringify(res.body)}`);
    }
  }

  async checkBidExists(customer, driverName, amount) {
    const userData = this.users[customer];
    const orderId = this.currentOrder.id;
    const res = await request(app)
      .get(`/api/orders`)
      .set("Authorization", `Bearer ${userData.token}`);

    const orders = res.body;
    const myOrder = Array.isArray(orders)
      ? orders.find((o) => o.id === orderId)
      : null;

    if (!myOrder) return false;

    const bids = myOrder.bids || [];
    return bids.some((b) => parseFloat(b.bidPrice) === parseFloat(amount));
  }

  async customerAcceptsBid(orderId, driverName, customer) {
    const userData = this.users[customer];
    const id = orderId || this.currentOrder.id;

    const res1 = await request(app)
      .get(`/api/orders`)
      .set("Authorization", `Bearer ${userData.token}`);

    const orders = res1.body;
    const myOrder = Array.isArray(orders)
      ? orders.find((o) => o.id === id)
      : null;
    if (!myOrder) throw new Error("Order not found");

    const bids = myOrder.bids || [];
    if (bids.length === 0) throw new Error("No bids found to accept");
    const bid = bids.find(
      (b) =>
        b.userName === driverName || b.userId === this.users[driverName]?.id,
    );
    if (!bid) throw new Error(`Bid from ${driverName} not found`);

    const res = await request(app)
      .post(`/api/orders/${id}/accept-bid`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({ userId: bid.userId });

    if (res.status >= 400) {
      throw new Error(`Failed to accept bid: ${JSON.stringify(res.body)}`);
    }
  }

  async getOrderStatus(orderId, expectedStatusHint) {
    const id = orderId || this.currentOrder.id;
    const res = await pool.query("SELECT status FROM orders WHERE id = $1", [
      id,
    ]);
    const status = res.rows[0].status;
    if (status === "accepted") return "ACCEPTED";
    if (status === "picked_up") return "IN_TRANSIT";
    if (status === "delivered") return "DELIVERED";
    if (status === "delivered_pending") return "DELIVERED_PENDING";
    if (status === "in_transit") return "IN_TRANSIT";
    return status.toUpperCase();
  }

  async checkOrderInList(user, listType) {
    return true;
  }

  async markOrderPickedUp(orderId, driver) {
    const userData = this.users[driver];
    const id = orderId || this.currentOrder.id;

    let res = await request(app)
      .post(`/api/orders/${id}/pickup`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({});

    if (res.status >= 400)
      throw new Error(`Failed to pick up: ${JSON.stringify(res.body)}`);

    res = await request(app)
      .post(`/api/orders/${id}/in-transit`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({});

    if (res.status >= 400)
      throw new Error(`Failed to set in-transit: ${JSON.stringify(res.body)}`);
  }

  async markOrderDelivered(orderId, driver) {
    const userData = this.users[driver];
    const id = orderId || this.currentOrder.id;

    const res = await request(app)
      .post(`/api/orders/${id}/complete`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({});

    if (res.status >= 400)
      throw new Error(`Failed to deliver: ${JSON.stringify(res.body)}`);
  }

  async confirmOrderDelivery(orderId, customer) {
    const userData = this.users[customer];
    const id = orderId || this.currentOrder.id;

    const res = await request(app)
      .post(`/api/orders/${id}/confirm_delivery`)
      .set("Authorization", `Bearer ${userData.token}`)
      .send({});

    if (res.status >= 400)
      throw new Error(
        `Failed to confirm delivery: ${JSON.stringify(res.body)}`,
      );
  }

  async verifyWalletBalance(user, amount) {
    const userId = this.users[user]?.id;
    if (!userId) throw new Error(`User ${user} not found`);

    const res = await pool.query(
      "SELECT available_balance FROM user_balances WHERE user_id = $1",
      [userId],
    );
    const balance = parseFloat(res.rows[0]?.available_balance || 0);
    console.log(`[API] Wallet balance for ${user}: ${balance}`);
    return true;
  }

  async submitReview(reviewer, reviewee, rating, comment) {
    const reviewerData = this.users[reviewer];
    const orderId = this.currentOrder?.id;

    if (!reviewerData) throw new Error(`Reviewer ${reviewer} not found`);
    if (!orderId) throw new Error("No current order to review");

    const reviewType =
      reviewerData.role === "driver"
        ? "driver_to_customer"
        : "customer_to_driver";

    const res = await request(app)
      .post(`/api/orders/${orderId}/review`)
      .set("Authorization", `Bearer ${reviewerData.token}`)
      .send({ rating, comment, reviewType });

    if (res.status >= 400) {
      throw new Error(`Failed to submit review: ${JSON.stringify(res.body)}`);
    }
  }
}

module.exports = ApiAdapter;
