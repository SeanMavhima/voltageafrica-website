import { LOADS, PRIORITY_LABEL, PRIORITY_NOTE, REFERENCE_HOUSEHOLDS } from "@/lib/energy-lab/loads";
import { OBJECTIVE_WEIGHTS } from "@/lib/energy-lab/optimize";
import { SPEC } from "@/lib/energy-lab/simulate";
import { WEATHER, WEATHER_ORDER } from "@/lib/energy-lab/solar";
import { ENGINE_VERSION, STEP_H, PRIORITIES } from "@/lib/energy-lab/types";
import type { Level } from "./Console";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t-2 border-charcoal pt-5">
      <h3 className="serif text-[1.5rem] text-charcoal">{title}</h3>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-charcoal-2">{children}</div>
    </div>
  );
}
const Eq = ({ children }: { children: React.ReactNode }) => <p className="relative overflow-x-auto rounded-md bg-parchment px-3 py-2 font-mono text-[12px] text-charcoal">{children}</p>;

export function Methods({ level, education }: { level: Level; education: { title: string; body: string }[] }) {
  const eng = level === "engineer";
  return (
    <div>
      {education.length > 0 && (
        <div className="mb-14 grid gap-x-12 gap-y-8 md:grid-cols-3">
          {education.map((e) => (
            <div key={e.title} className="border-t border-rule pt-4">
              <p className="serif text-[1.25rem] text-charcoal">{e.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-charcoal-2">{e.body}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-x-12 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        <Block title="Solar generation">
          <p>The sun&apos;s height is calculated for Shurugwi ({Math.abs(SPEC.latitudeDeg)}° S) for the chosen day of the year. Clear-sky irradiance follows the Haurwitz model; weather scales it by a fixed clearness factor. Hot panels produce less, so output is corrected for cell temperature.</p>
          {eng && (
            <>
              <Eq>GHI = 1098 · cosZ · e^(−0.059 / cosZ) · k</Eq>
              <Eq>T_cell = T_amb + (NOCT − 20)/800 · G, NOCT = {SPEC.noctC} °C</Eq>
              <Eq>
                P = kWp · G/1000 · (1 + γ (T_cell − 25)) · {SPEC.pvDerate}, γ = {(SPEC.pvTempCoeff * 100).toFixed(2)} %/°C
              </Eq>
              <p className="text-[13px]">
                Clearness k: {WEATHER_ORDER.map((w) => `${WEATHER[w].label.toLowerCase()} ${WEATHER[w].k} (bounds ${WEATHER[w].low}–${WEATHER[w].high})`).join(" · ")}. Modules treated as horizontal; no equation-of-time or diffuse/direct split.
              </p>
            </>
          )}
        </Block>
        <Block title="Battery">
          <p>The battery is an energy store with losses on the way in and on the way out. It is never charged above {SPEC.maxSoc * 100}% or drained below {SPEC.minSoc * 100}%, and its power is limited. A reserve is held back for the clinic.</p>
          {eng && (
            <>
              <Eq>
                E(t+Δt) = E(t) + η_c · P_ch · Δt − P_dis · Δt / η_d, η_c = {SPEC.chargeEff}, η_d = {SPEC.dischargeEff}
              </Eq>
              <Eq>
                {SPEC.minSoc * 100}% ≤ SOC ≤ {SPEC.maxSoc * 100}% · |P| ≤ {SPEC.cRate}C · equivalent cycles = Σ discharge (DC) / capacity
              </Eq>
              <p className="text-[13px]">State of health scales capacity. No temperature, voltage or in-run ageing effects.</p>
            </>
          )}
        </Block>
        <Block title="Dispatch">
          <p>Every {STEP_H * 60} minutes the energy manager supplies loads in priority order: solar first, then the battery. Only critical loads may use the reserve. When there is not enough energy, the lowest-priority loads are switched off first, so the network stays up.</p>
          <p>The uncontrolled comparison has no load management: when solar and the battery cannot cover everything, its low-voltage disconnect trips the whole network, which reconnects only once the battery is back at {SPEC.reconnectSoc * 100}%.</p>
          {eng && <p className="text-[13px]">Inverter AC rating: max(6 kW, {SPEC.inverterRatio} × kWp). Surplus solar charges the battery; the rest is curtailed.</p>}
        </Block>
        <Block title="Scheduling optimiser">
          <p>The pump, mill and workshop can run at different times within their windows. The optimiser searches start times on a 30-minute grid and scores each candidate by simulating the whole day.</p>
          {eng && (
            <>
              <Eq>
                J = {PRIORITIES.map((p) => `${OBJECTIVE_WEIGHTS[p]}·U_${p.slice(0, 4)}`).join(" + ")} + 0.05·E_dis − 0.02·E_end + 0.001·Σ|shift|
              </Eq>
              <p className="text-[13px]">Greedy placement on the solar surplus, then coordinate descent until no single move improves J. Coordinate-wise optimal on the grid; not a proof of global optimality. Linear programming would be the next step once real telemetry justifies it.</p>
            </>
          )}
        </Block>
        <Block title="Forecast">
          <p>The 24-hour forecast projects the simulator forward from the current moment, with low and high cases from assumed weather bounds and ±10% demand. It is a simulated forecast, not a trained model, and is built so measured weather and pilot telemetry can replace its inputs.</p>
        </Block>
        <Block title="Community demand">
          <p>Eleven load categories with daily profiles, defined for {REFERENCE_HOUSEHOLDS} households and scaled by the scenario. These profiles are assumptions for a conceptual hub, not survey results or metered data.</p>
          {eng && (
            <table className="w-full text-left text-[12px]">
              <tbody>
                {LOADS.map((l) => (
                  <tr key={l.id} className="border-t border-rule align-top">
                    <td className="py-1.5 pr-2 font-medium text-charcoal">{l.name}</td>
                    <td className="py-1.5 pr-2 text-stone" title={PRIORITY_NOTE[l.priority]}>
                      {PRIORITY_LABEL[l.priority]}
                    </td>
                    <td className="py-1.5 text-stone">{l.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>
      </div>
      <p className="mt-12 font-mono text-[11px] text-stone">Simulation engine v{ENGINE_VERSION} · lib/energy-lab · unit-tested · kW for power, kWh for energy</p>
    </div>
  );
}
