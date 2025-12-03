"use client";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

export const Meteors = ({
  number,
  className,
}) => {
  const [meteorStyles, setMeteorStyles] = useState([]);

  useEffect(() => {
    const styles = [...new Array(number || 20)].map(() => ({
      top: -5,
      left: Math.floor(Math.random() * (400 - -400) + -400) + "px", 
      animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
      animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    // FIX: Set a minimum height (min-h-[400px]) so the platform has space to show at the bottom.
    // Replace min-h-[400px] with h-full if the PARENT element defines the height.
    <div className="relative w-full min-h-[400px] overflow-hidden"> 
      {[...meteorStyles].map((style, idx) => (
        // Meteor flight path
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent",
            className
          )}
          style={style}
        >
          {/* Meteor tail */}
        </span>
      ))}
      
      {/* PURPLE PLATFORM ADDITION (z-index is key to ensure visibility) */}
      <div className="absolute bottom-0 left-0 w-full h-10 bg-purple-700/80 backdrop-blur-sm shadow-inner shadow-purple-900/50 z-10" />
      <div className="absolute bottom-10 left-0 w-full h-0.5 bg-gradient-to-t from-purple-700/50 to-transparent z-10" />
    </div>
  );
};