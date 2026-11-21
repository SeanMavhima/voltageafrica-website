"use client";

import { type ComponentId, type GridComponent } from "@/lib/data/microgrid";
import { daylight } from "@/lib/sim/energy";
import { cn } from "@/lib/utils";

/**
 * 2D plan-view fallback for devices without WebGL.
 * Same components, same selection and information. Not a background image.
 */
const NODES: Record<ComponentId, { x: number; y: number; w: number; h: number }> = {
  solar: { x: 40, y: 120, w: 220, h: 230 },
  inverter: { x: 300, y: 70, w: 90, h: 64 },
  battery: { x: 300, y: 190, w: 110, h: 54 },
  meters: { x: 250, y: 40, w: 30, h: 30 },
  distribution: { x: 430, y: 214, w: 340, h: 10 },
  household: { x: 470, y: 262, w: 60, h: 48 },
  school: { x: 560, y: 40, w: 220, h: 70 },
  productive: { x: 640, y: 380, w: 130, h: 80 },
  water: { x: 300, y: 390, w: 70, h: 70 },
  business: { x: 820, y: 240, w: 60, h: 120 },
};

export function MicrogridSchematic({
  selected,
  onSelect,
  hour,
  flowOn,
  components: gridComponents,
}: {
  selected: ComponentId | null;
  onSelect: (id: ComponentId | null) => void;
  hour: number;
  flowOn: boolean;
  components: GridComponent[];
}) {
  const d = daylight(hour);
  const flowCls = flowOn ? "flow-dash" : "";
  return (
    <svg viewBox="0 0 920 520" className="h-full w-full" role="group" aria-label="Plan view of the conceptual microgrid">
      <defs>
        <pattern id="ms-panel" width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" fill="#22324d" stroke="#5a6e90" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect x="10" y="10" width="900" height="500" fill={d > 0.5 ? "#ffffff" : "#1c2230"} stroke="rgb(36 36 31 / 0.18)" rx="18" />
      {/* flows */}
      <g fill="none" strokeLinecap="round">
        <path d="M260 235 C 280 150, 290 110, 300 102" stroke="#e8902a" strokeWidth="2" className={d > 0.1 ? flowCls : ""} opacity={d > 0.1 ? 1 : 0.2} />
        <path d="M345 134 L 355 190" stroke="#e8902a" strokeWidth="2" className={flowCls} />
        <path d="M390 102 C 420 140, 420 200, 430 219 L 770 219" stroke="#2f9a63" strokeWidth="2" className={flowCls} />
        <path d="M500 219 L 500 262 M 670 219 L 670 110 M 700 219 L 700 380 M 770 219 L 820 260 M 440 219 L 340 390" stroke="#2f9a63" strokeWidth="1.5" className={flowCls} />
      </g>
      {gridComponents.map((c) => {
        const n = NODES[c.id];
        const sel = selected === c.id;
        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`${c.index} ${c.name}`}
            onClick={() => onSelect(sel ? null : c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(sel ? null : c.id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#95570f]"
          >
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              fill={c.id === "solar" ? "url(#ms-panel)" : c.id === "distribution" ? "transparent" : d > 0.5 ? "#ece6da" : "#2b3346"}
              stroke={sel ? "#e8a344" : d > 0.5 ? "rgb(36 36 31 / 0.4)" : "rgb(243 239 229 / 0.4)"}
              strokeWidth={sel ? 2 : 1}
            />
            <text x={n.x} y={n.y - 8} className={cn("font-mono", sel ? "fill-[#95570f]" : d > 0.5 ? "fill-[#24241f]" : "fill-[#f3efe5]")} fontSize="12" letterSpacing="1.5">
              {c.index} {c.name.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
