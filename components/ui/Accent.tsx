import { Fragment } from "react";

/** Renders copy where `*phrase*` marks the italic accent, e.g. "Energy that *earns its keep.*" */
export function Accent({ text, className }: { text: string; className?: string }) {
  const parts = text.split("*");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <em key={i} className={className}>
            {p}
          </em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** Plain-text version for metadata and aria labels. */
export const plain = (text: string) => text.replace(/\*/g, "");
