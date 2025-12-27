# 🌐 Custom Domain Setup Guide - Matrix Heroes

**Status:** Ready to implement once domain is purchased  
**Priority:** HIGH - Required before major marketing launch  
**Estimated Time:** 1-2 hours  
**Cost:** $10-15/year  

---

## 📋 Quick Summary

You're currently hosted at `matrix-delivery.web.app` (Firebase subdomain). This guide will help you connect a custom domain while keeping the free Firebase hosting.

**Why this matters for marketing:**
- ✅ 3-5x better conversion rates
- ✅ Professional credibility
- ✅ Better SEO (build your own domain authority)
- ✅ Memorable branding
- ✅ Professional email addresses

---

## 🎯 Recommended Domain Names (In Priority Order)

1. **matrixheroes.com** ⭐ (Best - matches brand)
2. **matrix-heroes.com** (Good alternative)
3. **getmatrixheroes.com** (If others taken)
4. **matrixheroes.io** (Tech-focused alternative)
5. **matrixheroes.app** (Modern alternative)

**Check availability at:**
- [Namecheap](https://www.namecheap.com) - Usually cheapest
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) - At-cost pricing
- [Google Domains](https://domains.google.com) - Easy Firebase integration
- [Porkbun](https://porkbun.com) - Good prices, free WHOIS privacy

---

## 🚀 Step-by-Step Setup

### Step 1: Purchase Domain
1. Choose registrar (Namecheap or Cloudflare recommended)
2. Search for `matrixheroes.com`
3. Purchase domain (~$12/year)
4. Enable WHOIS privacy (usually free)

### Step 2: Connect to Firebase Hosting
```bash
# Navigate to project directory
cd d:\matrix-delivery

# Add custom domain to Firebase
firebase hosting:channel:deploy production

# Or use Firebase Console:
# 1. Go to Firebase Console > Hosting
# 2. Click "Add custom domain"
# 3. Enter your domain (e.g., matrixheroes.com)
# 4. Follow verification steps
```

### Step 3: Configure DNS Records
Firebase will provide DNS records. Add these to your domain registrar:

**A Records (for root domain):**
```
Type: A
Name: @
Value: [Firebase will provide IP addresses]
TTL: 3600
```

**CNAME Record (for www):**
```
Type: CNAME
Name: www
Value: matrix-delivery.web.app
TTL: 3600
```

### Step 4: Verify Domain
- Wait 24-48 hours for DNS propagation
- Firebase will automatically provision SSL certificate
- Test both `matrixheroes.com` and `www.matrixheroes.com`

### Step 5: Set Up Redirects
Keep the old `.web.app` URL redirecting to new domain:
```javascript
// In firebase.json
{
  "hosting": {
    "redirects": [
      {
        "source": "**",
        "destination": "https://matrixheroes.com",
        "type": 301
      }
    ]
  }
}
```

---

## 📧 Professional Email Setup (Optional but Recommended)

### Option 1: Google Workspace (Paid - $6/user/month)
- Professional emails: `hello@matrixheroes.com`, `support@matrixheroes.com`
- Best for business credibility
- Includes Gmail, Drive, Calendar

### Option 2: Cloudflare Email Routing (FREE!)
- Forward emails to your personal Gmail
- Send from custom domain via Gmail
- Perfect for MVP stage

**Cloudflare Email Routing Setup:**
1. Transfer domain to Cloudflare (or use Cloudflare DNS)
2. Enable Email Routing (free)
3. Create forwarding addresses:
   - `hello@matrixheroes.com` → your Gmail
   - `support@matrixheroes.com` → your Gmail
   - `noreply@matrixheroes.com` → your Gmail

### Option 3: Zoho Mail (FREE for 5 users)
- Free professional email
- 5GB storage per user
- Good for small teams

---

## 🔄 Post-Domain Setup Checklist

### Update All Marketing Materials
- [ ] Update website meta tags
- [ ] Update all social media bios
- [ ] Update email signatures
- [ ] Update business cards (if any)
- [ ] Update press kit
- [ ] Update app store listings

### Update Technical Configurations
- [ ] Update `package.json` homepage URL
- [ ] Update environment variables
- [ ] Update API base URLs (if hardcoded)
- [ ] Update OAuth redirect URLs
- [ ] Update sitemap.xml
- [ ] Update robots.txt

### Update Marketing Channels
- [ ] Google Analytics property
- [ ] Google Search Console
- [ ] Facebook Business Manager
- [ ] All social media profiles
- [ ] Email marketing platform
- [ ] Any directory listings

### SEO Migration
- [ ] Set up 301 redirects from `.web.app` to custom domain
- [ ] Submit new sitemap to Google Search Console
- [ ] Update all backlinks (if any)
- [ ] Monitor search rankings during transition

---

## 📊 Expected Timeline

| Task | Duration | When |
|------|----------|------|
| Purchase domain | 15 minutes | Day 1 |
| Configure DNS | 30 minutes | Day 1 |
| DNS propagation | 24-48 hours | Days 1-3 |
| SSL certificate | Automatic | Day 3 |
| Update marketing materials | 2-3 hours | Day 3 |
| Email setup (optional) | 1 hour | Day 3-4 |
| **Total active time** | **4-5 hours** | **3-4 days** |

---

## 💰 Cost Breakdown

| Item | Cost | Frequency |
|------|------|-----------|
| Domain registration | $10-15 | Annual |
| Firebase hosting | FREE | Forever |
| SSL certificate | FREE | Auto-renew |
| Email (Cloudflare) | FREE | Forever |
| Email (Google Workspace) | $6/user | Monthly |
| Email (Zoho) | FREE | Forever (5 users) |
| **Total (recommended)** | **$12/year** | **Annual** |

---

## 🎯 Marketing Impact After Domain Setup

### Before (`.web.app`)
- ❌ Looks like test/demo site
- ❌ Hard to remember URL
- ❌ Low professional credibility
- ❌ SEO built on Google's domain
- ❌ Can't use professional email

### After (Custom Domain)
- ✅ Professional brand presence
- ✅ Easy to remember and share
- ✅ High credibility with users/partners
- ✅ Build your own SEO authority
- ✅ Professional email addresses
- ✅ 3-5x better conversion rates

---

## 🚨 Common Issues & Solutions

### Issue: DNS not propagating
**Solution:** Wait 24-48 hours, clear browser cache, use incognito mode

### Issue: SSL certificate not working
**Solution:** Firebase auto-provisions SSL, wait 24 hours after DNS propagation

### Issue: www vs non-www
**Solution:** Set up both, redirect one to the other (recommend non-www as primary)

### Issue: Old `.web.app` still showing
**Solution:** Set up 301 redirect in `firebase.json`

### Issue: Email not working
**Solution:** Check MX records, SPF, DKIM settings in domain DNS

---

## 📞 When You're Ready to Execute

**Ping me with:**
1. ✅ Domain name you purchased
2. ✅ Registrar you used
3. ✅ Any issues during setup

**I can help you:**
- Configure Firebase custom domain
- Set up DNS records
- Configure email forwarding
- Update all marketing materials
- Migrate SEO properly
- Test everything works

---

## 🎁 Bonus: Domain-Based Features to Add Later

Once you have a custom domain, you can:
- **Subdomains:** `app.matrixheroes.com`, `api.matrixheroes.com`, `blog.matrixheroes.com`
- **Professional emails:** Different addresses for different purposes
- **Email marketing:** Better deliverability with custom domain
- **Brand trust:** SSL certificate shows your company name
- **App deep linking:** Better mobile app integration

---

## 📚 Resources

- [Firebase Custom Domain Docs](https://firebase.google.com/docs/hosting/custom-domain)
- [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)
- [Google Workspace Setup](https://workspace.google.com/)
- [Zoho Mail Free](https://www.zoho.com/mail/)

---

**Next Steps:**
1. ✅ Purchase domain (matrixheroes.com recommended)
2. ✅ Come back to this guide
3. ✅ Follow step-by-step setup
4. ✅ Launch marketing with professional domain! 🚀

---

*Last Updated: December 11, 2025*
