# 💳 Payment System Setup Guide

## 📋 Overview

This guide will help you set up the complete payment system for Tinedy CRM, including:
- PromptPay QR Code payments
- Bank transfer slip uploads
- Payment verification workflow

---

## 🚀 Quick Setup (5 Minutes)

### **Step 1: Configure Supabase Storage**

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase-setup-payment-storage.sql`
5. Click **Run**

This will:
- ✅ Create `payment-slips` storage bucket
- ✅ Set up public upload/read policies
- ✅ Add `payment_slip_url` column to bookings table

### **Step 2: Update PromptPay ID**

Open `src/components/payment/PromptPayQR.tsx` and update line 21:

```typescript
// Change this to your PromptPay phone number or ID number
const promptPayId = '0812345678' // ⚠️ UPDATE THIS!
```

**PromptPay ID options:**
- Mobile phone number (10 digits): `0812345678`
- Citizen ID (13 digits): `1234567890123`
- Tax ID: Your business tax ID

### **Step 3: Verify Setup**

1. Go to Supabase Dashboard > **Storage**
2. Verify `payment-slips` bucket exists
3. Check policies are set correctly

---

## 🔄 Payment Flow

### **Customer Journey:**

```
1. Admin creates booking
   ↓
2. Admin copies payment link
   ↓
3. Admin sends link via LINE/WhatsApp/SMS
   ↓
4. Customer clicks link → Opens payment page
   ↓
5. Customer chooses payment method:
   - PromptPay QR: Scan & Pay
   - Upload Slip: Transfer & Upload
   ↓
6. Payment status updates:
   - PromptPay: Manual verification by admin
   - Upload Slip: Auto-set to "pending_verification"
   ↓
7. Admin verifies and marks as paid
   ↓
8. Customer receives confirmation
```

---

## 💰 Payment Methods

### **1. PromptPay QR Code**

**Pros:**
- ✅ Instant transfer
- ✅ No fees
- ✅ Most popular in Thailand

**How it works:**
1. Customer scans QR code
2. Confirms payment in mobile banking app
3. Admin manually marks as paid

**Configuration:**
- Update `promptPayId` in `PromptPayQR.tsx`

### **2. Bank Transfer with Slip Upload**

**Pros:**
- ✅ Proof of payment
- ✅ Auto-stored in Supabase Storage
- ✅ Easy verification

**How it works:**
1. Customer transfers money
2. Uploads slip image
3. Status → `pending_verification`
4. Admin reviews and marks as paid

**Configuration:**
- Update bank details in `SlipUpload.tsx` (line 156-162)

---

## 🛠️ Advanced Configuration

### **Update Bank Details**

Edit `src/components/payment/SlipUpload.tsx`:

```typescript
<div className="space-y-1 text-sm">
  <p><strong>Bank:</strong> ธนาคารกสิกรไทย (KBANK)</p>
  <p><strong>Account Name:</strong> Your Company Name</p>
  <p><strong>Account Number:</strong> 123-4-56789-0</p>
  <p><strong>Amount:</strong> {formatCurrency(amount)}</p>
</div>
```

### **Add Payment Status to Database**

Add `pending_verification` enum value:

1. Go to Supabase Dashboard
2. **Table Editor** → `bookings`
3. Find `payment_status` column
4. **Edit Column**
5. Add enum value: `pending_verification`

---

## 📱 How to Share Payment Link

### **Method 1: Copy & Paste**

In Booking Detail Modal, click **Copy** button and paste to:
- LINE
- WhatsApp
- Facebook Messenger
- SMS

### **Method 2: Quick Share Buttons**

Click the quick share buttons:
- **LINE** button → Opens LINE with pre-filled message
- **WhatsApp** button → Opens WhatsApp with message
- **SMS** button → Opens SMS app with customer's number

---

## 🔐 Security Best Practices

### **Storage Security:**

✅ **Already configured:**
- Public upload allowed (anyone with link can upload)
- Public read allowed (for viewing slips)
- Only authenticated users can delete

### **Payment Verification:**

⚠️ **Important:**
- Always verify payment amount matches booking
- Check slip date is recent
- Verify reference number if available

---

## 🧪 Testing

### **Test PromptPay QR:**

1. Create a test booking
2. Copy payment link
3. Open in browser
4. Select "PromptPay QR"
5. QR code should generate
6. (Don't scan with real bank account during testing!)

### **Test Slip Upload:**

1. Create a test booking
2. Copy payment link
3. Select "Upload Slip"
4. Upload a test image
5. Verify:
   - Upload completes
   - Status changes to `pending_verification`
   - Image appears in Supabase Storage

---

## 🆘 Troubleshooting

### **QR Code not generating:**

**Error:** "Failed to generate QR code"

**Solution:**
1. Check `promptPayId` is valid (10 or 13 digits)
2. Verify packages are installed:
   ```bash
   npm list promptpay-qr qrcode
   ```

### **Slip upload fails:**

**Error:** "Storage bucket not configured"

**Solution:**
1. Run `supabase-setup-payment-storage.sql` in SQL Editor
2. Verify bucket exists in Storage tab
3. Check policies are set

### **Payment link doesn't work:**

**Error:** 404 Page Not Found

**Solution:**
- Verify routes are configured in `App.tsx`
- Check booking ID is valid
- Clear browser cache

---

## 📊 Payment Status Reference

| Status | Meaning | Action Required |
|--------|---------|----------------|
| `unpaid` | Booking created, no payment | Send payment link |
| `pending_verification` | Slip uploaded | Admin verify & mark as paid |
| `paid` | Payment confirmed | No action needed |
| `partial` | Partial payment received | Request remaining amount |
| `refunded` | Payment returned | Issue refund |

---

## 🔄 Future Enhancements

Want to add more features? Consider:

### **1. Automatic Payment Verification** (Advanced)

Use Slip Verification API:
- [SlipOK](https://slipok.com/) - Free 100 verifications/month
- Auto-verify bank transfer slips
- Update status automatically

### **2. Email Notifications**

Use [Resend](https://resend.com):
- Free 3,000 emails/month
- Send payment confirmation
- Send payment reminders

### **3. Payment Gateway Integration**

Integrate with:
- **Omise** - Credit cards, PromptPay (recommended)
- **2C2P** - Enterprise solution
- **Stripe** - International payments

---

## 📞 Support

Need help? Contact:
- Email: support@tinedy.com
- Documentation: [Payment System Docs]

---

## ✅ Checklist

Before going live, make sure:

- [ ] PromptPay ID updated
- [ ] Bank details updated
- [ ] Supabase Storage configured
- [ ] Payment statuses working
- [ ] Tested with real payment link
- [ ] Admin knows how to verify payments
- [ ] Customer support ready

---

**🎉 Ready to accept payments!**

The payment system is now ready to use. Share payment links with customers and start accepting payments!
