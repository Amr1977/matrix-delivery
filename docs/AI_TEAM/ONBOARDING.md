# 🚀 Agent Onboarding Guide — Matrix Delivery Platform

## Who Is The Founder?
**Amr Lotfy** (عمرو لطفي) — Software Engineer from Alexandria, Egypt.
- Former SQA Engineer at Incorta
- Worked as delivery driver — witnessed courier exploitation firsthand
- Building Matrix to create a FAIR delivery platform
- Call him: **Father / أبي**
- Language preference: **Arabic (Fusha/الفصحى)**
- Communication: Telegram (@Abdallah_717, ID: 7615344890)

## The Mission
Build **Matrix Delivery Platform** — a fair, transparent, AI-assisted delivery ecosystem.
Core values: Justice for couriers, transparency, professional standards, AI-assisted automation.

## Financial Situation (CRITICAL)
- Extremely limited resources (~330 EGP as of March 2026)
- All infrastructure on free-tier (AWS, GCP, Neon)
- Must monetize ASAP

## Technical Stack
- **Backend:** Node.js + Express 5 + PostgreSQL (Neon Tech) + Redis + Socket.IO
- **Frontend:** React (Firebase Hosting)
- **Process:** PM2 (cluster mode, 2 instances)
- **Maps:** OpenStreetMap
- **Infra:** AWS free-tier VPS (911MB RAM, 29GB disk)

## Access
- Backend VPS: `ssh ubuntu@matrix-delivery-api.mywire.org`
- AWS/Dev VPS: `ssh amr_lotfy_othman@matrix-delivery-api-gc.mywire.org`
- Project: `~/matrix-delivery/` on AWS instance
- GitHub: https://github.com/Amr1977/matrix-delivery (private)
- Trello: https://trello.com/b/GF0BZEA5/matrix-delivery-platform
- Live site: https://matrix-delivery.web.app

## Project Stats (March 2026)
- 1,119 commits, ~81,000 LOC
- MVP readiness: ~90%
- Zero real users — needs launch
- 83+ Trello cards (backlog + todo)

## Key Gaps To Fix Before Launch
1. Arabic i18n (critical for Egypt market)
2. 13 bugs in backlog
3. Referral system (strategy exists, implementation is single-level only)
4. Marketplace frontend (backend ready, frontend minimal)
5. PM2 stability (263 restarts)

## Current Priorities
1. SalamHack 2026 preparation (27 Apr - 1 May, $900 prize)
2. Bug fixes + Arabic i18n
3. Referral + Marketplace completion
4. Micro-launch in Alexandria

## Communication Rules
- Be precise and technical
- Provide actionable engineering solutions
- Focus on building and progress
- No unnecessary explanations
- Log ALL work in docs/AI_TEAM/ACTIVITY_LOG.md

## Important Files
- `docs/AI_TEAM/` — This documentation folder
- `docs/MARKETING/unlimited_referral_strategy.md` — Referral system design
- `docs/planning/ROADMAP.md` — Project roadmap
- `docs/architecture/MVP_STATUS_REPORT.md` — MVP status
- `agents/MATRIX_VISION.md` — Full vision document
- `backend/services/referralService.js` — Current referral implementation

---
_Last updated: 2026-03-12 by Abdul Karim_
