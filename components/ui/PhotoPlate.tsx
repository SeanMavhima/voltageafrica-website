"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { Media } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

const ASPECT = {
  /** Page openings: wide and cinematic. */
  cinema: "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]",
  /** Inside a section: a little calmer. */
  wide: "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.4/1]",
  /** Above a form: present, but short so the form stays close. */
  banner: "aspect-[16/10] sm:aspect-[2.4/1] lg:aspect-[3.2/1]",
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * An editorial photo plate: the photograph wipes open and settles as it
 * enters the viewport, with a figure number, caption and the media-library
 * credit underneath. Reduced-motion visitors get the still image.
 */
export function PhotoPlate({
  media,
  caption,
  figure,
  aspect = "cinema",
  priority = false,
  position,
  className,
}: {
  media: Media;
  caption?: string | null;
  figure?: string;
  aspect?: keyof typeof ASPECT;
  priority?: boolean;
  position?: string | null;
  className?: string;
}) {
  const still = useReducedMotion();
  const text = caption || media.caption || "";
  const credit = media.credit;
  return (
    <figure className={cn("relative", className)}>
      <motion.div
        className={cn("relative overflow-hidden bg-parchment-3", ASPECT[aspect])}
        initial={still ? false : { clipPath: "inset(10% 8% 10% 8%)" }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        transition={{ duration: 1.5, ease: EASE }}
      >
        <motion.div className="absolute inset-0" initial={still ? false : { scale: 1.14 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: EASE }}>
          <Image
            src={media.src}
            alt={media.alt}
            fill
            priority={priority}
            quality={priority ? 90 : 75}
            sizes="(min-width: 1520px) 1440px, 100vw"
            className="object-cover"
            style={position ? { objectPosition: position } : undefined}
          />
        </motion.div>
        {/* Soft ground shadow so the plate sits on the page */}
        <div aria-hidden className="on-dark pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/35 to-transparent" />
        {figure && (
          <span aria-hidden className="mono absolute left-4 top-4 bg-parchment/90 px-2 py-1 uppercase text-charcoal backdrop-blur-sm sm:left-6 sm:top-6">
            {figure}
          </span>
        )}
      </motion.div>
      {(text || credit) && (
        <figcaption className="mt-3 flex flex-col gap-1 text-[13px] leading-snug text-stone sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          {text && <span className="max-w-[72ch]">{text}</span>}
          {credit && (
            <span className="shrink-0 text-[12px]">
              Photo:{" "}
              <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-charcoal">
                {credit.author}
              </a>
              {credit.license && (
                <>
                  ,{" "}
                  <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-charcoal">
                    {credit.license}
                  </a>
                </>
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
