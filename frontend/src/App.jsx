import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ChatbotPage from "./pages/ChatbotPage";
import Navbar from "./components/common/Navbar";
import GrantListPage from "./pages/GrantListPage";
import DashboardPage from "./pages/Dashboard"; // Assuming the file name is DashboardPage
import LoginPage from "./pages/LoginPage"; // New import

// --- Protected Route Component ---
// This component checks if the user is authenticated (simulated via localStorage)
const ProtectedRoute = ({ children }) => {
  // In a real app, this would check a token, Firebase status, or context state.
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'; 

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/grants/results" element={<GrantListPage />} />
        <Route path="/login" element={<LoginPage />} /> {/* NEW LOGIN ROUTE */}

        {/* Protected Route */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;