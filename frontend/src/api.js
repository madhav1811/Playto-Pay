import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const getDashboard = (merchantId) => axios.get(`${API_BASE_URL}/dashboard`, { params: { merchant_id: merchantId } });

export const createPayout = (merchantId, amountPaise, idempotencyKey, bankAccountId) => 
  axios.post(`${API_BASE_URL}/payouts`, 
    { 
      merchant_id: merchantId, 
      amount_paise: amountPaise, 
      bank_account_id: bankAccountId 
    }, 
    { headers: { 'X-Idempotency-Key': idempotencyKey } }
  );

export const addCredit = (merchantId, amountPaise) => 
  axios.post(`${API_BASE_URL}/credits`, { merchant_id: merchantId, amount: amountPaise });
