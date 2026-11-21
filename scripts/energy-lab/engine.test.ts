/**
 * Energy Lab engine tests:  npm run lab:test
 * Physics, battery behaviour, energy balance, prioritisation, optimisation,
 * comparisons, forecast, resilience, copilot grounding and edge cases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyse } from "@/lib/energy-lab/explain";
import { answerOffline } from "@/lib/energy-lab/fallback";
import { runVariant } from "@/lib/energy-lab/context";
import { forecast24h } from "@/lib/energy-lab/forecast";
import { flexibleSpec, FLEXIBLE_IDS, LOADS } from "@/lib/energy-lab/loads";
import { objective, optimiseSchedule } from "@/lib/energy-lab/optimize";
import { presetConfig, PRESETS } from "@/lib/energy-lab/presets";
import { NO_STRESS, runResilience, sizeFor, toStress } from "@/lib/energy-lab/resilience";
import { copilotRequestSchema, scenarioSchema } from "@/lib/energy-lab/schema";
import { DEFAULT_CONFIG, simulate, SPEC, summarise } from "@/lib/energy-lab/simulate";
import { cellTemp, clearSkyGhi, dailyPvKwh, pvPower } from "@/lib/energy-lab/solar";
import { PRIORITIES, STEP_H, type ScenarioConfig, type SimResult, type StepResult } from "@/lib/energy-lab/types";

const near = (a: number, b: number, tol = 1e-6, msg?: string) => assert.ok(Math.abs(a - b) <= tol, msg ?? `${a} ≉ ${b} (±${tol})`);
const cfgWith = (p: Partial<ScenarioConfig>): ScenarioConfig => ({ ...DEFAULT_CONFIG, ...p });
const rank = (p: string) => PRIORITIES.indexOf(p as never);
/** All-day overcast scenario used by several tests. */
const OVERCAST = cfgWith({ weather: "cloudy", weatherTomorrow: "partly", initialSoc: 0.5 });

function checkInvariants(r: SimResult, label: string) {
  const cap = r.capacityKwh;
  let prev = r.summary.startSoc * cap;
  for (const st of r.steps) {
    const charge = Math.max(0, st.batteryKw);
    const discharge = Math.max(0, -st.batteryKw);
    // Supply balance
    near(st.pvKw, st.pvToLoadKw + charge + st.curtailedKw, 1e-6, `${label} t=${st.t}: PV balance`);
    near(st.servedKw, st.pvToLoadKw + discharge, 1e-6, `${label} t=${st.t}: served = solar + battery`);
    assert.ok(st.servedKw <= st.demandKw + 1e-9, `${label}: served ≤ demand`);
    assert.ok(st.curtailedKw >= -1e-9 && st.unservedKw >= -1e-9);
    // Battery physics
    const expected = prev + charge * SPEC.chargeEff * STEP_H - (discharge * STEP_H) / SPEC.dischargeEff;
    near(st.socKwh, Math.min(SPEC.maxSoc * cap, Math.max(0, expected)), 1e-6, `${label} t=${st.t}: battery energy update`);
    assert.ok(st.soc <= SPEC.maxSoc + 1e-9, `${label}: SOC ≤ max`);
    assert.ok(charge <= SPEC.cRate * cap + 1e-9 && discharge <= SPEC.cRate * cap + 1e-9, `${label}: C-rate`);
    assert.ok(!(charge > 1e-9 && discharge > 1e-9), `${label}: no simultaneous charge and discharge`);
    // Per-load consistency
    let sumD = 0;
    let sumS = 0;
    for (const l of LOADS) {
      const x = st.loads[l.id];
      assert.ok(x.served <= x.demand + 1e-9 && x.served >= -1e-9);
      sumD += x.demand;
      sumS += x.served;
    }
    near(sumD, st.demandKw, 1e-9);
    near(sumS, st.servedKw, 1e-9);
    prev = st.socKwh;
  }
}

// ─── Solar ──────────────────────────────────────────────────────────
test("solar: zero at night, peak near solar noon", () => {
  for (const h of [0, 3, 5, 19.5, 22]) assert.equal(pvPower(h, STEP_H, 30, 300, "clear", SPEC), 0);
  const day = Array.from({ length: 96 }, (_, i) => pvPower(i * STEP_H, STEP_H, 30, 300, "clear", SPEC));
  const peak = day.indexOf(Math.max(...day)) * STEP_H;
  assert.ok(peak >= 11.25 && peak <= 12.75, `peak at ${peak}`);
  assert.ok(Math.max(...day) < 30, "peak below nameplate after derating");
});

test("solar: weather ordering and linear scaling", () => {
  const e = (w: "clear" | "partly" | "cloudy" | "rainy") => dailyPvKwh(30, 300, w, SPEC);
  assert.ok(e("clear") > e("partly") && e("partly") > e("cloudy") && e("cloudy") > e("rainy") && e("rainy") > 0);
  near(dailyPvKwh(60, 300, "clear", SPEC), 2 * e("clear"), 1e-6);
  assert.ok(dailyPvKwh(30, 172, "clear", SPEC) < dailyPvKwh(30, 355, "clear", SPEC), "southern winter (June) < summer (December)");
  // Clear-day yield per kWp in a plausible range for 19.7° S (horizontal, derated)
  const perKwp = e("clear") / 30;
  assert.ok(perKwp > 4.5 && perKwp < 7.5, `yield ${perKwp} kWh/kWp`);
});

test("solar: a cloudy afternoon matches a clear morning, then drops", () => {
  near(pvPower(9, STEP_H, 30, 300, "afternoon", SPEC), pvPower(9, STEP_H, 30, 300, "clear", SPEC), 0.25);
  assert.ok(pvPower(15, STEP_H, 30, 300, "afternoon", SPEC) < 0.45 * pvPower(15, STEP_H, 30, 300, "clear", SPEC));
  const e = dailyPvKwh(30, 300, "afternoon", SPEC);
  assert.ok(e < dailyPvKwh(30, 300, "clear", SPEC) && e > dailyPvKwh(30, 300, "cloudy", SPEC));
});

test("solar: hot cells produce less", () => {
  assert.ok(cellTemp(30, 1000, SPEC.noctC) > cellTemp(30, 200, SPEC.noctC));
  const g = clearSkyGhi(12, 300, SPEC.latitudeDeg);
  assert.ok(g > 900 && g < 1100, `noon GHI ${g}`);
});

// ─── Energy balance & battery ───────────────────────────────────────
test("energy balance and battery physics hold for every preset and strategy", () => {
  for (const p of PRESETS) {
    const cfg = presetConfig(p.id);
    for (const strategy of ["baseline", "priority", "intelligent"] as const) {
      const r = simulate(cfg, { strategy, days: 2 });
      checkInvariants(r, `${p.id}/${strategy}`);
      const s = r.summary;
      near(s.pvAvailableKwh, s.pvToLoadKwh + s.batteryChargeKwh + s.curtailedKwh, 1e-6);
      near(s.demandKwh, s.servedKwh + s.unservedKwh, 1e-6);
      near((s.endSoc - s.startSoc) * r.capacityKwh, s.batteryChargeKwh * SPEC.chargeEff - s.batteryDischargeKwh / SPEC.dischargeEff, 1e-6);
      near(s.batteryLossesKwh, s.batteryChargeKwh * (1 - SPEC.chargeEff) + s.batteryDischargeKwh * (1 / SPEC.dischargeEff - 1), 1e-9);
    }
  }
});

test("units: constant 1 kW for 24 h integrates to 24 kWh", () => {
  const steps: StepResult[] = Array.from({ length: 96 }, (_, i) => ({
    t: i * STEP_H, pvKw: 1, demandKw: 1, servedKw: 1, unservedKw: 0, batteryKw: 0, curtailedKw: 0, pvToLoadKw: 1, soc: 0.5, socKwh: 40, tripped: false,
    loads: Object.fromEntries(LOADS.map((l) => [l.id, { demand: l.id === "clinic" ? 1 : 0, served: l.id === "clinic" ? 1 : 0 }])) as StepResult["loads"],
  }));
  const s = summarise(steps, 80, 0.25, 0.5);
  near(s.demandKwh, 24);
  near(s.pvAvailableKwh, 24);
  near(s.hours, 24);
});

test("battery: managed dispatch never discharges below the reserve for non-critical loads", () => {
  const cfg = presetConfig("battery-stress");
  const r = simulate(cfg, { strategy: "intelligent", days: 2 });
  let prev = r.summary.startSoc;
  for (const st of r.steps) {
    const discharge = Math.max(0, -st.batteryKw);
    if (prev <= r.reserveSoc + 1e-9 && discharge > 1e-9) {
      // Only the clinic may be using the battery here.
      assert.ok(discharge <= st.loads.clinic.served + 1e-6, `t=${st.t}: non-critical loads drew on the reserve`);
    }
    assert.ok(st.soc >= SPEC.minSoc - 1e-9 || r.summary.startSoc < SPEC.minSoc, "never below the floor");
    prev = st.soc;
  }
});

test("battery: offline battery neither charges nor discharges", () => {
  const r = simulate(DEFAULT_CONFIG, { strategy: "intelligent", stress: { batteryOutageHours: 6 }, days: 1 });
  for (const st of r.steps.filter((s) => s.t >= 18 && s.t < 24)) assert.equal(st.batteryKw, 0);
});

// ─── Prioritisation ─────────────────────────────────────────────────
test("prioritisation: a lower-priority load is never served while a higher one is short", () => {
  for (const id of ["cloudy-afternoon", "battery-stress", "evening-peak", "overcast"]) {
    const r = simulate(id === "overcast" ? OVERCAST : presetConfig(id), { strategy: "intelligent", days: 2 });
    for (const st of r.steps) {
      const shortRank = Math.min(...LOADS.filter((l) => st.loads[l.id].demand - st.loads[l.id].served > 1e-6).map((l) => rank(l.priority)), 99);
      if (shortRank === 99) continue;
      // Lower-priority loads may only be served from solar that higher ones could not use; with a
      // higher-priority shortfall there is no solar left, so they must be off.
      for (const l of LOADS.filter((x) => rank(x.priority) > shortRank)) assert.ok(st.loads[l.id].served <= 1e-6, `${id} t=${st.t}: ${l.id} served while a higher priority is short`);
    }
  }
});

test("prioritisation: managed dispatch protects the clinic where the uncontrolled system fails it", () => {
  const cfg = OVERCAST;
  const b = simulate(cfg, { strategy: "baseline" }).summary;
  const m = simulate(cfg, { strategy: "priority" }).summary;
  assert.ok(b.unservedByPriority.critical > 0.5, "uncontrolled system leaves the clinic unserved");
  assert.ok(m.unservedByPriority.critical < 1e-6, "managed dispatch keeps the clinic supplied");
});

test("uncontrolled system: a trip drops every load", () => {
  const r = simulate(presetConfig("battery-stress"), { strategy: "baseline", days: 1 });
  const tripped = r.steps.filter((s) => s.tripped);
  assert.ok(tripped.length > 0);
  for (const st of tripped) assert.equal(st.servedKw, 0);
});

// ─── Optimisation ───────────────────────────────────────────────────
test("optimiser: never worse than the operator's schedule, respects windows, deterministic", () => {
  for (const p of PRESETS) {
    const cfg = presetConfig(p.id);
    const o = optimiseSchedule(cfg);
    assert.ok(o.objective <= o.baselineObjective + 1e-9, `${p.id}: objective did not get worse`);
    for (const id of FLEXIBLE_IDS) {
      const spec = flexibleSpec(id, cfg);
      assert.ok(o.schedule[id] >= spec.earliest - 1e-9 && o.schedule[id] + spec.runHours <= spec.latest + 1e-9, `${p.id}: ${id} inside its window`);
    }
    assert.deepEqual(optimiseSchedule(cfg).schedule, o.schedule);
  }
});

test("optimiser: moves the mill into daylight and reduces battery cycling on a sunny day", () => {
  const a = analyse(presetConfig("sunny"));
  const mill = a.changes.find((c) => c.id === "mill");
  assert.ok(mill && mill.to < mill.from && mill.to + mill.runHours <= 17, "mill moved into the solar window");
  assert.ok(a.intelligent.summary.batteryDischargeKwh < a.priority.summary.batteryDischargeKwh - 1, "less battery discharge");
  assert.ok(a.intelligent.summary.pvToLoadKwh > a.priority.summary.pvToLoadKwh, "more solar used directly");
});

test("optimiser: an already-optimal schedule is returned unchanged", () => {
  const cfg = presetConfig("sunny");
  const o = optimiseSchedule(cfg);
  const again = optimiseSchedule({ ...cfg, pumpStart: o.schedule.pump, millStart: o.schedule.mill, workshopStart: o.schedule.workshop });
  assert.equal(again.guarantee, "unchanged");
});

test("optimiser: objective weights reflect priorities", () => {
  const s = simulate(OVERCAST, { strategy: "priority" });
  const base = objective(s.summary, s.capacityKwh, 0);
  const worse = { ...s.summary, unservedByPriority: { ...s.summary.unservedByPriority, critical: s.summary.unservedByPriority.critical + 1 } };
  assert.ok(objective(worse, s.capacityKwh, 0) - base >= 999);
});

// ─── Scenario comparisons ───────────────────────────────────────────
test("comparisons: more solar or storage never increases unserved energy", () => {
  const base = OVERCAST;
  let prev = Infinity;
  for (const kwp of [15, 30, 45, 60, 90]) {
    const u = simulate({ ...base, solarKwp: kwp }, { strategy: "priority" }).summary.unservedKwh;
    assert.ok(u <= prev + 1e-6, `solar ${kwp}: ${u} > ${prev}`);
    prev = u;
  }
  prev = Infinity;
  for (const kwh of [40, 80, 160, 320]) {
    const u = simulate({ ...base, batteryKwh: kwh }, { strategy: "priority" }).summary.unservedKwh;
    assert.ok(u <= prev + 1e-6, `battery ${kwh}: ${u} > ${prev}`);
    prev = u;
  }
});

test("comparisons: more households raise demand", () => {
  const a = simulate(cfgWith({ households: 60 }), { strategy: "priority" }).summary.demandKwh;
  const b = simulate(cfgWith({ households: 90 }), { strategy: "priority" }).summary.demandKwh;
  assert.ok(b > a * 1.1);
});

test("comparisons: honest when management changes nothing", () => {
  const a = analyse(cfgWith({ solarKwp: 120, batteryKwh: 400, initialSoc: 0.9, pumpStart: 9, millStart: 11, workshopStart: 12 }));
  assert.equal(a.baseline.summary.unservedKwh, 0);
  assert.equal(a.intelligent.summary.unservedKwh, 0);
  assert.ok(a.recommendations.every((r) => r.kind !== "capacity" && r.kind !== "shed"));
});

// ─── Forecast ───────────────────────────────────────────────────────
test("forecast: 24 h horizon, ordered bounds, windows inside the horizon", () => {
  const cfg = OVERCAST;
  const a = analyse(cfg);
  const f = forecast24h(cfg, a.intelligent, 15, a.optimisation.schedule);
  assert.equal(f.points.length, 96);
  near(f.points[0].t, 15);
  for (const p of f.points) assert.ok(p.pvLow <= p.pv + 1e-9 && p.pv <= p.pvHigh + 1e-9 && p.demandLow <= p.demand && p.demand <= p.demandHigh);
  assert.ok(f.totals.unservedLow >= f.totals.unserved - 1e-6, "low case is at least as short");
  for (const w of [...f.shortages, ...f.surpluses]) assert.ok(w.kwh > 0 && w.start >= 15 && w.end <= 39 + 1e-9);
  for (const w of f.flexWindows) {
    const spec = flexibleSpec(w.id, cfg);
    const dh = w.start % 24;
    assert.ok(dh >= spec.earliest - 1e-9 && dh + spec.runHours <= spec.latest + 1e-9);
  }
  near(f.startSoc, a.intelligent.steps[59].soc, 1e-9);
});

// ─── Resilience ─────────────────────────────────────────────────────
test("resilience: overcast days cause deficits, management protects the clinic, recovery follows", () => {
  const r = runResilience(DEFAULT_CONFIG, { ...NO_STRESS, cloudyDays: 3 });
  assert.equal(r.hours, 120);
  assert.ok(r.intelligent.run.summary.unservedKwh > 10);
  assert.ok(r.baseline.run.summary.unservedByPriority.critical > r.intelligent.run.summary.unservedByPriority.critical);
  assert.ok(r.intelligent.recoveredAt === null || r.intelligent.recoveredAt >= r.stressEnd);
  checkInvariants(r.intelligent.run, "resilience/intelligent");
  checkInvariants(r.baseline.run, "resilience/baseline");
});

test("resilience: the sizing result actually meets its target", () => {
  const cfg = DEFAULT_CONFIG;
  const { stress, days } = toStress(cfg, { ...NO_STRESS, cloudyDays: 2 });
  const sched = optimiseSchedule(cfg, stress).schedule;
  const s = sizeFor(cfg, stress, days, sched);
  assert.ok(s.addKwp !== null || s.addKwh !== null);
  if (s.addKwp !== null) {
    const r = simulate({ ...cfg, solarKwp: cfg.solarKwp + s.addKwp }, { strategy: "intelligent", schedule: sched, stress, days }).summary;
    assert.ok(r.unservedKwh <= 0.01 * r.demandKwh + 1e-9);
  }
});

test("resilience: degradation and lost strings reduce what is served", () => {
  const ok = simulate(DEFAULT_CONFIG, { strategy: "priority", days: 2, stress: { weatherByDay: ["partly", "partly"] } }).summary;
  const bad = simulate(DEFAULT_CONFIG, { strategy: "priority", days: 2, stress: { weatherByDay: ["partly", "partly"], batteryHealth: 0.6, solarAvailable: 0.6 } }).summary;
  assert.ok(bad.servedKwh < ok.servedKwh);
});

// ─── Validation & copilot grounding ─────────────────────────────────
test("validation: out-of-range scenarios are rejected", () => {
  assert.ok(scenarioSchema.safeParse(DEFAULT_CONFIG).success);
  assert.ok(!scenarioSchema.safeParse({ ...DEFAULT_CONFIG, solarKwp: 5000 }).success);
  assert.ok(!scenarioSchema.safeParse({ ...DEFAULT_CONFIG, weather: "snow" }).success);
  assert.ok(!copilotRequestSchema.safeParse({ question: "x".repeat(2000), config: DEFAULT_CONFIG, hour: 12 }).success);
  const v = runVariant(DEFAULT_CONFIG, { solarKwp: 900 });
  assert.ok("error" in v);
});

test("copilot fallback: grounded answers and an honest refusal", () => {
  const cfg = OVERCAST;
  const a = answerOffline("Why is there an energy deficit?", cfg, 15);
  assert.equal(a.intent, "deficit");
  const unserved = analyse(cfg).intelligent.summary.unservedKwh;
  assert.ok(a.answer.includes(`${Math.round(unserved * 10) / 10} kWh`), "quotes the simulated deficit");
  const u = answerOffline("What is the capital of France?", cfg, 15);
  assert.equal(u.intent, "unknown");
  assert.match(u.answer, /can't answer that from the simulation/);
  for (const q of ["Why is the battery discharging?", "What happens if it becomes cloudy for three days?", "Can the system support 20 additional households?", "What happens if the battery capacity doubles?", "How much additional solar capacity would this scenario require?", "Compare the baseline system with the optimized system.", "What are the main risks in this scenario?", "Give me an engineering explanation of the current energy balance.", "Explain this system to a non-engineer.", "How can we reduce evening shortages?", "What should we run during the solar peak?", "How much energy is available?"]) {
    assert.notEqual(answerOffline(q, cfg, 15).intent, "unknown", q);
  }
});

test("edge cases: tiny and huge systems simulate cleanly", () => {
  for (const c of [cfgWith({ solarKwp: 5, batteryKwh: 10, households: 200, initialSoc: 0.1 }), cfgWith({ solarKwp: 120, batteryKwh: 400, households: 10, initialSoc: 0.95 })]) {
    for (const strategy of ["baseline", "intelligent"] as const) {
      const r = simulate(c, { strategy, days: 3 });
      checkInvariants(r, `edge/${strategy}`);
      assert.ok(Number.isFinite(r.summary.servedKwh));
    }
  }
});

test("optimiser: claims coordinate-wise optimality only when no single move still improves", () => {
  for (const p of PRESETS) {
    const cfg = presetConfig(p.id);
    const o = optimiseSchedule(cfg);
    if (o.guarantee !== "coordinate-wise optimal") continue;
    // Verify the claim directly: no single flexible load at any other start time scores better.
    const shift = (s: Record<string, number>) => FLEXIBLE_IDS.reduce((a, id) => a + Math.abs(s[id] - o.baselineSchedule[id]), 0);
    for (const id of FLEXIBLE_IDS) {
      const spec = flexibleSpec(id, cfg);
      for (let s = spec.earliest; s <= spec.latest - spec.runHours + 1e-9; s += 0.5) {
        const trial = { ...o.schedule, [id]: s };
        const r = simulate(cfg, { strategy: "intelligent", schedule: trial, days: 1 });
        assert.ok(objective(r.summary, r.capacityKwh, shift(trial)) >= o.objective - 1e-6, `${p.id}: moving ${id} to ${s} beats the claimed optimum`);
      }
    }
  }
});
