/**
 * Photography used on the site.
 *
 * "own"     — VoltageAfrica's own photographs (from the project media folders).
 * "commons" — freely licensed photographs from Wikimedia Commons, credited as
 *             their licences require. These are landscapes only and are never
 *             presented as VoltageAfrica installations.
 */
export type Photo = {
  src: string;
  alt: string;
  caption: string;
  credit?: { author: string; license: string; licenseUrl: string; source: string };
};

export const landscapes = {
  chidoma: {
    src: "/images/landscape/chidoma-dusk.jpg",
    alt: "Chidoma Kopje and the Mapfungautsi Plateau rendered in deep dusk tones",
    caption: "Chidoma Kopje beside the Mapfungautsi Plateau, Midlands Province, Zimbabwe (tonally treated)",
    credit: {
      author: "Jaison Ndlovu",
      license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "https://commons.wikimedia.org/wiki/File:Chidoma_Kopje.jpg",
    },
  },
  matobo: {
    src: "/images/landscape/matobo-view.jpg",
    alt: "Sunlight breaking through a rain storm over the granite kopjes and woodland of the Matobo Hills, Zimbabwe",
    caption: "Light through a storm over the Matobo Hills, Zimbabwe",
    credit: {
      author: "Digr",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      source: "https://commons.wikimedia.org/wiki/File:ZW_Matobo_NPview.JPG",
    },
  },
  chiremba: {
    src: "/images/landscape/chiremba-rocks.jpg",
    alt: "Granite boulders naturally balanced on top of one another at Chiremba",
    caption: "Chiremba Balancing Rocks, Harare, Zimbabwe",
    credit: {
      author: "lumoplank",
      license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      source: "https://commons.wikimedia.org/wiki/File:Chiremba_Balancing_Rocks_-_Harare3500.jpg",
    },
  },
} satisfies Record<string, Photo>;

export const photoCredits = Object.values(landscapes).map((p) => ({ caption: p.caption, ...p.credit }));
