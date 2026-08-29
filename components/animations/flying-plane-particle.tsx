"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface FlyingPlaneParticleProps {
  isFlying: boolean;
  color?: string;
  glowColor?: string;
}

/**
 * ✈️ IconScout Lottie-Style Origami Paper Plane Loop-de-Loop Flight Particle
 * Features:
 * - Anticipation recoil & dip
 * - Parabolic swirling loop-de-loop with dynamic orientation angles
 * - Speed lines & aerodynamic wind puffs behind the tail
 * - Radiant ambient glow trail
 */
export function FlyingPlaneParticle({
  isFlying,
  color = "#2dd4bf",
  glowColor = "rgba(45, 212, 191, 0.8)",
}: FlyingPlaneParticleProps) {
  return (
    <AnimatePresence>
      {isFlying && (
        <div className="absolute right-3 bottom-2.5 pointer-events-none z-30 select-none">
          {/* Main Origami Paper Plane with Loop-de-loop flight path */}
          <motion.div
            initial={{
              opacity: 0,
              x: 0,
              y: 0,
              scale: 0.8,
              rotate: 35,
            }}
            animate={{
              opacity: [0, 1, 1, 1, 0.9, 0],
              x: [0, -10, -2, 28, 68, 120],
              y: [0, 6, -16, -32, -58, -95],
              scale: [0.8, 0.95, 1.2, 1.1, 0.85, 0.35],
              rotate: [35, 15, 65, 45, 58, 75],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.72,
              times: [0, 0.15, 0.35, 0.58, 0.82, 1],
              ease: "easeInOut",
            }}
            style={{
              filter: `drop-shadow(0 0 14px ${glowColor})`,
              color: color,
            }}
            className="relative"
          >
            <Send className="w-5 h-5 fill-current" />

            {/* Aerodynamic Wind Puffs (Fading dashed speed trails) */}
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0.4, 1.2, 1.8],
                x: [-12, -24, -36],
                y: [8, 16, 24],
              }}
              transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
              className="absolute -left-2 top-2 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]"
            />
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 0.7, 0],
                scale: [0.3, 1, 1.5],
                x: [-8, -18, -28],
                y: [4, 10, 16],
              }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              className="absolute -left-3 top-3 w-1 h-1 rounded-full bg-emerald-200/90 blur-[0.5px]"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
