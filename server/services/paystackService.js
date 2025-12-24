import axios from 'axios';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'test-key';
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY || 'test-public';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

console.log('[PAYSTACK] Loaded Keys:', {
  secretKey: PAYSTACK_SECRET?.substring(0, 10) + '...',
  publicKey: PAYSTACK_PUBLIC?.substring(0, 10) + '...',
  isTestMode: PAYSTACK_SECRET?.includes('test') ? 'YES ✅' : 'NO ❌',
});

export const initializePayment = async (amount, email, reference, metadata = {}, redirectUrl = null) => {
  try {
    const payloadData = {
      amount: Math.round(amount * 100), // Amount in kobo
      email,
      reference,
      metadata,
    };

    // Add callback URL if provided (this is what Paystack uses for redirect)
    if (redirectUrl) {
      payloadData.callback_url = redirectUrl;
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payloadData,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: response.data.status,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Paystack initialization error:', error.message);
    if (error.response) {
      console.error('Paystack error response:', JSON.stringify(error.response.data, null, 2));
    }
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    return {
      success: response.data.status,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Paystack verification error:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const getPaymentStatus = async (reference) => {
  const result = await verifyPayment(reference);
  if (result.success && result.data) {
    return {
      isPaid: result.data.status === 'success',
      amount: result.data.amount / 100, // Convert from kobo
      customer: result.data.customer,
      metadata: result.data.metadata,
    };
  }
  return { isPaid: false, error: result.error };
};

export default {
  initializePayment,
  verifyPayment,
  getPaymentStatus,
};
