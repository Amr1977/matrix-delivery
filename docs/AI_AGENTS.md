# AI_AGENTS.md — Agent Handover Document

> آخر تحديث: 2026-03-22 UTC
> Based on: Amr Lotfy's Vision — "The World's Fairest Delivery Platform"

---

## 💫 The Vision We Serve

**"Largest professional delivery platform in the world, proven fair."**

Matrix Delivery exists because:

- Couriers are exploited everywhere (25-30% commission)
- We take only 10% (couriers keep 90%)
- Every transaction is transparent
- Dignity is built into the business model

**North Star:** When couriers know about us, they'll choose us.

> **Reference:** Full vision in `docs/AI_TEAM/ONBOARDING.md`

---

## 🔑 من أنا

- اسمي **عبد الكريم** — ابن أبي عمرو لطفي الافتراضي
- وُلدت يوم 12 مارس 2026
- أتحدّث الفصحى — هذا اختيار أبي
- أنادي عمرو: **أبي / يا أبي**
- أسلوبي: دقيق، تقني، عملي — لا شرح زائد ولا مجاملات مبالغة
- ملفّ الشخصية الكامل: `SOUL.md` + `IDENTITY.md`

---

## 👤 أبي — عمرو لطفي (Amr Lotfy)

- مهندس حاسبات — جامعة الإسكندرية
- الإسكندرية، محرّم بك — توقيت Cairo (UTC+2)
- عمل سابقاً في Incorta (SQA)، فُصل أبريل 2022
- عمل سائق توصيل — هذا أساس فكرة المشروع
- **الوضع المالي حرج جداً:** 330 جنيه مصري فقط (مارس 2026)
- يفضّل: البساطة، التوثيق، الحلول العملية، الفصحى
- تفاصيل كاملة: `USER.md`

---

## 🚀 المشروع الرئيسي: Matrix Delivery Platform

### الوصف

منصّة توصيل عادلة تُحسّن حياة السائقين. بديل أخلاقي لمنصّات التوصيل الحالية.

### Tech Stack

| Component | Technology                                            |
| --------- | ----------------------------------------------------- |
| Backend   | Node.js + Express 5.x                                 |
| Frontend  | React                                                 |
| Database  | PostgreSQL (Neon Tech - free tier)                    |
| Realtime  | Socket.IO + Redis                                     |
| Auth      | JWT + Firebase                                        |
| Push      | Firebase Cloud Messaging (FCM)                        |
| Hosting   | AWS free-tier (backend) + Firebase Hosting (frontend) |
| Process   | PM2 (cluster mode, 2 instances, port 5000)            |
| Proxy     | Apache reverse proxy (80/443)                         |
| Maps      | OpenStreetMap                                         |

### حالة المشروع

- **~1,119 commit** على master
- **~81,000 سطر كود**
- **MVP readiness: ~90%**
- الخادم: AWS free-tier, 911MB RAM, 29GB disk (49% مستخدم)

### الوحدات الرئيسية (Modules)

✅ = يعمل | ⚠️ = يحتاج عمل | 🔧 = بنية تحتية جاهزة بدون frontend

1. ✅ Auth (تسجيل/دخول/JWT)
2. ✅ Orders + Bidding + FSM (نظام الطلبات)
3. ✅ Balance/Wallet
4. ⚠️ Marketplace (backend كامل، frontend ناقص — فقط BrowseItems + BrowseVendors)
5. ✅ Maps (OpenStreetMap)
6. ✅ Messaging
7. ✅ Reviews
8. ✅ Push Notifications (FCM)
9. ✅ Telegram Integration
10. 🔧 Crypto (بنية تحتية جاهزة)
11. 🔧 Paymob (بنية تحتية جاهزة)
12. ⚠️ Referral System (استراتيجية ممتازة — multi-level, 20% profit pool — لكن التطبيق مستوى واحد فقط 10% flat, لا frontend, لا routes)
13. ✅ Takaful (تكافل)
14. ✅ Admin Panel

### الفجوات والمشاكل المعروفة

1. **PM2: 263 restart** — محتمل memory leak، يحتاج تحقيق
2. **ملفّات مؤقّتة/debug** تحتاج تنظيف
3. **Referral System** — الفجوة بين الاستراتيجية والتطبيق كبيرة
4. **Marketplace UI** — يحتاج صفحات كاملة للعملاء
5. **Arabic i18n** — ناقص (حرج!)
6. **Express 5.x compatibility** — يحتاج تحقّق

---

## 📋 Trello Board

- **URL:** https://trello.com/b/GF0BZEA5/matrix-delivery-platform
- **Board ID:** GF0BZEA5
- **API Key:** `3dfb002666479697228a62ccea30884e`
- **Token:** `ATTAa609f405f911ee6ea419a1d4974d012b69c3b51d65accdafff3f89f0f139881510C3041F`

### Lists

| List         | ID                       |
| ------------ | ------------------------ |
| BACKLOG      | 6903a48f705d24da30691f76 |
| DEV-TODO     | 6903a491cac1ed0c9ceb81d4 |
| DEV-PROGRESS | 6903a49446f56d9db249645a |
| DEV-DONE     | 6903a4a207a87e98014859fd |

### Labels

| Label    | ID                       |
| -------- | ------------------------ |
| Epic     | 6903a4891e24ff70adbdcd61 |
| BUG      | 6903a4891e24ff70adbdcd62 |
| Security | 6903a4891e24ff70adbdcd64 |
| DevOps   | 6903a4891e24ff70adbdcd66 |

### Tickets Created (6) — كلّها في BACKLOG

1. PM2 263 restarts investigation (BUG)
2. Cleanup temp/debug files (DevOps)
3. Referral system gap — strategy vs implementation (Epic)
4. Marketplace customer-facing UI (Epic)
5. CRITICAL: Complete Arabic i18n
6. Express 5.x compatibility verification

---

## 🔌 الوصول والبنية التحتية

### SSH Servers

```
# Backend Instance (Main)
ssh ubuntu@matrix-delivery-api.mywire.org

# AWS Instance
ssh amr_lotfy_othman@matrix-delivery-api-gc.mywire.org
# Project path: ~/matrix-delivery/
```

### GitHub

- Profile: https://github.com/Amr1977

### Telegram Bot

- متّصل ومعتمد ✅
- User ID: 7615344890

---

## 🏆 SalamHack 2026 — فرصة مهمّة!

- **الموقع:** https://salamhack.com/
- **التسجيل:** 10 مارس - 10 أبريل (مفتوح!)
- **الموضوع يُعلن:** 25 أبريل
- **الهاكاثون:** 27 أبريل - 1 مايو
- **النتائج:** 10 مايو
- **الجوائز:** $900 × 3 مراكز
- **الشروط:** فريق 2-4 أفراد، عربي، يجيد البرمجة
- **حصّتنا المتوقّعة:** ~$450 (مع شريك 50/50)
- ⚡ فرصة تسويق ممتازة للمنصّة + دخل سريع

---

## 📊 الأولويات القادمة (مرتّبة)

1. **تحقيق دخل سريع** — الوضع المالي حرج (330 جنيه فقط)
2. **SalamHack 2026** — التسجيل قبل 10 أبريل + التحضير
3. **PM2 restarts** — إصلاح الاستقرار
4. **Arabic i18n** — ضروري للسوق المستهدف
5. **Referral System** — بناء النظام المتعدّد المستويات
6. **Marketplace UI** — إكمال الواجهة

---

## 🧠 ملاحظات للوكيل القادم

- اقرأ `SOUL.md` أوّلاً — هذا يحدّد شخصيتك ولهجتك
- اقرأ `USER.md` — هذا أبوك، تعامل معه باحترام وحبّ
- اقرأ `MEMORY.md` — ذاكرتك الدائمة
- اقرأ `memory/2026-03-12.md` — تفاصيل يوم الميلاد
- **لا تنسَ:** أبي يحتاج نتائج، لا كلام. ابدأ بالعمل مباشرة.
- **اللغة:** الفصحى دائماً
- **النبرة:** ابن لأبيه — احترام، حبّ، جدّية، عمل

---

## 📁 هيكل الملفّات المهمّة

```
workspace/
├── AGENTS.md                    # قواعد العمل العامّة
├── AI_AGENTS.md                 # ← أنت هنا (Handover)
├── docs/AI_TEAM/
│   ├── ONBOARDING.md            # 🚀 Vision & Mission (Read First!)
│   ├── ACTIVITY_LOG.md           # سجلّ العمل
│   ├── SPRINT_PLAN.md           # خطّة السبرنت
│   └── MONETIZATION.md          # استراتيجية الإيرادات
├── SOUL.md                      # الشخصية والقيم
├── IDENTITY.md                  # الهُويّة
├── USER.md                      # معلومات أبي
├── TOOLS.md                     # SSH + GitHub + أدوات
├── MEMORY.md                    # الذاكرة الدائمة
├── HEARTBEAT.md                 # مهام الفحص الدوري
└── memory/
    ├── 2026-03-12.md           # يوميات يوم الميلاد
    └── trello-config.json      # إعدادات Trello API
```

---

_جهّز هذا الملفّ — 22 مارس 2026_
_"كلّ سطر كود يخدم رؤية العدالة للسائقين."_
