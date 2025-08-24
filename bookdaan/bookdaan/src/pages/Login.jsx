import React, { useState, useContext } from "react";
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "../firebase";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => console.log("reCAPTCHA verified"),
        "expired-callback": () => console.warn("reCAPTCHA expired"),
      });
    }
  };

  const sendOTP = async () => {
    if (!phone.startsWith("+") || phone.length < 10) {
      return setMessage("❗ Include valid country code in phone number.");
    }

    setLoading(true);
    setMessage("");
    setupRecaptcha();

    try {
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setOtp("");
      setMessage("✅ OTP sent to your phone.");
    } catch (err) {
      console.error("Failed to send OTP", err);
      setMessage("❌ Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!confirmationResult || otp.length !== 6) {
      return setMessage("❗ Enter a valid 6-digit OTP.");
    }

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      // 🔐 Send token to backend for auth/registration
      const res = await axios.post(`${API_BASE}/api/auth/verify`, {
        firebaseUid: firebaseUser.uid,
        phone: firebaseUser.phoneNumber,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        mode: "register", // ✅ ensure user is created if not already
      });

      login(res.data.token);
      setMessage("✅ Logged in successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error("OTP verification failed", err?.response?.data || err);
      setMessage("❌ Invalid OTP or login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-200 px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-indigo-700 mb-6">
          🔐 OTP Login
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91XXXXXXXXXX"
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          onClick={sendOTP}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold mb-6 disabled:opacity-50"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>

        {confirmationResult && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </>
        )}

        {message && (
          <p
            className={`text-center mt-4 font-medium ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Login;
