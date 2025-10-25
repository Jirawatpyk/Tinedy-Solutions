# Email Automation Setup Guide

Complete guide to setting up automated emails for Tinedy CRM.

## 📋 Table of Contents

1. [Quick Setup (5 minutes)](#quick-setup)
2. [Email Types](#email-types)
3. [Resend Configuration](#resend-configuration)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Testing Emails](#testing-emails)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Setup

### Step 1: Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to [API Keys](https://resend.com/api-keys)
3. Create new API key
4. Copy the key (starts with `re_`)

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Email Configuration
VITE_RESEND_API_KEY=re_your_actual_api_key_here
VITE_EMAIL_FROM=Tinedy CRM <bookings@yourdomain.com>
VITE_EMAIL_REPLY_TO=support@yourdomain.com

# Payment Auto-verify (set to false for manual verification)
VITE_AUTO_VERIFY_PAYMENT=true
```

### Step 3: Run Database Migration

Run the SQL migration to create the email queue table:

```bash
# Run this in Supabase SQL Editor
```

```sql
-- Copy and paste content from:
supabase/migrations/create_email_queue.sql
```

### Step 4: Test!

Create a test booking and check if email is sent.

---

## 📧 Email Types

The system automatically sends 6 types of emails:

### 1. **Booking Confirmation** ✅
- **When:** Immediately after booking creation
- **Includes:** Booking details + Payment link
- **Trigger:** `BookingCreateModal` → after successful booking

### 2. **Payment Link** 💳
- **When:** Manual send from admin
- **Includes:** Payment link with QR code
- **Trigger:** Admin sends link via LINE/WhatsApp/SMS

### 3. **Payment Confirmation** ✅
- **When:** After payment is verified
- **Includes:** Payment receipt + booking confirmation
- **Trigger:**
  - Auto-verify: When slip is uploaded
  - Manual: When admin approves payment

### 4. **Payment Reminder** ⏰
- **When:** 24 hours after booking if still unpaid
- **Includes:** Payment link + booking details
- **Trigger:** Scheduled (Edge Function)

### 5. **Booking Reminder** 🔔
- **When:** 1 day before appointment
- **Includes:** Appointment details
- **Trigger:** Scheduled at 10 AM, 1 day before

### 6. **Booking Rescheduled** 📅
- **When:** Booking date/time is changed
- **Includes:** Old vs new schedule comparison
- **Trigger:** `BookingEditModal` → when date changes

---

## 🔧 Resend Configuration

### Free Tier Limitations

⚠️ **Important:** Resend free tier can only send to **verified email addresses**.

**For Development:**
1. Verify your own email at [Resend Emails](https://resend.com/emails)
2. Use only verified emails for testing

**For Production:**
1. Verify your domain (recommended)
2. Or upgrade to paid plan

### Verify Your Domain

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g., `tinedy.com`)
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification
5. Update `VITE_EMAIL_FROM` to use your domain:

```env
VITE_EMAIL_FROM=Tinedy CRM <bookings@tinedy.com>
```

---

## ⚙️ Environment Variables

### Required Variables

```env
# Required for email to work
VITE_RESEND_API_KEY=re_xxxxx

# Optional - defaults shown
VITE_EMAIL_FROM=Tinedy CRM <bookings@resend.dev>
VITE_EMAIL_REPLY_TO=
VITE_AUTO_VERIFY_PAYMENT=true
```

### Variable Details

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_RESEND_API_KEY` | Your Resend API key | - | ✅ Yes |
| `VITE_EMAIL_FROM` | Sender email address | `bookings@resend.dev` | No |
| `VITE_EMAIL_REPLY_TO` | Reply-to address | Empty | No |
| `VITE_AUTO_VERIFY_PAYMENT` | Auto-approve payments | `true` | No |

### Auto-Verify Payment

- `true` (default): Payments automatically approved when slip uploaded
- `false`: Requires manual admin approval

---

## 🗄️ Database Setup

### 1. Email Queue Table

Run migration: [`create_email_queue.sql`](supabase/migrations/create_email_queue.sql)

This creates:
- `email_queue` table for tracking emails
- Retry mechanism (max 3 attempts)
- Email status tracking (pending/sent/failed)

### 2. Payment Slip Storage

Run migration: [`supabase-setup-payment-storage.sql`](supabase-setup-payment-storage.sql)

This creates:
- `payment-slips` storage bucket
- Public upload policy
- `payment_slip_url` column in bookings

---

## 🧪 Testing Emails

### Test in Development

1. **Set up test email:**
   ```env
   VITE_RESEND_API_KEY=re_your_key
   VITE_EMAIL_FROM=Tinedy <onboarding@resend.dev>
   ```

2. **Verify your email at Resend:**
   - Go to [Resend](https://resend.com/emails)
   - Add your email to verified list

3. **Create test booking:**
   - Use your verified email as customer email
   - Complete booking
   - Check inbox

### What to Test

- [ ] Booking confirmation email received
- [ ] Payment link works
- [ ] Payment confirmation after slip upload
- [ ] Email queue records created
- [ ] Emails retry on failure

### Check Email Queue

```sql
SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 10;
```

### Check Sent Emails

Go to [Resend Logs](https://resend.com/logs) to see delivery status.

---

## 🐛 Troubleshooting

### Email Not Sending

**Check 1: API Key**
```typescript
console.log('API Key:', import.meta.env.VITE_RESEND_API_KEY)
```
Should show `re_...` (not undefined)

**Check 2: Email verified**
- Free tier: Only sends to verified emails
- Go to [Resend](https://resend.com) → Verify email

**Check 3: Check browser console**
```
Failed to send email: [error message]
```

**Check 4: Email queue table**
```sql
SELECT * FROM email_queue WHERE status = 'failed';
```

### Common Errors

#### Error: "Missing API key"
```env
# Add to .env
VITE_RESEND_API_KEY=re_your_key
```

#### Error: "Email not verified"
- Verify email at [Resend](https://resend.com/emails)
- Or verify your domain

#### Error: "Table 'email_queue' does not exist"
Run migration:
```sql
-- Copy from: supabase/migrations/create_email_queue.sql
```

#### Emails going to spam
1. Verify your domain (SPF, DKIM, DMARC)
2. Don't use `@resend.dev` in production
3. Add unsubscribe link (for marketing emails)

---

## 📊 Email Flow Diagram

```
┌─────────────────────────────────────────┐
│  Booking Created                        │
│  (BookingCreateModal)                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Booking Confirmation Email          │
│     - Booking details                   │
│     - Payment link                      │
│     Status: Sent immediately            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Booking Reminder Email              │
│     Status: Scheduled (1 day before)    │
│     Sent at: 10 AM                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Customer Uploads Payment Slip          │
│  (SlipUpload component)                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Auto-verify = true?                    │
└──────┬──────────────────┬───────────────┘
       │ Yes              │ No
       ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  3. Payment     │  │  Status:         │
│  Confirmation   │  │  Pending Review  │
│  Email          │  └──────────────────┘
│  Status: Sent   │
└─────────────────┘
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file**
   ```bash
   # Already in .gitignore
   .env
   .env.local
   ```

2. **Use environment variables**
   - Never hardcode API keys
   - Use Vite's `import.meta.env`

3. **Email validation**
   - Validate email format
   - Check for spam/disposable emails

4. **Rate limiting**
   - Email queue prevents spam
   - Max 3 retry attempts

5. **Secure storage**
   - Payment slips in Supabase Storage
   - Public read, authenticated write

---

## 📞 Support

### Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Supabase Email](https://supabase.com/docs/guides/auth/auth-smtp)

### Need Help?

1. Check [Troubleshooting](#troubleshooting)
2. Check browser console for errors
3. Check Resend logs
4. Check email_queue table

---

## 🎯 Next Steps

After setup is complete:

- [ ] Verify domain for production
- [ ] Set up Edge Functions for scheduled emails
- [ ] Configure email templates (if needed)
- [ ] Set up email analytics
- [ ] Create unsubscribe flow

---

**Happy Emailing! 📬**
