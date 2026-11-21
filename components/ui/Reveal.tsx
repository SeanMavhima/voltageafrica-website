"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "section" | "span" | "p" | "h2" | "h3" | "figure";
};

/**
 * Fade-and-rise once on entering the viewport.
 * Reduced-motion users get a plain fade: <MotionConfig reducedMotion="user"> in
 * the root layout disables the transform while keeping server and client markup identical.
 */
export function Reveal({ children, className, delay = 0, y = 28, as = "div" }: Props) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </M>
  );
}
