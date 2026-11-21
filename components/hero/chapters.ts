/** Story chapters of the 3D world. Kept separate so the hero can use them without loading three.js. */
export type ChapterId = "solar" | "battery" | "intelligence" | "distribution" | "community";

export const CHAPTER_ORDER: ChapterId[] = ["solar", "battery", "intelligence", "distribution", "community"];
