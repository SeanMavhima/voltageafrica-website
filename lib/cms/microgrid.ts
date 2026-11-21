import { gridComponents, type ComponentId, type GridComponent } from "@/lib/data/microgrid";
import type { TechItem } from "./types";

/**
 * Merge CMS-managed text onto the fixed 3D model. The model's parts (and the
 * metric each one shows) are structural; names, eyebrows, summaries and points
 * are editable. A component that is unpublished in the CMS is left out.
 */
export function mergeGridComponents(items: TechItem[]): GridComponent[] {
  const byKey = new Map(items.map((t) => [t.key, t]));
  const base = new Map(gridComponents.map((g) => [g.id, g]));
  return items
    .filter((t) => base.has(t.key as ComponentId))
    .map((t, i) => {
      const g = base.get(t.key as ComponentId)!;
      const cms = byKey.get(g.id)!;
      return {
        ...g,
        index: String(i + 1).padStart(2, "0"),
        name: cms.title || g.name,
        kicker: cms.kicker || g.kicker,
        summary: cms.body || g.summary,
        points: cms.points.length ? cms.points : g.points,
      };
    });
}
