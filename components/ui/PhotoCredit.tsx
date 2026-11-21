type Credited = { caption?: string | null; credit?: { author: string; license: string; licenseUrl: string; source: string } | null };
import { cn } from "@/lib/utils";

/** Caption + licence credit, as required for Creative Commons photography. */
export function PhotoCredit({ photo, tone = "dark", className }: { photo: Credited | null | undefined; tone?: "dark" | "light"; className?: string }) {
  if (!photo || (!photo.caption && !photo.credit)) return null;
  return (
    <p className={cn("max-w-[42ch] text-[13px] leading-snug", tone === "light" ? "text-parchment/80" : "text-stone", className)}>
      {photo.caption && <>{photo.caption}.</>}
      {photo.credit && (
        <>
          {" "}
          Photo:{" "}
          <a href={photo.credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-current/40 underline-offset-2 hover:decoration-current">
            {photo.credit.author}
          </a>
          ,{" "}
          <a href={photo.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-current/40 underline-offset-2 hover:decoration-current">
            {photo.credit.license}
          </a>
          .
        </>
      )}
    </p>
  );
}
