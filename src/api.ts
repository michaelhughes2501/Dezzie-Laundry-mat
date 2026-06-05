import { LaundromatState, Machine, Booking, LoyaltyProfile, Transaction, MaintenanceTask } from "./types";

export async function getState(): Promise<LaundromatState> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to load laundromat state");
  return res.json();
}

export async function resetState(): Promise<LaundromatState> {
  const res = await fetch("/api/state/reset", { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset state");
  return (await res.json()).state;
}

export interface MachineUpdatePayload {
  id: string;
  status: string;
  cycleType?: string | null;
  minutes?: number;
  notes?: string;
  reason?: string | null;
}

export async function updateMachine(payload: MachineUpdatePayload): Promise<LaundromatState> {
  const res = await fetch("/api/machine/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update machine configuration");
  return (await res.json()).state;
}

export interface CheckoutPayload {
  userId: string;
  machineId: string | null;
  selectedCycle?: string;
  customPrice?: number;
  paymentMethod: string;
}

export async function processCheckout(payload: CheckoutPayload) {
  const res = await fetch("/api/payment/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Transaction checkout failed");
  }
  return res.json();
}

export interface TopupPayload {
  userId: string;
  amount: number;
  cardHolder: string;
  cardNumber: string;
  cvv: string;
}

export async function processTopup(payload: TopupPayload) {
  const res = await fetch("/api/payment/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Funding transaction failed");
  }
  return res.json();
}

export async function signupLoyalty(name: string, email: string) {
  const res = await fetch("/api/loyalty/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to sign up loyalty account");
  }
  return res.json();
}

export async function bookSession(machineId: string, userId: string, scheduledTime: string) {
  const res = await fetch("/api/booking/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ machineId, userId, scheduledTime }),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to book session");
  }
  return res.json();
}

export async function scheduleMaintenance(payload: {
  machineId: string;
  technician: string;
  description: string;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
}) {
  const res = await fetch("/api/maintenance/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to schedule maintenance");
  }
  return res.json();
}

export async function completeMaintenance(taskId: string, maintenanceNotes: string) {
  const res = await fetch("/api/maintenance/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, maintenanceNotes }),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Failed to complete tasks");
  }
  return res.json();
}

export async function triggerOrchestratorAudit() {
  const res = await fetch("/api/simulate/orchestrator-audit", { method: "POST" });
  if (!res.ok) throw new Error("Failed to run orchestration sequence");
  return res.json();
}

export async function queryAI(question: string, role: string): Promise<string> {
  const res = await fetch("/api/ai/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, role }),
  });
  if (!res.ok) throw new Error("AI copilot server took too long to analyze");
  const data = await res.json();
  return data.answer;
}

export async function updatePricingRules(payload: {
  peakMultiplier?: number;
  offPeakDiscountRate?: number;
  simulatedHour?: number;
  simulatedDay?: string;
}) {
  const res = await fetch("/api/pricing/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update simulated pricing structures");
  return res.json();
}

export async function triggerPredictiveMaintenance() {
  const res = await fetch("/api/simulate/predictive-maintenance", { method: "POST" });
  if (!res.ok) throw new Error("Failed to scan predictive metrics");
  return res.json();
}

export async function pushServerState(newState: LaundromatState): Promise<LaundromatState> {
  const res = await fetch("/api/state/update_all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newState }),
  });
  if (!res.ok) throw new Error("Failed to synchronize state back to backend server");
  const data = await res.json();
  return data.state;
}
