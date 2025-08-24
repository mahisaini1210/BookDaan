import axios from 'axios';

export const sendOtp = async (phone, purpose = 'login') => {
  return axios.post('/api/auth/send-otp', { phone, purpose });
};

export const verifyOtp = async (phone, otp, purpose = 'login', token = null) => {
  return axios.post('/api/auth/verify-otp', { phone, otp, purpose }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};
