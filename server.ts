import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { LaundromatState } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found. Safe mock responses will be used.");
}

// In-Memory state for the Self Service Laundry Mat
let state: any = {
  machines: [
    {
      id: "W1",
      name: "Front-Load Washer Sub-Compact (20 lb)",
      type: "washer" as const,
      status: "available" as const,
      cycleType: null,
      remainingMinutes: 0,
      totalCycleTime: 35,
      revenueRate: 3.50,
      currentUserId: null,
      currentUserName: null,
      lastMaintenanceDate: "2026-05-15",
      maintenanceNotes: "Detergent dispenser flushed.",
      malfunctionReason: null,
      usageCount: 42,
      efficiencyFactor: 98,
    },
    {
      id: "W2",
      name: "Front-Load Washer High-Capacity (40 lb)",
      type: "washer" as const,
      status: "running" as const,
      cycleType: "Normal Eco-Warm",
      remainingMinutes: 18,
      totalCycleTime: 40,
      revenueRate: 5.50,
      currentUserId: "user_michael",
      currentUserName: "Michael Hughes",
      lastMaintenanceDate: "2026-05-10",
      maintenanceNotes: "Door lock gasket checked.",
      malfunctionReason: null,
      usageCount: 88,
      efficiencyFactor: 95,
    },
    {
      id: "W3",
      name: "Mega Washer Super-Load (60 lb)",
      type: "washer" as const,
      status: "completed" as const,
      cycleType: "Heavy Duty Sanitizing Hot",
      remainingMinutes: 0,
      totalCycleTime: 45,
      revenueRate: 7.75,
      currentUserId: "user_sarah",
      currentUserName: "Sarah Jenkins",
      lastMaintenanceDate: "2026-05-02",
      maintenanceNotes: "Shock absorbers inspected and tightened.",
      malfunctionReason: null,
      usageCount: 112,
      efficiencyFactor: 94,
    },
    {
      id: "W4",
      name: "Front-Load Washer Normal (30 lb)",
      type: "washer" as const,
      status: "malfunctioning" as const,
      cycleType: null,
      remainingMinutes: 0,
      totalCycleTime: 35,
      revenueRate: 4.50,
      currentUserId: null,
      currentUserName: null,
      lastMaintenanceDate: "2026-04-20",
      maintenanceNotes: "Inlet water valves replaced.",
      malfunctionReason: "Critical out-of-balance structural vibration during 1200RPM spin cycle. Motor locked for safety.",
      usageCount: 175,
      efficiencyFactor: 76,
    },
    {
      id: "D1",
      name: "Stack Dryer Standard (30 lb) - Top",
      type: "dryer" as const,
      status: "running" as const,
      cycleType: "High Heat Speed-Dry",
      remainingMinutes: 8,
      totalCycleTime: 30,
      revenueRate: 3.00,
      currentUserId: "user_alex",
      currentUserName: "Alex Rivera",
      lastMaintenanceDate: "2026-05-18",
      maintenanceNotes: "Lint filter vacuumed and sensor cleaned.",
      malfunctionReason: null,
      usageCount: 64,
      efficiencyFactor: 97,
    },
    {
      id: "D2",
      name: "Stack Dryer Standard (30 lb) - Bottom",
      type: "dryer" as const,
      status: "available" as const,
      cycleType: null,
      remainingMinutes: 0,
      totalCycleTime: 30,
      revenueRate: 3.00,
      currentUserId: null,
      currentUserName: null,
      lastMaintenanceDate: "2026-05-18",
      maintenanceNotes: "Inspected standard belt alignment.",
      malfunctionReason: null,
      usageCount: 57,
      efficiencyFactor: 99,
    },
    {
      id: "D3",
      name: "Mega Dryer High-Airflow (50 lb)",
      type: "dryer" as const,
      status: "maintenance" as const,
      cycleType: null,
      remainingMinutes: 0,
      totalCycleTime: 40,
      revenueRate: 5.00,
      currentUserId: null,
      currentUserName: null,
      lastMaintenanceDate: "2026-05-29",
      maintenanceNotes: "Preventative Maintenance: Heating element coil resistance and thermal cutoff inspection today.",
      malfunctionReason: null,
      usageCount: 210,
      efficiencyFactor: 91,
    }
  ],
  bookings: [
    {
      id: "B-1001",
      machineId: "W1",
      userId: "user_alex",
      userName: "Alex Rivera",
      scheduledTime: "11:30 AM",
      status: "pending" as const,
      amountPaid: 3.50,
    },
    {
      id: "B-1002",
      machineId: "D2",
      userId: "user_michael",
      userName: "Michael Hughes",
      scheduledTime: "12:15 PM",
      status: "pending" as const,
      amountPaid: 3.00,
    }
  ],
  loyaltyProfiles: [
    {
      id: "user_michael",
      name: "Michael Hughes",
      email: "michaelhughes2501@gmail.com",
      points: 480,
      totalVisits: 32,
      balance: 45.00,
      discountTier: "VIP" as const,
      discountRate: 0.15,
    },
    {
      id: "user_sarah",
      name: "Sarah Jenkins",
      email: "sarah.j@gmail.com",
      points: 180,
      totalVisits: 12,
      balance: 18.50,
      discountTier: "Silver" as const,
      discountRate: 0.05,
    },
    {
      id: "user_alex",
      name: "Alex Rivera",
      email: "alex.r@gmail.com",
      points: 90,
      totalVisits: 6,
      balance: 12.00,
      discountTier: "Bronze" as const,
      discountRate: 0.00,
    }
  ],
  transactions: [
    {
      id: "TX-4091",
      timestamp: "2026-05-29T08:30:00Z",
      machineId: "W2",
      machineName: "Front-Load Washer High-Capacity (40 lb)",
      userId: "user_michael",
      userName: "Michael Hughes",
      amount: 4.68,
      discount: 0.82,
      paymentMethod: "Prepaid Wallet",
      type: "wash_dry" as const,
    },
    {
      id: "TX-4092",
      timestamp: "2026-05-29T09:15:00Z",
      machineId: "W3",
      machineName: "Mega Washer Super-Load (60 lb)",
      userId: "user_sarah",
      userName: "Sarah Jenkins",
      amount: 7.36,
      discount: 0.39,
      paymentMethod: "Apple Pay",
      type: "wash_dry" as const,
    },
    {
      id: "TX-4093",
      timestamp: "2026-05-29T09:40:00Z",
      machineId: null,
      machineName: null,
      userId: "user_michael",
      userName: "Michael Hughes",
      amount: 25.00,
      discount: 0.00,
      paymentMethod: "Secure Card Gateway (Visa)",
      type: "wallet_topup" as const,
    }
  ],
  maintenanceTasks: [
    {
      id: "M-301",
      machineId: "W4",
      machineName: "Front-Load Washer Normal (30 lb)",
      assignedTechnician: "Marcus Vance (Electro-Mech Specialist)",
      taskDescription: "Inspect structural out-of-balance sensor and adjust motor pulley alignment.",
      scheduledDate: "2026-05-29 (Today, Urgent Dispatch)",
      status: "in_progress" as const,
      priority: "high" as const,
    },
    {
      id: "M-302",
      machineId: "D3",
      machineName: "Mega Dryer High-Airflow (50 lb)",
      assignedTechnician: "Sarah Connor (Thermal Systems Eng)",
      taskDescription: "Semi-annual gas flow burner inspection and drum belt lubrication.",
      scheduledDate: "2026-05-30",
      status: "scheduled" as const,
      priority: "medium" as const,
    }
  ],
  notifications: [
    {
      id: "N-501",
      timestamp: "2026-05-29T09:02:00Z",
      title: "Equipment Malfunction Alert",
      message: "Washer W4 spin cycle safely aborted due to massive centrifugal out-of-balance vibration (Exceeded safety threshold 3.2g).",
      type: "malfunction" as const,
      read: false,
      machineId: "W4",
    },
    {
      id: "N-502",
      timestamp: "2026-05-29T09:05:00Z",
      title: "Automated Service Dispatch",
      message: "AI Work-Order Automation resolved: Dispatched technician Marcus Vance to diagnose Washer W4. Expected ETA within 1.5 hours.",
      type: "service_request" as const,
      read: false,
      machineId: "W4",
    },
    {
      id: "N-503",
      timestamp: "2026-05-29T10:10:00Z",
      title: "Mobile Advisory Sent",
      message: "Cycle progress alert: Washer W3 has completed washing cycle. Sent mobile alert to customer Sarah Jenkins (sarah.j@gmail.com).",
      type: "cycle_complete" as const,
      read: true,
      machineId: "W3",
    }
  ],
  aiWorkflowOrchestration: {
    lastWorkflowRun: "2026-05-29T10:00:00Z",
    nextAutomatedCheck: "2026-05-29T10:30:00Z",
    activeRules: [
      "Auto-detect out-of-balance vibration sensors",
      "Auto-schedule technician when machine status = malfunctioning",
      "Send mobile push notifications when remainingMinutes === 0",
      "Assess VIP loyalty eligibility (>30 visits)",
      "Daily dynamic price tier scheduler based on occupancy levels"
    ],
    log: [
      "08:00 AM: Start state analyzer. All 7 self-service machines inspected.",
      "09:02 AM: Sensor Alert: Washer W4 triggered 3.4g vibration. Emergency locking brake engaged. Auto-changed status to malfunctioning.",
      "09:05 AM: AI Decision System: Evaluated sensor output. Priority High work order generated. Dispatched Electro-Mech technician Marcus Vance. Created task M-301.",
      "10:10 AM: Washer W3 finished washing. Core broker dispatched completion webhook. Mobile push alert sent to Sarah Jenkins: 'Your cycle is ready for transfer!'."
    ]
  },
  pricingRules: {
    peakMultiplier: 1.25,
    offPeakDiscountRate: 0.20,
    simulatedHour: 10,
    simulatedDay: "Wednesday"
  }
};

// Reset state route
const initialBackup = JSON.parse(JSON.stringify(state));

// Simulated background timer for running machines
setInterval(() => {
  let stateChanged = false;
  state.machines = state.machines.map(m => {
    if (m.status === "running") {
      if (m.remainingMinutes > 1) {
        m.remainingMinutes -= 1;
      } else if (m.remainingMinutes === 1) {
        m.remainingMinutes = 0;
        m.status = "completed";
        stateChanged = true;
        // Trigger notification
        const timestamp = new Date().toISOString();
        const notificationId = "N-" + Math.floor(Math.random() * 10000);
        state.notifications.unshift({
          id: notificationId,
          timestamp,
          title: "Cycle Complete!",
          message: `Machine ${m.id} (${m.name}) has finished its cycle. sent automated push alert to mobile customer.`,
          type: "cycle_complete",
          read: false,
          machineId: m.id
        });
        state.aiWorkflowOrchestration.log.unshift(
          `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Machine ${m.id} completed. Notification broadcast successfully.`
        );
      }
    }
    return m;
  });
}, 45000); // decrement simulated times periodically

// --- API ROUTES ---

// Dynamic Pricing calculation engine
export function getDynamicPrice(machine: any, s: any) {
  let base = machine.revenueRate;
  let multiplier = 1.0;
  let reasons: string[] = [];

  const hour = s.pricingRules ? s.pricingRules.simulatedHour : new Date().getHours();
  const day = s.pricingRules ? s.pricingRules.simulatedDay : "Wednesday";

  // 1. Time of Day Peak surge (4 PM to 8 PM)
  const isPeakHour = hour >= 16 && hour <= 20;
  // Off-Peak Discount hours (6 AM to 11 AM)
  const isOffPeakHour = hour >= 6 && hour <= 11;

  if (isPeakHour) {
    const peakMult = s.pricingRules?.peakMultiplier || 1.25;
    multiplier *= peakMult;
    reasons.push(`Peak Hours Surge (+${Math.round((peakMult - 1) * 100)}% dynamic factor)`);
  } else if (isOffPeakHour) {
    const disc = s.pricingRules?.offPeakDiscountRate || 0.20;
    multiplier *= (1 - disc);
    reasons.push(`Off-Peak Promotion (-${Math.round(disc * 100)}% discount)`);
  }

  // 2. Day of Week Surge (Weekend peak load multiplier)
  const isWeekend = day === "Saturday" || day === "Sunday";
  if (isWeekend) {
    multiplier *= 1.10;
    reasons.push("Weekend High Load Surcharge (+10%)");
  }

  // 3. Machine Availability occupancy-aware coefficient
  const sameType = s.machines.filter((m: any) => m.type === machine.type);
  const availableCount = sameType.filter((m: any) => m.status === "available").length;
  const totalCount = sameType.length;
  const ratio = totalCount > 0 ? (availableCount / totalCount) : 1.0;

  if (ratio <= 0.25) {
    multiplier *= 1.15;
    reasons.push("Scarcity Index Premium (+15% due to high occupancy)");
  } else if (ratio >= 0.7) {
    multiplier *= 0.90;
    reasons.push("Abundance Eco-Saver Rate (-10% due to empty bays)");
  }

  const finalPrice = Number((base * multiplier).toFixed(2));
  return {
    dynamicPrice: finalPrice,
    priceMultiplier: Number(multiplier.toFixed(2)),
    priceReasons: reasons.length > 0 ? reasons : ["Eco-Standard Base Rate"]
  };
}

// State dynamic decorator (Pricing & Customer loyalty segmentation)
export function decorateStateWithDynamicFields(s: any) {
  // 1. Calculate and decorate machines with dynamic prices
  s.machines = s.machines.map((m: any) => {
    const results = getDynamicPrice(m, s);
    return {
      ...m,
      dynamicPrice: results.dynamicPrice,
      priceMultiplier: results.priceMultiplier,
      priceReasons: results.priceReasons
    };
  });

  // 2. Group customers into segments based on frequency, spending habits, and usage times
  s.loyaltyProfiles = s.loyaltyProfiles.map((p: any) => {
    const userTx = s.transactions.filter((tx: any) => tx.userId === p.id);
    const washTx = userTx.filter((tx: any) => tx.type === "wash_dry");
    const totalSpent = washTx.reduce((acc: number, tx: any) => acc + tx.amount, 0);
    const count = washTx.length;
    p.avgSpend = count > 0 ? Number((totalSpent / count).toFixed(2)) : 0;

    let weekendCount = 0;
    let weekdayCount = 0;
    
    washTx.forEach((tx: any) => {
      const dateVal = new Date(tx.timestamp);
      const isWeekendTx = dateVal.getDay() === 0 || dateVal.getDay() === 6;
      if (isWeekendTx) weekendCount++;
      else weekdayCount++;
    });

    let segment: 'frequent weekday users' | 'weekend warriors' | 'high spenders' | 'new eco-savers' = 'new eco-savers';
    let title = "";
    let desc = "";
    let offerRate = 0.0;
    let promoCode = "";

    if (totalSpent >= 40 || p.points >= 300) {
      segment = "high spenders";
      title = "🔥 High-Spender Platinum Rebate";
      desc = "We salute your high spending! Enjoy an extra 10% discount on all cycles, and earn 2x Loyalty Points.";
      offerRate = 0.10;
      promoCode = "PLATINUM_POWER_10";
    } else if (weekendCount > weekdayCount && weekendCount > 0) {
      segment = "weekend warriors";
      title = "⚡ Weekend Warriors Dryer Boost";
      desc = "Maximize your weekend run with an extra 8% off drying cycles scheduled for Saturday or Sunday.";
      offerRate = 0.08;
      promoCode = "WEEKEND_VIP_8";
    } else if (weekdayCount >= weekendCount && p.totalVisits >= 2) {
      segment = "frequent weekday users";
      title = "💧 Frequent Weekday Eco-Wash";
      desc = "Beat the weekday rush! Take 12% off any Eco-Wash booking made Monday through Friday.";
      offerRate = 0.12;
      promoCode = "WEEKDAY_FLOW_12";
    } else {
      segment = "new eco-savers";
      title = "🌱 Early Joiner Green Promo";
      desc = "Start smart! Get an extra 15% booking bonus when launching cycles in energy-efficient Eco modes today.";
      offerRate = 0.15;
      promoCode = "ECO_GREEN_15";
    }

    p.segment = segment;
    p.personalizedOffer = {
      title,
      description: desc,
      discountBonusCode: promoCode,
      extraDiscountRate: offerRate
    };

    return p;
  });
}

// Predictive Maintenance heuristic engine
export function runPredictativeChecks(s: any): string[] {
  let predictionsLog: string[] = [];
  const timestamp = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  s.machines.forEach((m: any) => {
    // We analyze machinery that can actively run or fail (e.g. available, completed, running)
    if (m.status !== "maintenance" && m.status !== "malfunctioning") {
      let riskScore = 0;
      let diagnosticFlags: string[] = [];

      // Flag A: Heavy cumulative usage
      if (m.usageCount > 100) {
        riskScore += 45;
        m.usageCount > 150 ? riskScore += 15 : null;
        diagnosticFlags.push(`Massive usage fatigue (${m.usageCount} lifespans logged)`);
      }

      // Flag B: Failing/declining structural efficiency index
      if (m.efficiencyFactor < 93) {
        riskScore += 40;
        diagnosticFlags.push(`Thermodynamic friction drop (${m.efficiencyFactor}% telemetry score)`);
      }

      // Flag C: Historic service latency warning
      if (m.usageCount > 60 && m.efficiencyFactor < 96) {
        riskScore += 15;
        diagnosticFlags.push("Structural safety buffer fatigue warning");
      }

      // Predictive alarm threshold
      if (riskScore >= 60) {
        // Change machine state to preventative maintenance
        m.status = "maintenance";
        const taskId = "M-" + (300 + s.maintenanceTasks.length + 1);
        m.maintenanceNotes = `Predictive Sentry: Preemptively flagged to prevent imminent mechanical failure. (Risk probability: ${riskScore}%, Diagnostics: ${diagnosticFlags.join(", ")}).`;

        // Automatically spawn a service request
        s.maintenanceTasks.unshift({
          id: taskId,
          machineId: m.id,
          machineName: m.name,
          assignedTechnician: "Dave Miller (Fluid & Pressure Tech)",
          taskDescription: `PROACTIVE PREDICTOR ALARM: Imminent failsafe trip likely. Risk factor: ${riskScore}%. Complete gasket check, inspect mechanical belt slippage, flush solenoid valve.`,
          scheduledDate: `${new Date().toISOString().split('T')[0]} (Predictive Dispatch)`,
          status: "scheduled",
          priority: "high"
        });

        // Broadcast notification to store manager alerts
        const noticeId = "N-" + Math.floor(Math.random() * 10000);
        s.notifications.unshift({
          id: noticeId,
          timestamp,
          title: `⚠️ PROACTIVE REPAIR SPAWNED: ${m.id}`,
          message: `Predictive Diagnostic heuristics identified elevated failure indices on ${m.id} (${m.name}). Machine placed in maintenance safely. Authorized work-order ${taskId}.`,
          type: "service_request",
          read: false,
          machineId: m.id
        });

        predictionsLog.push(`Proactive Alarm: Identified ${riskScore}% downtime risk on Machine ${m.id}. Status set to 'maintenance'. Dispatch ${taskId} generated.`);
        s.aiWorkflowOrchestration.log.unshift(
          `${timeStr} [PREDICTIVE WARNING] High-risk threshold tripped on ${m.id}. Generated preemptive task ${taskId} to avert equipment downtime.`
        );
      }
    }
  });

  if (predictionsLog.length === 0) {
    predictionsLog.push("All systems green. Predictive scan completed successfully: telemetry sensors indicate nominal operation.");
  }

  return predictionsLog;
}

// GET state
app.get("/api/state", (req, res) => {
  decorateStateWithDynamicFields(state);
  res.json(state);
});

// POST update full state (synchronized from Firebase)
app.post("/api/state/update_all", (req, res) => {
  const { newState } = req.body;
  if (!newState) {
    return res.status(400).json({ error: "Missing updated state payload" });
  }

  if (newState.machines) state.machines = newState.machines;
  if (newState.bookings) state.bookings = newState.bookings;
  if (newState.loyaltyProfiles) state.loyaltyProfiles = newState.loyaltyProfiles;
  if (newState.transactions) state.transactions = newState.transactions;
  if (newState.maintenanceTasks) state.maintenanceTasks = newState.maintenanceTasks;
  if (newState.notifications) state.notifications = newState.notifications;
  if (newState.pricingRules) state.pricingRules = newState.pricingRules;

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  state.aiWorkflowOrchestration.log.unshift(
    `[${timeStr}] [FIREBASE COCKPIT] Synchronized complete operational state from Firestore database successfully.`
  );

  res.json({ success: true, state });
});

// Update Simulated pricing configurations
app.post("/api/pricing/update", (req, res) => {
  const { peakMultiplier, offPeakDiscountRate, simulatedHour, simulatedDay } = req.body;
  if (!state.pricingRules) {
    state.pricingRules = { peakMultiplier: 1.25, offPeakDiscountRate: 0.20, simulatedHour: 10, simulatedDay: "Wednesday" };
  }
  if (peakMultiplier !== undefined) state.pricingRules.peakMultiplier = Number(peakMultiplier);
  if (offPeakDiscountRate !== undefined) state.pricingRules.offPeakDiscountRate = Number(offPeakDiscountRate);
  if (simulatedHour !== undefined) state.pricingRules.simulatedHour = Number(simulatedHour);
  if (simulatedDay !== undefined) state.pricingRules.simulatedDay = String(simulatedDay);

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  state.aiWorkflowOrchestration.log.unshift(
    `${timeStr} [DYNAMIC PRICING] Operator adjusted constraints. Hour: ${state.pricingRules.simulatedHour}, Day: ${state.pricingRules.simulatedDay}, Surge: ${state.pricingRules.peakMultiplier}x.`
  );

  decorateStateWithDynamicFields(state);
  res.json({ success: true, state });
});

// Run Manual Diagnostics Predictive maintenance scan
app.post("/api/simulate/predictive-maintenance", (req, res) => {
  const predictions = runPredictativeChecks(state);
  decorateStateWithDynamicFields(state);
  res.json({ success: true, predictions, state });
});

// Reset State
app.post("/api/state/reset", (req, res) => {
  state = JSON.parse(JSON.stringify(initialBackup));
  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: System state restored to original simulation defaults.`
  );
  decorateStateWithDynamicFields(state);
  res.json({ success: true, message: "State reset successful", state });
});

// Update Machine Status (Manager control or Simulation)
app.post("/api/machine/update", (req, res) => {
  const { id, status, cycleType, minutes, notes, reason } = req.body;
  const machine = state.machines.find(m => m.id === id);
  if (!machine) {
    return res.status(404).json({ error: "Machine not found" });
  }

  const oldStatus = machine.status;
  machine.status = status || machine.status;
  if (cycleType !== undefined) machine.cycleType = cycleType;
  if (minutes !== undefined) {
    machine.remainingMinutes = Number(minutes);
    machine.totalCycleTime = Number(minutes) > 0 ? Number(minutes) : machine.totalCycleTime;
  }
  if (notes !== undefined) machine.maintenanceNotes = notes;
  if (reason !== undefined) machine.malfunctionReason = reason;

  // Real-time automated system responses
  const timestamp = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (status === "malfunctioning" && oldStatus !== "malfunctioning") {
    // Flag immediately! Auto-trigger service dispatch workflow
    const notificationId = "N-" + Math.floor(Math.random() * 10000);
    const taskId = "M-" + (300 + state.maintenanceTasks.length + 1);
    
    const faultReason = reason || "Unspecified thermistor overload safety lockup.";
    machine.malfunctionReason = faultReason;
    machine.efficiencyFactor = Math.max(70, Math.floor(machine.efficiencyFactor - 15));

    // Create system notification
    state.notifications.unshift({
      id: notificationId,
      timestamp,
      title: `CRITICAL FAULT: ${machine.id}`,
      message: `${machine.name} report: ${faultReason} Automated safety failsafe triggered.`,
      type: "malfunction",
      read: false,
      machineId: machine.id
    });

    // Workflow Orchestrator: Generate and dispatch a technician immediately!
    const technicians = ["Marcus Vance (Electro-Mech Specialist)", "Sarah Connor (Thermal Systems Eng)", "Dave Miller (Fluid & Pressure Tech)"];
    const luckyTech = technicians[Math.floor(Math.random() * technicians.length)];
    
    state.maintenanceTasks.unshift({
      id: taskId,
      machineId: machine.id,
      machineName: machine.name,
      assignedTechnician: luckyTech,
      taskDescription: `Emergency diagnostics: Fault report was '${faultReason}'. Check power inputs, clean diagnostic boards, test calibration.`,
      scheduledDate: `${new Date().toISOString().split('T')[0]} (Emergency Dispatch)`,
      status: "scheduled",
      priority: "high"
    });

    const notifyDispatchId = "N-D" + Math.floor(Math.random() * 9000);
    state.notifications.unshift({
      id: notifyDispatchId,
      timestamp,
      title: "Orchestration: Technician Authorized",
      message: `AI Broker dispatched ${luckyTech} for emergency troubleshoot of ${machine.id}. ID: ${taskId}.`,
      type: "service_request",
      read: false,
      machineId: machine.id
    });

    state.aiWorkflowOrchestration.log.unshift(
      `${timeStr} [CRITICAL ALERT] Machine ${machine.id} entered malfunctioning state.`,
      `${timeStr} [ORCHESTRATOR] Automatically analyzed telemetry data. Resolved: Dispatched technician ${luckyTech} to address safety lockup. Scheduled task ${taskId}.`
    );
  } else if (status === "available" && oldStatus === "malfunctioning") {
    // Clear malfunction
    machine.malfunctionReason = null;
    machine.usageCount += 1;
    state.aiWorkflowOrchestration.log.unshift(
      `${timeStr} : Machine ${machine.id} fault cleared. Operations resumed.`
    );
  }

  res.json({ success: true, machine, state });
});

// Secure Payment Processing & Booking Engine
app.post("/api/payment/checkout", (req, res) => {
  const { userId, machineId, selectedCycle, customPrice, paymentMethod } = req.body;
  const user = state.loyaltyProfiles.find(u => u.id === userId);
  const machine = machineId ? state.machines.find(m => m.id === machineId) : null;

  if (!user) {
    return res.status(404).json({ error: "Loyalty account not found." });
  }

  let basePrice = machine ? getDynamicPrice(machine, state).dynamicPrice : Number(customPrice || 10.00);
  // Apply loyalty discount if calculated (including personalized segment campaign promo)
  const promoBonus = user.personalizedOffer ? user.personalizedOffer.extraDiscountRate : 0;
  const totalDiscountRate = user.discountRate + promoBonus;
  const discountAmount = Number((basePrice * totalDiscountRate).toFixed(2));
  const finalPrice = Number((basePrice - discountAmount).toFixed(2));

  // If paying via wallet balance, check if funds exist
  if (paymentMethod === "Prepaid Wallet") {
    if (user.balance < finalPrice) {
      return res.status(400).json({ error: `Insufficient wallet balance. You need $${finalPrice.toFixed(2)} but only have $${user.balance.toFixed(2)}. Please reload secure wallet.` });
    }
    user.balance = Number((user.balance - finalPrice).toFixed(2));
  }

  // Record safe payment transaction
  const txId = "TX-" + (4000 + state.transactions.length + 10);
  const timestamp = new Date().toISOString();
  
  state.transactions.unshift({
    id: txId,
    timestamp,
    machineId: machine ? machine.id : null,
    machineName: machine ? machine.name : "Custom Package",
    userId: user.id,
    userName: user.name,
    amount: finalPrice,
    discount: discountAmount,
    paymentMethod: paymentMethod || "Secure Card Gateway",
    type: "wash_dry"
  });

  // Award customer loyalty points (+25 points per transaction + 10 points per dollar spent)
  const baseReward = 20;
  const pointsAwarded = baseReward + Math.floor(finalPrice * 10);
  user.points += pointsAwarded;
  user.totalVisits += 1;

  // Upgrade loyalty tier based on total visits or points
  if (user.totalVisits >= 30) {
    user.discountTier = "VIP";
    user.discountRate = 0.15;
  } else if (user.totalVisits >= 15) {
    user.discountTier = "Gold";
    user.discountRate = 0.10;
  } else if (user.totalVisits >= 5) {
    user.discountTier = "Silver";
    user.discountRate = 0.05;
  }

  // Update machine status if payment is attached to launching a live cycle
  if (machine) {
    machine.status = "running";
    machine.cycleType = selectedCycle || (machine.type === "washer" ? "Standard Cold Wash" : "Regular Drying");
    machine.remainingMinutes = machine.type === "washer" ? 35 : 30;
    machine.currentUserId = user.id;
    machine.currentUserName = user.name;
    machine.usageCount += 1;

    // Remove matching bookings if any
    state.bookings = state.bookings.filter(b => !(b.machineId === machine.id && b.userId === user.id));
  }

  // Add system notifications for alerts and workflow trigger
  const alertId = "N-" + Math.floor(Math.random() * 10000);
  state.notifications.unshift({
    id: alertId,
    timestamp,
    title: "Secure payment finalized",
    message: `$${finalPrice.toFixed(2)} processed for customer ${user.name}. Loyalty profile updated (+${pointsAwarded} pts, Tier: ${user.discountTier}).`,
    type: "payment_success",
    read: false,
    machineId: machine ? machine.id : undefined
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Handled secure payment ${txId}. Points awarded to ${user.name}. Launched machine ${machine ? machine.id : "none"}.`
  );

  res.json({
    success: true,
    message: "Transaction completed successfully",
    transactionId: txId,
    finalPrice,
    discountAmount,
    pointsAwarded,
    updatedUser: user,
    state
  });
});

// Wallet Top-up Secure simulation
app.post("/api/payment/topup", (req, res) => {
  const { userId, amount, cardHolder, cardNumber, cvv } = req.body;
  const user = state.loyaltyProfiles.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: "Customer loyalty account not found" });
  }

  const topupAmount = Number(amount);
  if (isNaN(topupAmount) || topupAmount <= 0) {
    return res.status(400).json({ error: "Invalid currency amount." });
  }

  user.balance = Number((user.balance + topupAmount).toFixed(2));

  // Record Topup transaction
  const txId = "TX-" + (4000 + state.transactions.length + 10);
  const timestamp = new Date().toISOString();

  state.transactions.unshift({
    id: txId,
    timestamp,
    machineId: null,
    machineName: "Prepaid Wallet Top-up",
    userId: user.id,
    userName: user.name,
    amount: topupAmount,
    discount: 0,
    paymentMethod: "Secure Card Gateway",
    type: "wallet_topup"
  });

  state.notifications.unshift({
    id: "N-" + Math.floor(Math.random() * 10000),
    timestamp,
    title: "Secure Wallet Funded",
    message: `Prepaid wallet for ${user.name} increased by $${topupAmount.toFixed(2)}. Gateway confirmed authorization code.`,
    type: "payment_success",
    read: false
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Wallet funded with $${topupAmount.toFixed(2)} for ${user.name}. TX ID: ${txId}.`
  );

  res.json({
    success: true,
    transactionId: txId,
    newBalance: user.balance,
    state
  });
});

// Customer Session Booking Route
app.post("/api/booking/create", (req, res) => {
  const { machineId, userId, scheduledTime } = req.body;
  const user = state.loyaltyProfiles.find(u => u.id === userId);
  const machine = state.machines.find(m => m.id === machineId);

  if (!user || !machine) {
    return res.status(404).json({ error: "Invalid user account or laundry machine." });
  }

  if (machine.status !== "available") {
    return res.status(400).json({ error: `Cannot book machine ${machine.id}. It is currently ${machine.status}.` });
  }

  // Create booking
  const bId = "B-" + (1000 + state.bookings.length + 1);
  const dynPrice = getDynamicPrice(machine, state).dynamicPrice;
  state.bookings.push({
    id: bId,
    machineId: machine.id,
    userId: user.id,
    userName: user.name,
    scheduledTime: scheduledTime || "Next Slot Today",
    status: "pending",
    amountPaid: dynPrice
  });

  const timestamp = new Date().toISOString();
  state.notifications.unshift({
    id: "N-" + Math.floor(Math.random() * 10000),
    timestamp,
    title: "Remote Booking Confirmed",
    message: `${user.name} booked ${machine.id} for ${scheduledTime || "next session"}. Slot secured.`,
    type: "maintenance_scheduled", // generic blue notification indicator
    read: false,
    machineId: machine.id
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Confirmed customer booking ${bId} for ${user.name} on machine ${machine.id}.`
  );

  res.json({ success: true, bookingId: bId, state });
});

// Register New Customer Loyalty Profile
app.post("/api/loyalty/signup", (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and Email are required." });
  }

  // Check if exists
  const exists = state.loyaltyProfiles.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.json({ success: true, message: "Welcome back!", user: exists, state });
  }

  const newId = "user_" + name.toLowerCase().replace(/\s+/g, "_");
  const newProfile = {
    id: newId,
    name,
    email,
    points: 100, // Sign up bonus points!
    totalVisits: 0,
    balance: 5.00, // Sign up bonus balance ($5)!
    discountTier: "Bronze" as const,
    discountRate: 0.00
  };

  state.loyaltyProfiles.push(newProfile);
  
  const timestamp = new Date().toISOString();
  state.notifications.unshift({
    id: "N-" + Math.floor(Math.random() * 10000),
    timestamp,
    title: "Welcome Bonus Awarded",
    message: `New account created: ${name}. Earned 100 loyalty points and $5.00 welcome signup credit!`,
    type: "payment_success",
    read: false
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Registered new customer ${name}. Added $5 sign up bonus!`
  );

  res.json({ success: true, user: newProfile, state });
});

// Scheduled Maintenance dispatch
app.post("/api/maintenance/schedule", (req, res) => {
  const { machineId, technician, description, scheduledDate, priority } = req.body;
  const machine = state.machines.find(m => m.id === machineId);

  if (!machine) {
    return res.status(404).json({ error: "Machine not found." });
  }

  const mId = "M-" + (300 + state.maintenanceTasks.length + 1);
  const newTask = {
    id: mId,
    machineId: machine.id,
    machineName: machine.name,
    assignedTechnician: technician || "Assigned AI Diagnostics Tech",
    taskDescription: description || "Routine calibration check.",
    scheduledDate: scheduledDate || "Next morning",
    status: "scheduled" as const,
    priority: (priority || "medium") as 'low' | 'medium' | 'high'
  };

  state.maintenanceTasks.unshift(newTask);
  
  if (machine.status === "available") {
    machine.status = "maintenance";
    machine.maintenanceNotes = `Scheduled Maintenance task ${mId} initiated.`;
  }

  const timestamp = new Date().toISOString();
  state.notifications.unshift({
    id: "N-" + Math.floor(Math.random() * 10000),
    timestamp,
    title: "Maintenance Scheduled",
    message: `${machine.id} diagnostics task ${mId} created and technician dispatched. Priority: ${priority}.`,
    type: "maintenance_scheduled",
    read: false,
    machineId: machine.id
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Scheduled dispatch work-order ${mId} for ${machine.id}. Assigned: ${newTask.assignedTechnician}`
  );

  res.json({ success: true, task: newTask, state });
});

// Complete Maintenance task Route
app.post("/api/maintenance/complete", (req, res) => {
  const { taskId, maintenanceNotes } = req.body;
  const task = state.maintenanceTasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task code not registered." });
  }

  task.status = "completed";
  const machine = state.machines.find(m => m.id === task.machineId);
  if (machine) {
    machine.status = "available";
    machine.lastMaintenanceDate = new Date().toISOString().split('T')[0];
    machine.maintenanceNotes = maintenanceNotes || "Repairs finalized. Calibrations green.";
    machine.efficiencyFactor = Math.min(100, Math.floor(machine.efficiencyFactor + 18));
  }

  const timestamp = new Date().toISOString();
  state.notifications.unshift({
    id: "N-" + Math.floor(Math.random() * 10000),
    timestamp,
    title: "Maintenance Complete",
    message: `Technician verified ${task.machineId} repairs are successful. Status restored to Available.`,
    type: "service_request",
    read: false,
    machineId: task.machineId
  });

  state.aiWorkflowOrchestration.log.unshift(
    `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: Completed task ${taskId} on machine ${task.machineId}. Operations restored.`
  );

  res.json({ success: true, task, state });
});

// Simulated Intelligent Orchestrator AI Routine - auto audits store state and registers auto repairs
app.post("/api/simulate/orchestrator-audit", (req, res) => {
  const timestamp = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let actionsTaken: string[] = [];

  // Check 1: Malfunctioning machines with no diagnostic task
  state.machines.forEach(m => {
    if (m.status === "malfunctioning") {
      const activeTask = state.maintenanceTasks.find(t => t.machineId === m.id && t.status !== "completed");
      if (!activeTask) {
        const tId = "M-" + (300 + state.maintenanceTasks.length + 1);
        state.maintenanceTasks.unshift({
          id: tId,
          machineId: m.id,
          machineName: m.name,
          assignedTechnician: "SmartMat AI-Automated Robot Dispatch",
          taskDescription: `Autonomous audit detected malfunction without assigned repair: (${m.malfunctionReason}). Run hardware diagnostic.`,
          scheduledDate: `${new Date().toISOString().split('T')[0]} (Immediate API Dispatch)`,
          status: "scheduled",
          priority: "high"
        });
        
        actionsTaken.push(`Created auto-diagnostic repair task ${tId} for malfunctioning ${m.id}.`);
        
        state.notifications.unshift({
          id: "N-" + Math.floor(Math.random() * 10000),
          timestamp,
          title: "AI Auto-Sentry Trigger",
          message: `Work Order Orchestrated for ${m.id} under immediate protocol standard. Work Order: ${tId}.`,
          type: "service_request",
          read: false,
          machineId: m.id
        });
      }
    }
  });

  // Check 2: High usage cycles warnings
  state.machines.forEach(m => {
    if (m.usageCount > 150 && m.status === "available") {
      // Proactive preventative check
      const proactiveTask = state.maintenanceTasks.find(t => t.machineId === m.id && t.status !== "completed");
      if (!proactiveTask) {
        const tId = "M-" + (300 + state.maintenanceTasks.length + 1);
        state.maintenanceTasks.push({
          id: tId,
          machineId: m.id,
          machineName: m.name,
          assignedTechnician: "Marcus Vance (Electro-Mech Specialist)",
          taskDescription: `Preventative Maintenance: Machine has run ${m.usageCount} lifetimes. Inspect motor belt wear and debris traps.`,
          scheduledDate: `${new Date().toISOString().split('T')[0]} (Next slot)`,
          status: "scheduled",
          priority: "low"
        });
        actionsTaken.push(`Triggered preventative maintenance work-order ${tId} for heavily-used ${m.id} (${m.usageCount} cycles).`);
      }
    }
  });

  state.aiWorkflowOrchestration.lastWorkflowRun = timestamp;
  state.aiWorkflowOrchestration.nextAutomatedCheck = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (actionsTaken.length === 0) {
    actionsTaken.push("System audit run: All diagnostic indices are within safe ranges. Underwear load optimization nominal.");
  }

  actionsTaken.forEach(act => {
    state.aiWorkflowOrchestration.log.unshift(`${timeStr} [AUTO-ENGINE] ${act}`);
  });

  res.json({
    success: true,
    actions: actionsTaken,
    state
  });
});

// GEMINI AI INTEGRATION
app.post("/api/ai/ask", async (req, res) => {
  const { question, role } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Missing inquiry request prompt." });
  }

  // Pre-summarize statistics to feed as grounding context to Gemini
  const totalRev = state.transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const activeBookings = state.bookings.length;
  const runningMachines = state.machines.filter(m => m.status === "running").length;
  const malfCount = state.machines.filter(m => m.status === "malfunctioning").length;
  const totalClients = state.loyaltyProfiles.length;

  const currentLaundromatContext = {
    locationTime: new Date().toISOString(),
    storeStats: {
      totalSimulatedRevenue: `$${totalRev.toFixed(2)}`,
      runningMachines,
      activeBookings,
      malfunctioningEquipmentCount: malfCount,
      registeredLoyaltyMembers: totalClients,
    },
    machines: state.machines.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      status: m.status,
      cycle: m.cycleType,
      minsLeft: m.remainingMinutes,
      efficiencyFactor: m.efficiencyFactor,
      usageCount: m.usageCount,
      notes: m.maintenanceNotes,
      malReason: m.malfunctionReason
    })),
    recentTransactions: state.transactions.slice(0, 5),
    upcomingRepairs: state.maintenanceTasks.filter(t => t.status !== "completed"),
    activeNotifications: state.notifications.slice(0, 5),
    orchestrationLogs: state.aiWorkflowOrchestration.log.slice(0, 5)
  };

  const systemInstruction = `
    You are the ProClean SmartMat AI Assistant — an integrated intelligent operations broker, workflow orchestrator, and automated advisor for self-service laundry facilities.
    You assist employees, store owners, and managers in evaluating and executing daily laundromat operations.
    
    You have direct, real-time access to the store's current technical and financial telemetry state:
    - Laundry Machines (washer configurations, remaining cycle diagnostics, malfunction registers).
    - Customer Loyalty database (loyalty points, VIP tiers, discounts, secure user wallet metrics).
    - Gateway Revenue logs (checkout flows, transactions, topups).
    - Maintenance Workflows (dispatched technicians, pending repairs, preventative maintenance cues).
    
    Guidance when replying:
    - Answer questions accurately using the provided telemetry JSON context.
    - Be collaborative, highly analytical, and business-focused.
    - Point out specific machines that are malfunctioning or need preventative inspection (e.g., efficiency factor < 85% or usage counts > 150 cycles).
    - Use Markdown for elegant presentation (bold text, scannable bulletins, simple data tables).
    - If requested or appropriate, provide clever solutions to increase laundromat profit, optimize schedules during high-usage hours, or orchestrate custom maintenance task flows!
    - Refrain from disclosing structural database technical details or JSON system properties; keep the metrics phrased in practical operator terms.
  `;

  const clientPrompt = `
    Laundromat Store State Context:
    ${JSON.stringify(currentLaundromatContext, null, 2)}
    
    Manager/User Question: "${question}"
    Role: ${role || "Store Operator"}
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: clientPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "I apologize, but my core reasoning system returned an empty analysis block. Please query again or verify sensor connections.";
      res.json({ answer: responseText });
    } catch (err: any) {
      console.error("Gemini invocation failed, returning friendly mock fallback:", err);
      // Fallback response in case API limit was reached or key is inactive
      res.json({
        answer: generateMockAIResponse(question, state)
      });
    }
  } else {
    // Generate helpful, smart in-memory fallback analysis
    res.json({
      answer: generateMockAIResponse(question, state)
    });
  }
});

function generateMockAIResponse(question: string, s: typeof state) : string {
  const qLower = question.toLowerCase();
  
  if (qLower.includes("revenue") || qLower.includes("sales") || qLower.includes("track") || qLower.includes("money")) {
    const total = s.transactions.reduce((acc, t) => acc + t.amount, 0);
    const regularWash = s.transactions.filter(t => t.type === 'wash_dry').length;
    const topup = s.transactions.filter(t => t.type === 'wallet_topup').length;
    return `### 📊 Real-Time Revenue Analysis
*   **Total Operations Turnout:** **$${total.toFixed(2)}** in transactional velocity.
*   **Active Subscriptions:** ${s.loyaltyProfiles.length} loyalty members registered.
*   **Core Segments:**
    *   **Wash/Dry Service Sales:** ${regularWash} processed payments.
    *   **Secure Loyalty Wallet Top-ups:** ${topup} prepaid transactions.

**AI Optimizer Proposal**: Occupancy levels peak between 4 PM and 8 PM. We propose executing an **Off-Peak Smart Discount (10% off)** between 8 AM and 11 AM, programmatically targeted via our Loyalty Network to redistribute high-volume load. This would reduce wait queues and maximize equipment duty cycles!`;
  }
  
  if (qLower.includes("malfunction") || qLower.includes("down") || qLower.includes("maintenance") || qLower.includes("repair") || qLower.includes("broken") || qLower.includes("washer")) {
    const malf = s.machines.filter(m => m.status === "malfunctioning");
    const activeTasks = s.maintenanceTasks.filter(t => t.status !== "completed");
    
    let resMsg = `### 🔧 Maintenance & Machinery Status Dispatch
*   **Total Flagged Equipment:** **${malf.length}** active malfunctions detected.
*   **Orchestration Tasks Outstanding:** **${activeTasks.length}** open work-orders.

#### Active Issues Log:
`;
    if (malf.length > 0) {
      malf.forEach(m => {
        resMsg += `*   ⚠️ **Machine ${m.id} (${m.name})**: malfunctioning due to **"${m.malfunctionReason || "centrifugal out-of-balance"}"**. Emergency shutdown is operational.\n`;
      });
    } else {
      resMsg += `*   ✅ No high-priority equipment faults registered in current cycle telemetry.\n`;
    }

    resMsg += `\n**Automation Response**: The Intelligent Automation System verified that Marcus Vance is currently on-site diagnosing **Washer W4** under emergency dispatch code **M-301**. Proactive alerts have been piped directly to users booking sessions to relocate load.`;
    return resMsg;
  }
  
  if (qLower.includes("loyalty") || qLower.includes("customer") || qLower.includes("discount") || qLower.includes("vip")) {
    const list = s.loyaltyProfiles.map(u => `*   **${u.name}** (${u.discountTier} - ${Math.round(u.discountRate * 100)}% discount, **${u.points} pts**, Wallet: $${u.balance.toFixed(2)})`).join("\n");
    return `### 🎖️ Loyalty Program & VIP Dashboard
The loyalty roster counts **${s.loyaltyProfiles.length} interactive accounts**.

#### Roster Activity metrics:
${list}

**AI Automation Recommendation**: Awarding **150 extra points** automatically to customers whose cycles are delayed by scheduled repair dispatches significantly boosts customer retention metrics by **84%**. I can auto-apply this rebate when a tech schedules maintenance on active cycles.`;
  }

  return `### 🤖 SmartMat AI Business Copilot
I have reviewed your self-service laundromat parameters. Here is the operational digest as of **${new Date().toLocaleDateString('en-US')}**:

1.  **Work-Force Optimization:** 1 machine (**Washer W4**) is flagged as **malfunctioning**. Technician **Marcus Vance** is active on task **M-301**. Dryer **D3** is safely parked for scheduled gas resistance coil diagnostics.
2.  **Telemetry Statistics:** ${s.machines.filter(m => m.status === "running").length} cycle runs active. Remaining capacity is optimal.
3.  **Real-Time Alerts:** Live cycle tracking is relaying automatic text-alerts directly to mobile devices (e.g., Sarah Jenkins was fully notified of Washer W3 cycle completion).

*How else can I coordinate your system automation, dynamic pricing, or technician dispatches?*`;
}

// Vite integration middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server linked to Express.");
  } else {
    // Serve static frontend files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartMat Full-Stack App listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
