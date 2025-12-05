import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  // Define the style object for the translucent blur effect
  const navbarStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    padding: "1rem", // p-4 equivalent
    zIndex: 50,
    
    // Use a gradient for the fading effect with dark background
    background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(4, 0, 11, 0) 100%)",
    
    // The key to the blur effect (applied to content *behind* the navbar):
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)", // Safari support
  };

  return (
    <nav style={navbarStyle}>
      <div className="container mx-auto flex justify-between items-center max-w-7xl">
        {/* Logo/Title */}
        <Link to="/" className="text-white text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-400">
          GrantTech AI
        </Link>
        
        {/* Links and Admin Button */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-neutral-300 hover:text-cyan-400 transition-colors duration-200 text-sm md:text-base">
            Home
          </Link>
          {/* <Link to="/chatbot" className="text-neutral-300 hover:text-cyan-400 transition-colors duration-200 text-sm md:text-base">
            Chatbot
          </Link> */}

          {/* 🔑 NEW: Admin Login Button in NavBar */}
          <Link 
            to="/login" 
            className="
              px-4 py-2 
              rounded-full 
              text-xs md:text-sm 
              font-bold 
              bg-gradient-to-r 
              from-orange-500 
              to-red-500 
              text-white 
              hover:opacity-90 
              transition 
              shadow-lg 
              whitespace-nowrap
            "
          >
            Admin Login 🔑
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;