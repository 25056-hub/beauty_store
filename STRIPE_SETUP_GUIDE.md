# دليل إعداد Stripe الآمن

## 🔐 المشاكل التي تم إصلاحها:

### 1️⃣ **المشكلة الأولى - URL مصنوع يدويًا (سطر 57)**
**قبل:**
```python
checkout_url = f"https://checkout.stripe.com/pay/cs_live_{payment_data.order_id}"
```
**بعد:**
```python
checkout_session = stripe.checkout.Session.create(
    # استخدام Stripe API الحقيقي
    line_items=[...],
    mode="payment",
    success_url="...",
    cancel_url="..."
)
```
✅ **الفائدة:** جلسة checkout حقيقية من Stripe مع ضمانات أمان

---

### 2️⃣ **المشكلة الثانية - Webhook غير محمي (سطر 62)**
**قبل:**
```python
@router.post("/webhook")
def stripe_webhook(event: StripeWebhookEvent, db: Session = Depends(get_db)):
    # لا يوجد تحقق من التوقيع!
    payment.status = event.status  # ❌ يمكن لأي شخص تغيير الحالة
```

**بعد:**
```python
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # ✅ التحقق من توقيع Stripe
    event = stripe.Webhook.construct_event(
        payload,
        sig_header,
        settings.STRIPE_WEBHOOK_SECRET  # المفتاح السري فقط
    )
```
✅ **الفائدة:** فقط Stripe يمكنه إرسال طلب صحيح

---

## 📋 خطوات الإعداد:

### الخطوة 1: الحصول على مفاتيح Stripe
1. انتقل إلى [dashboard.stripe.com](https://dashboard.stripe.com)
2. سجل الدخول أو أنشئ حسابًا
3. في القائمة الجانبية، انقر على **Developers** ثم **API keys**
4. سيظهر لك:
   - **Publishable Key** (يمكن نشره)
   - **Secret Key** (احفظه سرًا جداً!)

### الخطوة 2: الحصول على Webhook Secret
1. انتقل إلى **Owners** > **Webhooks**
2. انقر على **Add an endpoint**
3. استخدم الرابط: `https://yourdomain.com/api/payments/webhook`
4. اختر الأحداث:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. انسخ **Signing secret** (يبدأ بـ `whsec_`)

### الخطوة 3: إضافة متغيرات البيئة
أضف إلى ملف `.env`:
```env
# Stripe Configuration
STRIPE_API_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

⚠️ **تحذير:** لا تضع المفاتيح مباشرة في الكود!

---

## 🔒 الاختبار الآمن

### اختبر Webhook محليًا باستخدام Stripe CLI:
```bash
# 1. ثبت Stripe CLI من: https://stripe.com/docs/stripe-cli

# 2. قم بـ Login
stripe login

# 3. ابدأ التقديم المباشر (forwarding)
stripe listen --forward-to localhost:8000/api/payments/webhook

# 4. سيظهر signing secret - أضفه إلى .env

# 5. في ترمينال آخر، شغل التطبيق
uvicorn main:app --reload
```

---

## ✅ التغييرات الرئيسية:

| المجال | القديم | الجديد |
|--------|--------|--------|
| **إنشاء جلسة** | URL مصنوع يدويًا | `stripe.checkout.Session.create()` |
| **Webhook** | بدون حماية | التحقق من `stripe.Webhook.construct_event()` |
| **الأمان** | ❌ أي شخص | ✅ فقط Stripe |
| **السندات** | لا توجد | `metadata` مع `order_id` و `user_id` |

---

## 🚀 متغيرات البيئة المطلوبة:

```env
# Database
DATABASE_URL=mysql+pymysql://user:password@localhost/beauty_store

# Auth
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe (جديد)
STRIPE_API_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

---

## 📚 مراجع مفيدة:
- [Stripe Python SDK](https://stripe.com/docs/stripe-js)
- [Webhook Signatures](https://stripe.com/docs/webhooks/signatures)
- [Checkout Sessions](https://stripe.com/docs/payments/checkout)
