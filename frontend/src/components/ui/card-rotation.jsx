"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring } from "framer-motion";
import React, { useState } from "react";

export const CardRotation = ({
  children,
  className,
  perspective = 1000, // Adjust as needed
  rotateXRange = [-10, 10], // Adjust as needed
  rotateYRange = [-10, 10], // Adjust as needed
}) => {
  const [rotated, setRotated] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springConfig = { damping: 10, stiffness: 100 };

  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;

    const centerX = width / 2;
    const centerY = height / 2;

    const rotateXValue = ((y - centerY) / height) * (rotateXRange[1] - rotateXRange[0]) - (rotateXRange[1] + rotateXRange[0]) / 2;
    const rotateYValue = ((x - centerX) / width) * (rotateYRange[1] - rotateYRange[0]) - (rotateYRange[1] + rotateYRange[0]) / 2;

    rotateX.set(rotateXValue);
    rotateY.set(rotateYValue);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const handleClick = () => {
    setRotated(!rotated);
  };

  return (
    <motion.div
      className={cn(
        "relative transform-style-3d cursor-pointer transition-all duration-300 ease-out",
        className
      )}
      style={{
        perspective,
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-full h-full backface-hidden"
        style={{
          rotateY: rotated ? 180 : 0,
        }}
        transition={{ duration: 0.6 }}
      >
        {children[0]} {/* Front of the card */}
      </motion.div>
      <motion.div
        className="absolute top-0 left-0 w-full h-full backface-hidden"
        style={{
          rotateY: rotated ? 0 : -180,
        }}
        transition={{ duration: 0.6 }}
      >
        {children[1]} {/* Back of the card */}
      </motion.div>
    </motion.div>
  );
};