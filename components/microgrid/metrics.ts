import type { MetricKey } from "@/lib/data/microgrid";
import { activeConnections, MODEL, stateOf, type SimPoint } from "@/lib/sim/energy";

const kw = (v: number) => `${v.toFixed(1)} kW`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function metricsFor(key: MetricKey, s: SimPoint, hour: number): { label: string; value: string }[] {
  const inHours = (a: number, b: number) => hour >= a && hour < b;
  switch (key) {
    case "pv":
      return [
        { label: "Generation", value: kw(s.pvKw) },
        { label: "Of modelled peak", value: pct(s.pvKw / MODEL.pvPeakKw) },
        { label: "Surplus", value: kw(Math.max(0, s.pvKw - s.demandKw)) },
      ];
    case "inverter":
      return [
        { label: "DC in (solar)", value: kw(s.pvKw) },
        { label: "AC out (loads)", value: kw(s.demandKw) },
        { label: "Mode", value: s.pvKw > 0.5 ? "Grid-forming · solar" : "Grid-forming · battery" },
      ];
    case "battery":
      return [
        { label: "State of charge", value: pct(s.soc) },
        { label: s.batteryKw >= 0 ? "Charging" : "Discharging", value: kw(Math.abs(s.batteryKw)) },
        { label: "Stored energy", value: `${(s.soc * MODEL.batteryKwh).toFixed(0)} kWh` },
      ];
    case "demand":
      return [
        { label: "Network load", value: kw(s.demandKw) },
        { label: "Connections drawing", value: `${activeConnections(s)} / ${MODEL.connections}` },
        { label: "Status", value: stateOf(s) },
      ];
    case "household":
      return [
        { label: "Lights", value: inHours(5.5, 7) || inHours(17.5, 23) ? "On" : "Off" },
        { label: "Phone charging", value: "Available" },
        { label: "TV / radio", value: inHours(18, 22.5) ? "In use" : "Standby" },
      ];
    case "school":
      return [
        { label: "Classes", value: inHours(7.5, 15.5) ? "In session" : "Closed" },
        { label: "Load", value: inHours(7.5, 15.5) ? "1.6 kW" : "0.1 kW" },
        { label: "Devices", value: inHours(7.5, 15.5) ? "Charging" : "Idle" },
      ];
    case "productive":
      return [
        { label: "Mill", value: inHours(8.5, 16.5) ? "Running" : "Off" },
        { label: "Cold room", value: "Holding 4 °C" },
        { label: "Runs on", value: s.pvKw > s.demandKw ? "Direct solar" : "Battery" },
      ];
    case "water":
      return [
        { label: "Pump", value: inHours(9.5, 15) ? "Pumping" : "Idle" },
        { label: "Schedule", value: "09:30–15:00" },
        { label: "Storage", value: "Elevated tank" },
      ];
    case "business":
      return [
        { label: "Shops", value: inHours(7, 20.5) ? "Open" : "Closed" },
        { label: "Refrigeration", value: "Running" },
        { label: "Evening trading", value: "Lit until 20:30" },
      ];
    case "meters":
      return [
        { label: "Metered connections", value: `${MODEL.connections}` },
        { label: "Drawing now", value: `${activeConnections(s)}` },
        { label: "Billing", value: "Prepaid · PAYG" },
      ];
  }
}
