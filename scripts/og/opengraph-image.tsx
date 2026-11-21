/**
 * Source of the link-preview image (public/brand/og-share.jpg). Kept out of app/ on purpose:
 * as app/opengraph-image.tsx it rendered an 840 KB PNG that overrode the light JPEG on every page.
 *
 * To change the design: copy this file back to app/opengraph-image.tsx, run the site, save
 * http://localhost:3000/opengraph-image, then encode it as JPEG and move this file back here:
 *   node -e "require(\"sharp\")(\"og.png\").jpeg({quality:84,mozjpeg:true,chromaSubsampling:\"4:4:4\"}).toFile(\"public/brand/og-share.jpg\")"
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "VoltageAfrica: Africa's next grid will be built from the village up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const photo = await readFile(join(process.cwd(), "public/images/landscape/matobo-view.jpg"));
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/logo-horizontal-primary.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3efe5", color: "#24241f", fontFamily: "serif" }}>
        <div style={{ width: 640, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 52px" }}>
          <div style={{ display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="VoltageAfrica" width={344} height={41} style={{ width: 344, height: 41 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 66, lineHeight: 1.0, letterSpacing: -1.5, display: "flex", flexWrap: "wrap" }}>
              <span>Africa&rsquo;s next grid will be built&nbsp;</span>
              <span style={{ color: "#344b3b", fontStyle: "italic" }}>from the village up.</span>
            </div>
            <div style={{ marginTop: 26, fontSize: 18, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#625d51" }}>
              Intelligent energy infrastructure · Zimbabwe
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" width={560} height={630} style={{ width: 560, height: 630, objectFit: "cover", objectPosition: "45% 50%" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: 630, background: "#e8a344" }} />
        </div>
      </div>
    ),
    size,
  );
}
