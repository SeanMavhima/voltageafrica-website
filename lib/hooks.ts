"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** True when the element is within `rootMargin` of the viewport. */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px", once = false): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export type GpuTier = "none" | "low" | "high";

/**
 * Coarse capability check for 3D: WebGL2 availability, data-saver, device memory/cores.
 * Returns null until measured on the client.
 */
export function useGpuTier(): GpuTier | null {
  const [tier, setTier] = useState<GpuTier | null>(null);
  useEffect(() => {
    let t: GpuTier = "high";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) t = "none";
      else {
        const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
        const cores = nav.hardwareConcurrency || 4;
        const mem = nav.deviceMemory ?? 4;
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        if (nav.connection?.saveData) t = "none";
        else if (cores <= 2 || mem <= 2) t = "none";
        else if (coarse || cores <= 4 || mem <= 4) t = "low";
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch {
      t = "none";
    }
    setTier(t);
  }, []);
  return tier;
}
