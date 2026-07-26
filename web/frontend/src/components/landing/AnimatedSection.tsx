"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function AnimatedSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // wrapper component to create scroll-triggered animation (fade in and slide up)
  // uses framer-motion to detect when the element enters the viewport
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, amount: 0.25 }}
      className={`w-full max-md:!translate-y-0 max-md:!scale-100 max-md:!opacity-100 ${className}`}
    >
      {children}
    </motion.div>
  );
}
