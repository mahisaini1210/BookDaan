import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

const actionCodeSettings = {
  url: window.location.origin, // Make sure to configure this correctly in Firebase Console
  handleCodeInApp: true,
};

const AuthForm = ({ mode }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendLink = async () => {
    if (!email || !validateEmail(email)) {
      setMessage("❗ Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setEmailSent(true);
      setMessage("✅ A sign-in link has been sent to your email.");
    } catch (error) {
      console.error("Error sending link:", error);
      setMessage("❌ Failed to send sign-in link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignIn = async () => {
    const storedEmail = window.localStorage.getItem("emailForSignIn");
    if (!storedEmail) {
      setMessage("❌ No stored email found. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailLink(auth, storedEmail, window.location.href);
      window.localStorage.removeItem("emailForSignIn");

      const token = await result.user.getIdToken();
      localStorage.setItem("token", token);
      setSignedIn(true);
      setMessage("✅ Signed in successfully!");
      setTimeout(() => navigate("/"), 1500); // ⏳ optional redirect
    } catch (error) {
      console.error("Error verifying sign-in:", error);
      setMessage("❌ Link verification failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      handleCompleteSignIn();
    }
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-center bg-[#d1d9e6] px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-[#334e68]">
          {mode === "signup" ? "📨 Sign Up" : "🔐 Login"} with Email
        </h2>

        {!emailSent && !signedIn && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              autoComplete="email"
            />
            <button
              onClick={handleSendLink}
              disabled={loading}
              className="w-full bg-[#334e68] text-white py-2 rounded-lg hover:bg-[#2b3e56] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Sign-In Link"}
            </button>
          </>
        )}

        {message && (
          <p
            className={`text-center mt-4 font-medium ${
              message.startsWith("✅") ? "text-green-700" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        {emailSent && !signedIn && (
          <p className="text-sm mt-4 text-center text-gray-600">
            🔒 Check your email for the secure login link.
          </p>
        )}

        {signedIn && (
          <div className="text-center mt-6">
            <Link
              to="/"
              className="text-indigo-600 hover:underline font-semibold"
            >
              ⬅️ Go to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
