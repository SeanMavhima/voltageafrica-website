"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { Media } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

/**
 * A photograph that wipes open as it enters the viewport and drifts gently
 * against the scroll. The frame keeps its size; only the image inside moves.
 */
export function ParallaxImage({ media, className, position, sizes = "100vw", strength = 8, priority = false, grade = true }: { media: Media; className?: string; position?: string | null; sizes?: string; strength?: number; priority?: boolean; grade?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${reduce ? 0 : strength}%`, `${reduce ? 0 : strength}%`]);
  return (
    <motion.div
      ref={ref}
      className={cn(/\babsolute\b/.test(className ?? "") ? "" : "relative", "overflow-hidden bg-parchment-3", className)}
      initial={reduce ? false : { clipPath: "inset(8% 6% 8% 6%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="absolute -inset-y-[10%] inset-x-0" style={{ y }}>
        <Image src={media.src} alt={media.alt} fill sizes={sizes} priority={priority} className={cn("object-cover", grade && "[filter:saturate(0.92)_contrast(1.04)]")} style={position ? { objectPosition: position } : undefined} />
      </motion.div>
    </motion.div>
  );
}
