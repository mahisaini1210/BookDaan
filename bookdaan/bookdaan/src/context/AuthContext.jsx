import { createContext, useEffect, useState } from "react";
import { jwtDecode } from 'jwt-decode'; // ✅ Correct named import


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token); // ✅
        if (decoded?.id) {
          setUserToken(token);
          setUserId(decoded.id);
        }
      } catch (err) {
        console.error("❌ Invalid token:", err);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    try {
      const decoded = jwtDecode(token); // ✅
      if (decoded?.id) {
        localStorage.setItem("token", token);
        setUserToken(token);
        setUserId(decoded.id);
      }
    } catch (err) {
      console.error("Login failed: Invalid token");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUserToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, userId, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
