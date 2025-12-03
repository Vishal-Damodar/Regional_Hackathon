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
    
    // 💡 Key Change: Use a linear gradient for the fading effect.
    // It transitions from a purple with 60% opacity at the top (0%)
    // to a purple with 0% opacity near the bottom (at 100%).
    background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(49, 0, 98, 0) 100%)",
    
    // The previous 'backgroundColor' line is replaced by 'background' with the gradient.
    
    // Keeps the smooth transition for other potential changes
    transition: "all 0.5s ease-in-out",

    // The key to the blur effect (applied to content *behind* the navbar):
    backdropFilter: "blur(2px)",
    WebkitBackdropFilter: "blur(2px)", // Safari support
  };

  return (
    <nav style={navbarStyle}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">
          MySite
        </Link>
        <div className="flex gap-4">
          <Link to="/" className="text-white hover:text-gray-300">
            Home
          </Link>
          <Link to="/chatbot" className="text-white hover:text-gray-300">
            Chatbot
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;