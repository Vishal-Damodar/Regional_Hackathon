import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ChatbotPage from "./pages/ChatbotPage";
import Navbar from "./components/common/Navbar";
import GrantListPage from "./pages/GrantListPage";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/grants/results" element={<GrantListPage />} />
      </Routes>
    </Router>
  );
}

export default App;