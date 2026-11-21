import Link from "next/link";
import { ExternalLink, PencilLine } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/cms/auth";
import { aiStatus } from "@/lib/energy-lab/ai";
import { labSettings } from "@/lib/energy-lab/cms";
import { PRESETS } from "@/lib/energy-lab/presets";
import { DEFAULT_CONFIG, SPEC } from "@/lib/energy-lab/simulate";
import { ENGINE_VERSION } from "@/lib/energy-lab/types";

export const metadata = { title: "Energy Lab" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-4 border-t border-ws-line px-5 py-2.5 text-[13px] first:border-t-0">
      <dt className="text-ws-ink/60">{label}</dt>
      <dd className="text-ws-ink">{children}</dd>
    </div>
  );
}

/** Energy Lab: availability, content entry point, AI configuration status and engine facts. */
export default async function EnergyLabAdmin() {
  const { db } = await requireAdmin("/admin/energy-lab");
  const { data: page } = await db.from("pages").select("id, status, slug").eq("slug", "energy-lab").maybeSingle();
  const { data: sections } = page ? await db.from("page_sections").select("id, type, status, is_visible, content").eq("page_id", page.id).eq("type", "energy_lab") : { data: null };
  const section = sections?.[0] as { id: string; status: string; is_visible: boolean; content: Record<string, unknown> } | undefined;
  const settings = section ? labSettings(section.content ?? {}) : null;
  const ai = aiStatus();
  const live = page?.status === "published" && section?.status === "published" && section.is_visible && !settings?.paused;

  return (
    <>
      <PageHeader
        title="Energy Lab"
        description="The interactive microgrid simulator at /energy-lab. Copy, availability, presets and starting values are edited on the page's Energy Lab section. Physics, priorities and the optimiser are version-controlled code and cannot be changed here."
        actions={
          <>
            {page && (
              <Link href={`/admin/pages/${page.id}`} className="inline-flex items-center gap-2 rounded-lg bg-ws-ink px-3.5 py-2 text-[13px] font-medium text-white hover:bg-black">
                <PencilLine className="h-4 w-4" /> Edit content
              </Link>
            )}
            <a href="/energy-lab" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-ws-line bg-white px-3.5 py-2 text-[13px] font-medium text-ws-ink hover:bg-ws">
              <ExternalLink className="h-4 w-4" /> View
            </a>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Availability">
          <dl>
            <Row label="Public status">{live ? <Badge status="published">Live</Badge> : <Badge status="draft">Not live</Badge>}</Row>
            <Row label="Page /energy-lab">{page ? <Badge status={page.status}>{page.status}</Badge> : "Missing: run migration 009_energy_lab.sql"}</Row>
            <Row label="Energy Lab section">{section ? `${section.status}${section.is_visible ? "" : " · hidden"}` : page ? "No Energy Lab section on the page. Add one from the section library." : "—"}</Row>
            <Row label="Temporarily closed">{settings?.paused ? "Yes: visitors see the notice" : "No"}</Row>
            <Row label="Default scenario">{settings ? PRESETS.find((p) => p.id === settings.defaultPreset)?.title : "—"}</Row>
            <Row label="Default level">{settings?.defaultLevel === "engineer" ? "Engineer" : "Explore"}</Row>
            <Row label="Presets shown">{settings ? `${settings.presets.length} of ${PRESETS.length}` : "—"}</Row>
            <Row label="Starting system">{settings ? `${settings.defaults.households} households · ${settings.defaults.solarKwp} kWp · ${settings.defaults.batteryKwh} kWh · ${Math.round(settings.defaults.reservePct * 100)}% reserve` : `${DEFAULT_CONFIG.households} households · ${DEFAULT_CONFIG.solarKwp} kWp · ${DEFAULT_CONFIG.batteryKwh} kWh`}</Row>
          </dl>
        </Card>

        <Card title="AI copilot">
          <dl>
            <Row label="Status">{ai.configured && !settings?.copilotOff ? <Badge status="published">AI answers on</Badge> : <Badge status="draft">Built-in engine only</Badge>}</Row>
            <Row label="ANTHROPIC_API_KEY">{ai.keyPresent ? "Set (server only, never shown)" : "Not set"}</Row>
            <Row label="Model">
              <code className="text-[12px]">{ai.model}</code>
            </Row>
            <Row label="ENERGY_LAB_AI">{ai.disabledByEnv ? "off (AI disabled by environment)" : "not set (AI allowed)"}</Row>
            <Row label="Turned off in CMS">{settings?.copilotOff ? "Yes: the copilot is hidden" : "No"}</Row>
            <Row label="Rate limits">6 questions per minute, 40 per hour, per visitor (per server instance)</Row>
          </dl>
          <p className="border-t border-ws-line px-5 py-3 text-[12.5px] leading-relaxed text-ws-ink/60">
            Without a key the copilot still works: it answers from the deterministic engine and says when it cannot answer. Keys are set in Vercel → Settings → Environment Variables and never stored in the CMS.
          </p>
        </Card>

        <Card title="Simulation engine" className="xl:col-span-2">
          <dl className="grid md:grid-cols-2">
            <div>
              <Row label="Version">v{ENGINE_VERSION} · lib/energy-lab</Row>
              <Row label="Time step">15 minutes</Row>
              <Row label="Location">Shurugwi, {Math.abs(SPEC.latitudeDeg)}° S</Row>
              <Row label="PV derate · temp. coeff.">
                {SPEC.pvDerate} · {(SPEC.pvTempCoeff * 100).toFixed(2)} %/°C
              </Row>
            </div>
            <div>
              <Row label="Battery window">
                {SPEC.minSoc * 100}–{SPEC.maxSoc * 100}% · {SPEC.cRate}C
              </Row>
              <Row label="Efficiencies">
                charge {SPEC.chargeEff} · discharge {SPEC.dischargeEff}
              </Row>
              <Row label="Uncontrolled reconnect">{SPEC.reconnectSoc * 100}% state of charge</Row>
              <Row label="Tests">npm run lab:test</Row>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
