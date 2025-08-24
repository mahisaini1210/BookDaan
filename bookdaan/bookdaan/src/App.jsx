import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddBook from './pages/AddBook';
import BookDetail from './pages/BookDetail';
import EditBook from './pages/EditBook';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import CornerAnimation from './components/CornerAnimation';
import { AuthContext } from './context/AuthContext';
import EditProfile from './pages/EditProfile';
import Notifications from './pages/Notifications';
import ChatWindow from './components/ChatWindow'; // ✅ NEW IMPORT

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { userToken, loading } = useContext(AuthContext);
  if (loading) return null; // or a loader
  return userToken ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="min-h-screen bg-[#d1d9e6] relative overflow-hidden">
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddBook />
              </ProtectedRoute>
            }
          />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute>
                <EditBook />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id/edit"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          {/* ✅ NEW CHAT ROUTE */}
          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <ChatWindow />
              </ProtectedRoute>
            }
          />
        </Routes>
        <CornerAnimation />
      </Router>
    </div>
  );
}

export default App;
