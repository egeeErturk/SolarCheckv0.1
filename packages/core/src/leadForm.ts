import type { LeadData } from "./types.js";

export async function submitLeadForm(leadData: LeadData): Promise<{ ok: true; id: string }> {
  const id = `lead_${Date.now()}`;
  console.log("SolarCheck lead", { id, ...leadData });
  return { ok: true, id };
}
