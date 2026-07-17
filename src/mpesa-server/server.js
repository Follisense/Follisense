const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

async function getMpesaToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return response.data.access_token;
}

function buildPassword() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey   = process.env.MPESA_PASSKEY;
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
}

function fixPhone(phone) {
  let cleaned = phone.replace(/\s/g, '').replace('+', '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  return cleaned;
}

app.post('/api/mpesa/stk-push', async (req, res) => {
  const { phone, amount, user_id, plan } = req.body;
  if (!phone || !amount || !user_id || !plan) {
    return res.status(400).json({ error: 'phone, amount, user_id and plan are required' });
  }
  try {
    const token = await getMpesaToken();
    const { password, timestamp } = buildPassword();
    const formattedPhone = fixPhone(phone);

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.round(amount),
        PartyA:            formattedPhone,
        PartyB:            process.env.MPESA_SHORTCODE,
        PhoneNumber:       formattedPhone,
        CallBackURL:       'https://follisense-mpesa-server-production.up.railway.app/api/mpesa/callback', // ← fixed: added https://
        AccountReference:  'FolliSense',
        TransactionDesc:   `FolliSense ${plan} plan`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const result = response.data;
    if (result.ResponseCode !== '0') {
      return res.status(400).json({ error: result.ResponseDescription });
    }

    await supabase.from('mpesa_transactions').insert({
      user_id,
      checkout_request_id: result.CheckoutRequestID,
      phone_number:        formattedPhone,
      amount:              Math.round(amount),
      plan,
      status:              'pending',
    });

    return res.json({
      success:             true,
      checkout_request_id: result.CheckoutRequestID,
      message:             result.CustomerMessage,
    });

  } catch (error) {
    console.error('STK Push failed:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to send M-Pesa prompt. Please try again.' });
  }
});

app.post('/api/mpesa/callback', async (req, res) => {
  console.log('M-Pesa callback received:', JSON.stringify(req.body, null, 2));
  const callback = req.body?.Body?.stkCallback;
  if (!callback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode        = callback.ResultCode;
  const resultDesc        = callback.ResultDesc;
  const isPaid            = resultCode === 0;

  let receiptNumber = null;
  if (isPaid && callback.CallbackMetadata?.Item) {
    const receiptItem = callback.CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber');
    receiptNumber = receiptItem?.Value || null;
  }

  const { data: transaction } = await supabase
    .from('mpesa_transactions')
    .update({
      status:               isPaid ? 'paid' : 'failed',
      result_code:          resultCode,
      result_desc:          resultDesc,
      mpesa_receipt_number: receiptNumber,
    })
    .eq('checkout_request_id', checkoutRequestId)
    .select('user_id, plan')
    .single();

  if (isPaid && transaction?.user_id) {
    const expiresAt = transaction.plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000);

    await supabase.from('subscriptions').upsert(
      {
        user_id:        transaction.user_id,
        plan:           transaction.plan,
        status:         'active',
        payment_method: 'mpesa',
        transaction_id: checkoutRequestId,
        started_at:     new Date().toISOString(),
        expires_at:     expiresAt.toISOString(),
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    console.log(`Subscription activated for user: ${transaction.user_id}`);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.get('/api/mpesa/status', async (req, res) => {
  const { checkout_request_id, user_id } = req.query;
  if (!checkout_request_id || !user_id) return res.json({ status: 'pending' });

  const { data } = await supabase
    .from('mpesa_transactions')
    .select('status, mpesa_receipt_number')
    .eq('checkout_request_id', checkout_request_id)
    .eq('user_id', user_id)
    .single();

  return res.json({
    status:  data?.status || 'pending',
    receipt: data?.mpesa_receipt_number || null,
  });
});

// ─────────────────────────────────────────────────────────────
// FLUTTERWAVE CARD PAYMENT
// ─────────────────────────────────────────────────────────────
app.post('/api/payment/flutterwave-charge', async (req, res) => {
  const { amount, user_id, plan, cardNumber, expiryDate, cvv, cardName } = req.body;

  if (!amount || !user_id || !plan || !cardNumber || !expiryDate || !cvv || !cardName) {
    return res.status(400).json({ error: 'All card fields required' });
  }

  try {
    const [month, year] = expiryDate.split('/');
    
    const response = await axios.post(
      'https://api.flutterwave.com/v3/charges?type=card',
      {
        amount,
        currency: 'KES',
        email: user_id, // Use user_id as identifier
        fullname: cardName,
        tx_ref: `CARD-${user_id}-${Date.now()}`,
        card_number: cardNumber.replace(/\s/g, ''),
        cvv,
        expiry_month: month,
        expiry_year: year,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;

    // If charge failed
    if (result.status !== 'success') {
      return res.status(400).json({ error: result.message || 'Card charge failed' });
    }

    // Save transaction and activate subscription
    const expiresAt = plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000);

    await supabase.from('subscriptions').upsert(
      {
        user_id,
        plan,
        status: 'active',
        payment_method: 'card',
        transaction_id: result.data.id,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return res.json({
      success: true,
      message: 'Payment successful',
      transactionId: result.data.id,
    });

  } catch (error) {
    console.error('Flutterwave charge failed:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Payment processing failed. Please try again.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});