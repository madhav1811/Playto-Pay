import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const getDashboard = (merchantId) => axios.get(`${API_BASE_URL}/dashboard`, { params: { merchant_id: merchantId } });

export const createPayout = (merchantId, amount, idempotencyKey) => 
  axios.post(`${API_BASE_URL}/payouts`, 
    { merchant_id: merchantId, amount }, 
    { headers: { 'X-Idempotency-Key': idempotencyKey } }
  );

export const addCredit = (merchantId, amount) => 
  axios.post(`${API_BASE_URL}/credits`, { merchant_id: merchantId, amount });
