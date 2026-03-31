# 🦸‍♂️ Matrix Heroes Platform

> "Your trusted heroes for delivery and ride-hailing - promoting freedom, transparency, fairness, and heroic collaboration."

![License: MIT](https://img.shields.io/github/license/Amr1977/matrix-heroes?label=license)
![Stars](https://img.shields.io/github/stars/Amr1977/matrix-heroes?style=social)
![Forks](https://img.shields.io/github/forks/Amr1977/matrix-heroes?style=social)
![Build](https://img.shields.io/github/actions/workflow/status/Amr1977/matrix-heroes/.github/workflows/firebase-hosting-deploy.yml?label=build)

---

## 🌍 Overview

The **Matrix Heroes Platform** is an international, open-source initiative to create a **fair, transparent, and decentralized mobility ecosystem**.

Unlike corporate gig platforms that exploit drivers and limit their freedom, Matrix Heroes empowers both **drivers** (our heroes) and **customers** to connect directly — with **no middlemen**, **fair earnings**, and **open-source governance**.

Our heroes transport both **packages** and **passengers**, providing comprehensive mobility solutions with real-time tracking, transparent pricing, and hero-focused incentives.

---

## ⚙️ Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Frontend     | React                                   |
| Backend      | Node.js (Express)                       |
| Database     | PostgreSQL                              |
| Real-time    | WebSocket + Redis                       |
| Hosting      | Firebase (Static Frontend Hosting only) |
| Architecture | Model-View-Controller (MVC)             |

---

## 🔄 V2 Failover System (Redis-based)

The platform uses a 4-tier failover architecture:

```
[Frontend] → [WebSocket] → [Aggregator] → [Redis] ← [Backends]
```

### Components

| Component      | Description                                              |
| -------------- | -------------------------------------------------------- |
| **Backend**    | Express servers register via Redis heartbeat             |
| **Redis**      | Stores server state, routing snapshots, idempotency keys |
| **Aggregator** | Health checks, scoring, broadcasts to WebSocket clients  |
| **Frontend**   | WebSocket client, circuit breaker, weighted failover     |

### Setup

1. **Redis** (`redis/redis.conf`): AOF persistence, password-protected
2. **Aggregator** (`aggregator/`): Scores servers every 5s, WebSocket on port 4001
3. **Backend** (`backend/`): Redis-based registration, heartbeat every 30s
4. **Frontend** (`frontend/src/`): wsClient, circuitBreaker, fetchWithFailover

### Migration

See [migration/README.migration.md](migration/README.migration.md) for V1→V2 migration instructions.

---

## 🚀 Features

- 🧾 **Open bidding system** between heroes (drivers) and customers
- 🛡️ **Dual-service platform**: Delivery + Ride-hailing in one app
- 🚗 **25+ vehicle types** for comprehensive transportation coverage
- 🦸‍♂️ **Hero-focused incentives** and recognition programs
- 🔐 **Secure authentication and route management**
- 💬 **Real-time communication and delivery updates**
- 🌎 **Multi-region delivery and ride-hailing support**
- ⚖️ **Fair commission model and transparent transaction logs**
- 🧠 **Extensible modular architecture for integrations and scaling**

---

## 🧩 Project Structure

```
matrix-heroes/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── models/
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── components/
│   └── public/
└── docs/
```

---

## 🧪 Testing

### Test ID Conventions

All components use `data-testid` attributes for i18n-ready testing. This ensures tests remain stable across language changes.

#### Naming Patterns

| Pattern                 | Example                                             | Usage                |
| ----------------------- | --------------------------------------------------- | -------------------- |
| `{component}-{element}` | `deposit-modal`, `balance-dashboard`                | Component containers |
| `{action}-button`       | `continue-button`, `confirm-deposit-button`         | Action buttons       |
| `{data}-{type}`         | `available-balance-amount`, `current-balance-value` | Data displays        |
| `{state}-{element}`     | `loading-spinner`, `error-message`                  | State indicators     |
| `{collection}-{item}`   | `transactions-list`, `transaction-row`              | Lists and items      |

#### Example Usage

```tsx
// ✅ Good - Language-independent
expect(screen.getByTestId("deposit-button")).toBeInTheDocument();
expect(screen.getByTestId("available-balance-amount")).toHaveTextContent(
  "5000.00 EGP",
);
fireEvent.click(screen.getByTestId("continue-button"));

// ❌ Avoid - Breaks with localization
expect(screen.getByText("Deposit")).toBeInTheDocument();
fireEvent.click(screen.getByText("Continue"));
```

#### Balance Module Test IDs

**BalanceDashboard:**

- `balance-dashboard`, `dashboard-title`, `driver-badge`
- `available-balance-card`, `pending-balance-card`, `held-balance-card`, `total-balance-card`
- `deposit-button`, `withdraw-button`
- `transactions-list`, `transaction-item`
- `loading-spinner`, `error-message`, `retry-button`

**DepositModal:**

- `deposit-modal`, `modal-header`, `modal-title`, `close-button`
- `amount-step`, `payment-step`, `processing-step`, `success-step`
- `deposit-amount-input`, `deposit-description-input`
- `quick-amount-100`, `quick-amount-500`, `quick-amount-1000`, `quick-amount-5000`
- `continue-button`, `confirm-deposit-button`, `done-button`

**WithdrawalModal:**

- `withdrawal-modal`, `modal-header`, `modal-title`
- `amount-step`, `destination-step`, `confirm-step`, `processing-step`, `success-step`
- `withdrawal-amount-input`, `balance-info`, `available-balance`, `daily-limit`, `monthly-limit`
- `destination-bank`, `destination-vodafone`, `destination-orange`, `destination-etisalat`
- `confirm-withdrawal-button`

**TransactionHistory:**

- `transaction-history`, `history-title`, `export-csv-button`
- `search-input`, `type-filter`, `status-filter`, `start-date-filter`, `end-date-filter`
- `transactions-table`, `transaction-row`
- `pagination`, `previous-page-button`, `next-page-button`

**BalanceStatement:**

- `balance-statement`, `statement-title`
- `period-selector`, `period-last7days`, `period-last30days`, `period-custom`
- `start-date-input`, `end-date-input`, `generate-statement-button`
- `statement-preview`, `download-pdf-button`, `download-csv-button`
- `opening-balance`, `total-deposits`, `total-withdrawals`, `closing-balance`

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=BalanceDashboard

# Run balance module tests
npm test -- --testPathPattern=balance

# Run with coverage
npm test -- --coverage
```

## 🗺️ Project Roadmap

A full roadmap of upcoming milestones and features can be found in [`ROADMAP.md`](ROADMAP.md).

---

## 🌐 Links

- GitHub Repo: [https://github.com/Amr1977/matrix-heroes](https://github.com/Amr1977/matrix-heroes)
- Official Site: [https://matrix-heroes.web.app](https://matrix-heroes.web.app)
