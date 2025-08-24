// services/otpService.js
const otpStore = new Map(); // Replace with Redis or DB in production

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (phone, purpose = 'generic') => {
  const otp = generateOtp();

  otpStore.set(`${phone}:${purpose}`, {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 min expiry
  });

  console.log(`📨 Sent OTP ${otp} to ${phone} for ${purpose}`);
  return otp;
};

export const verifyOtp = async (phone, otp, purpose = 'generic') => {
  const key = `${phone}:${purpose}`;
  const record = otpStore.get(key);

  if (!record || record.otp !== otp) return false;
  if (Date.now() > record.expires) {
    otpStore.delete(key);
    return false;
  }

  otpStore.delete(key); // remove after success
  return true;
};
