import React, { useState } from "react";
import { 
  LaundromatState, 
  Machine, 
  MaintenanceTask 
} from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  Wrench, 
  DollarSign, 
  Play, 
  AlertOctagon, 
  Server, 
  Activity, 
  Clock, 
  FileCheck, 
  Cpu, 
  ShieldAlert, 
  XCircle,
  HelpCircle,
  CheckCircle,
  UserCheck
} from "lucide-react";
import { 
  updateMachine, 
  scheduleMaintenance, 
  completeMaintenance, 
  triggerOrchestratorAudit,
  updatePricingRules,
  triggerPredictiveMaintenance,
  pushServerState
} from "../api";
import { 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  pushStateToFirestore, 
  pullStateFromFirestore 
} from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface ManagerDashboardProps {
  state: LaundromatState;
  onRefresh: () => void;
}

export default function ManagerDashboard({ state, onRefresh }: ManagerDashboardProps) {
  // Simulator inputs
  const [injectMachineId, setInjectMachineId] = useState("W1");
  const [injectReason, setInjectReason] = useState("Excessive vibration detected on drum rotational bearing.");
  
  // New Manual Task Dispatch form
  const [manualMachineId, setManualMachineId] = useState("W1");
  const [techName, setTechName] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<'low' | 'medium' | 'high'>("medium");
  const [dispatchSuccess, setDispatchSuccess] = useState("");

  // Orchestrator audit log loading state
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditLogText, setAuditLogText] = useState<string[]>([]);

  // Simulated Pricing dials matching state.pricingRules values
  const rules = state.pricingRules || {
    peakMultiplier: 1.25,
    offPeakDiscountRate: 0.20,
    simulatedHour: 10,
    simulatedDay: "Wednesday"
  };

  const [simHour, setSimHour] = useState(rules.simulatedHour);
  const [simDay, setSimDay] = useState(rules.simulatedDay);
  const [pMult, setPMult] = useState(rules.peakMultiplier);
  const [opRate, setOpRate] = useState(rules.offPeakDiscountRate);
  const [pricingSaving, setPricingSaving] = useState(false);

  // Predictive Sentry scan logging state
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanInProgress, setScanInProgress] = useState(false);

  // --- FIREBASE DYNAMIC STATE HOOKS ---
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [fbSyncing, setFbSyncing] = useState(false);
  const [fbPulling, setFbPulling] = useState(false);
  const [fbLogs, setFbLogs] = useState<string[]>(["[Firebase Core Configured] System connected via zero-trust. us-west1 region operational."]);

  const addFbLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setFbLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      if (user) {
        addFbLog(`Secure user session verified: ${user.email}`);
      } else {
        addFbLog("No active user session found. Standing by in read-only mode.");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFbLogin = async () => {
    try {
      addFbLog("Prompting secure login credentials check...");
      const user = await signInWithGoogle();
      addFbLog(`Login clearance validated. Session key opened for ${user.email}`);
    } catch (err: any) {
      addFbLog(`Access denied: ${err.message}`);
    }
  };

  const handleFbLogout = async () => {
    try {
      await logoutUser();
      addFbLog(`User session ended. Terminated security clearance state.`);
    } catch (err: any) {
      addFbLog(`Log out routine threw error: ${err.message}`);
    }
  };

  const handleFbPush = async () => {
    if (!fbUser) {
      alert("Credentials Deficit: You must securely authenticate using Google Sign-In to possess write authorization privileges under our active security policies.");
      return;
    }
    setFbSyncing(true);
    addFbLog("Evaluating database schema invariants... Initiating secure collection writes.");
    try {
      await pushStateToFirestore(state);
      addFbLog("WRITE ENFORCE: Multi-collection synchronization complete! State securely stored in cloud Firestore.");
      alert("SmartMat Operations State successfully saved to Firebase Firestore!");
    } catch (err: any) {
      addFbLog(`DATABASE DENIAL: Operation blocked by access control rule ruleset: ${err.message}`);
      alert(`Firestore Write Error: ${err.message}`);
    } finally {
      setFbSyncing(false);
    }
  };

  const handleFbPull = async () => {
    if (!fbUser) {
      alert("Credentials Deficit: You must securely authenticate using Google Sign-In to load protected customer and transaction ledger indices.");
      return;
    }
    setFbPulling(true);
    addFbLog("Acquiring collection tokens... Synchronizing documents.");
    try {
      const restored = await pullStateFromFirestore();
      if (!restored) {
        addFbLog("Zero records found. Safe fallback maintained; please execute a state seed push first.");
        alert("Firestore holds no records yet. Push your local state first to save dynamic models!");
        return;
      }
      
      const updated = await pushServerState(restored as any);
      addFbLog("READ ENFORCE: Full operational parameters restored from Firestore cloud documents successfully.");
      onRefresh();
      alert("Operational state loaded from Firebase Firestore database successfully!");
    } catch (err: any) {
      addFbLog(`DATABASE DENIAL: Operation blocked by access control ruleset: ${err.message}`);
      alert(`Firestore Query Error: ${err.message}`);
    } finally {
      setFbPulling(false);
    }
  };

  // Sync internal dials with backend state on loads
  React.useEffect(() => {
    if (state.pricingRules) {
      setSimHour(state.pricingRules.simulatedHour);
      setSimDay(state.pricingRules.simulatedDay);
      setPMult(state.pricingRules.peakMultiplier);
      setOpRate(state.pricingRules.offPeakDiscountRate);
    }
  }, [state.pricingRules]);

  const handleUpdatePricing = async () => {
    setPricingSaving(true);
    try {
      const result = await updatePricingRules({
        simulatedHour: Number(simHour),
        simulatedDay: String(simDay),
        peakMultiplier: Number(pMult),
        offPeakDiscountRate: Number(opRate)
      });
      if (result.success) {
        onRefresh();
        alert("Success! Re-orchestrated all machinery and terminal scheduling discount modifiers to align with the new pricing structures.");
      }
    } catch (err: any) {
      alert(err.message || "Pricing recalculation failed.");
    } finally {
      setPricingSaving(false);
    }
  };

  const handlePredictiveScan = async () => {
    setScanInProgress(true);
    setScanLogs([]);
    try {
      const result = await triggerPredictiveMaintenance();
      if (result.success) {
        setScanLogs(result.predictions);
        onRefresh();
      }
    } catch (err: any) {
      setScanLogs(["Diagnostic telemetry sensor check timed out."]);
    } finally {
      setScanInProgress(false);
    }
  };

  // Calculate high-impact real-time metrics
  const totalRevenue = state.transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const totalDiscountsGiven = state.transactions.reduce((acc, tx) => acc + tx.discount, 0);
  const runningCount = state.machines.filter(m => m.status === "running").length;
  const malfCount = state.machines.filter(m => m.status === "malfunctioning").length;
  const maintenanceCount = state.machines.filter(m => m.status === "maintenance").length;

  const handleInjectFault = async () => {
    try {
      const updatedState = await updateMachine({
        id: injectMachineId,
        status: "malfunctioning",
        reason: injectReason || "Inductive sensor thermal overload safety lockup.",
      });
      onRefresh();
      alert(`⚠️ Simulated Fault injected success! AI Workorder Auto-Sentry dispatched task to repair ${injectMachineId} immediately.`);
    } catch (err: any) {
      alert(err.message || "Failed to inject malfunction");
    }
  };

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchSuccess("");
    if (!techName || !repairDescription) {
      alert("Name and description are required.");
      return;
    }

    try {
      const response = await scheduleMaintenance({
        machineId: manualMachineId,
        technician: techName,
        description: repairDescription,
        scheduledDate: "Next Available Slot (Priority Express)",
        priority: priorityLevel,
      });

      if (response.success) {
        setDispatchSuccess(`Authorized! Dispatched Tech ${techName} on repair ${response.task.id}.`);
        setTechName("");
        setRepairDescription("");
        onRefresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to schedule manual maintenance dispatch");
    }
  };

  const handleTaskFulfill = async (taskId: string) => {
    if (!window.confirm("Complete repair checkout? This restores the machine to 'available' and re-calibrates motor telemetry metrics.")) {
      return;
    }

    try {
      const result = await completeMaintenance(taskId, "Hardware recalibration complete. Sensor logs reset to zero faults.");
      if (result.success) {
        alert(`Cleared work-order ${taskId}! Machinery returned online.`);
        onRefresh();
      }
    } catch (err: any) {
      alert(err.message || "Completion routine failed.");
    }
  };

  const runActiveAudit = async () => {
    setAuditRunning(true);
    setAuditLogText([]);
    try {
      const result = await triggerOrchestratorAudit();
      setAuditLogText(result.actions);
      onRefresh();
    } catch (err: any) {
      setAuditLogText(["Audit aborted: API connection timeout."]);
    } finally {
      setAuditRunning(false);
    }
  };

  // Compile transaction data for visual analytics charts
  const chartData = state.transactions.map((tx, idx) => ({
    name: tx.machineId || `Top-up #${idx+1}`,
    amount: tx.amount,
    discount: tx.discount,
  })).reverse();

  // Machine usage count datasets for bar charts
  const usageData = state.machines.map(m => ({
    name: m.id,
    cycles: m.usageCount,
    efficiency: m.efficiencyFactor,
  }));

  return (
    <div id="manager_dashboard_view" className="space-y-6">
      
      {/* KPI HIGHLIGHT CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block uppercase">Total Revenue</span>
            <span className="text-xl font-bold text-slate-800 font-mono">${totalRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Discounts given: ${totalDiscountsGiven.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block uppercase">Operating Occupancy</span>
            <span className="text-xl font-bold text-slate-800">
              {runningCount} <span className="text-xs text-slate-500">/ {state.machines.length} active</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{Math.round((runningCount / state.machines.length) * 100)}% active duty cycles</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ShieldAlert className="w-6 h-6 text-rose-600 animate-bounce" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block uppercase">equipment Downtime</span>
            <span className="text-xl font-bold text-rose-600 font-mono">
              {malfCount} <span className="text-xs text-slate-500">malfunctions</span>
            </span>
            <span className="text-[10px] text-rose-500 font-medium block mt-0.5">Urgent Tech dispatches: {state.maintenanceTasks.filter(t => t.status !== "completed" && t.priority === "high").length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block uppercase">Scheduled Diagnostics</span>
            <span className="text-xl font-bold text-slate-800">
              {maintenanceCount} <span className="text-xs text-slate-500">machines</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{state.maintenanceTasks.filter(t => t.status === "scheduled").length} tasks pending check</span>
          </div>
        </div>

      </div>

      {/* INTELLIGENT DYNAMIC PRICING & PREDICTIVE SENTRY COCKPIT */}
      <div id="pricing_maintenance_cockpit" className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl relative overflow-hidden shadow-lg animate-fade-in">
        
        {/* Left column: Dynamic Pricing Controller */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <DollarSign className="w-5 h-5 text-indigo-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Dynamic Pricing Controller & Simulator <span className="bg-indigo-600 text-white text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold animate-pulse">Live</span>
              </h3>
              <p className="text-[11px] text-slate-400">Tweak peak hour multipliers and off-peak rewards to maximize store revenue index.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Simulated Time Index:</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0" 
                  max="23" 
                  value={simHour} 
                  onChange={(e) => setSimHour(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-indigo-400 font-semibold text-xs shrink-0 min-w-[75px] text-center">
                  {simHour === 0 ? "12:00 AM" : simHour === 12 ? "12:00 PM" : simHour > 12 ? `${simHour - 12}:00 PM` : `${simHour}:00 AM`}
                </span>
              </div>
              <span className="text-[10px] text-indigo-300 font-medium block">
                {simHour >= 16 && simHour <= 20 ? "🔥 Surge Peak Hours Active (+25%)" : simHour >= 6 && simHour <= 11 ? "🍃 Eco Off-Peak Saving Active (-20%)" : "Standard Rate Periods"}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Simulated Weekday:</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={simDay}
                onChange={(e) => setSimDay(e.target.value)}
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                  <option key={day} value={day} className="bg-slate-900">{day} {day === "Saturday" || day === "Sunday" ? "🎰 (Weekend Rate)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Peak Surge Multiplier:</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={pMult}
                onChange={(e) => setPMult(Number(e.target.value))}
              >
                <option value={1.15} className="bg-slate-900">1.15x Surge (+15%)</option>
                <option value={1.20} className="bg-slate-900">1.20x Surge (+20%)</option>
                <option value={1.25} className="bg-slate-900">1.25x Surge (+25%)</option>
                <option value={1.30} className="bg-slate-900">1.30x Surge (+30%)</option>
                <option value={1.40} className="bg-slate-900">1.40x Surge (+40%)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Off-Peak Discount Factor:</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 px-2 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={opRate}
                onChange={(e) => setOpRate(Number(e.target.value))}
              >
                <option value={0.10} className="bg-slate-900">10% Off Savings</option>
                <option value={0.15} className="bg-slate-900">15% Off Savings</option>
                <option value={0.20} className="bg-slate-900">20% Off Savings</option>
                <option value={0.25} className="bg-slate-900">25% Off Savings</option>
                <option value={0.30} className="bg-slate-900">30% Off Savings</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={pricingSaving}
            onClick={handleUpdatePricing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-white" /> {pricingSaving ? "Recalibrating store metrics..." : "Commit Dynamic Pricing Adjustments"}
          </button>
        </div>

        {/* Right column: AI Predictive Diagnostics */}
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 pt-5 md:pt-0 md:pl-6">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Cpu className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Predictive Maintenance Sentry <span className="bg-amber-500 text-slate-950 text-[9px] uppercase px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">Heuristic Model</span>
              </h3>
              <p className="text-[11px] text-slate-400">Evaluate telemetry, heat indexes, and usage volumes to preempt malfunctions.</p>
            </div>
          </div>

          {/* Real-time calculated risk meters for all machinery */}
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            {state.machines.map(m => {
              // Risk calculations: depends on lifetime usage count and efficiency factor
              const runRatio = m.usageCount > 100 ? 55 : m.usageCount > 50 ? 30 : 10;
              const calcRisk = Math.min(95, Math.round((100 - m.efficiencyFactor) + runRatio));
              const isDanger = calcRisk >= 55;

              return (
                <div key={m.id} className="bg-slate-850 p-2 rounded-lg border border-slate-800 text-center space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                    <span className="text-slate-300">{m.id}</span>
                    <span className={isDanger ? "text-rose-400 animate-pulse" : "text-emerald-400"}>{100 - calcRisk}% Hlh</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${isDanger ? 'bg-rose-500' : calcRisk > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${100 - calcRisk}%` }}
                    />
                  </div>
                  <span className={`block text-[8px] tracking-wide font-mono ${isDanger ? "text-rose-400 font-extrabold" : "text-slate-500 font-medium"}`}>
                    {isDanger ? "⚠️ WARNING" : "OPTIMAL"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={scanInProgress}
              onClick={handlePredictiveScan}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2 px-4 rounded-xl text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-slate-950 animate-pulse" /> {scanInProgress ? "Querying temperature profiles..." : "Execute AI Predictive Diagnostics Scan"}
            </button>

            {scanLogs.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-[10px] font-mono text-slate-300 space-y-1 max-h-[80px] overflow-y-auto leading-normal">
                <span className="text-amber-400 font-bold block">🚨 TELEMETRY PREDICTIONS SCAN COMPLETE:</span>
                {scanLogs.map((log, index) => (
                  <p key={index} className="flex gap-1 items-start text-slate-350">
                    <span className="text-amber-400 shrink-0">↳</span> <span>{log}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTRAL VISUAL CHARTS AND SYSTEM SIMULATION ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* REVENUE & USAGE ANALYTICS CHART PANEL */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Store Usage & Revenue Patterns
              </h3>
              <p className="text-xs text-slate-400">Analytic values generated periodically based on secure user transactions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* REVENUE LINE CHART */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 block uppercase">Transactional Velocity ($ USD)</span>
              <div className="h-48">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">No active payments ledgered.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={9} stroke="#a1a1aa" />
                      <YAxis fontSize={9} stroke="#a1a1aa" />
                      <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} labelStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* MACHINE LIFETIME USE CYCLES CHART */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 block uppercase">Equipment Lifetime Cycles (Usage Index)</span>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={9} stroke="#a1a1aa" />
                    <YAxis fontSize={9} stroke="#a1a1aa" />
                    <Tooltip formatter={(value) => [value, "Cycles Run"]} />
                    <Bar dataKey="cycles" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ACTIVE SYSTEM COGNITIVE DIAGNOSIS LAB */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Cpu className="w-4 h-4 text-indigo-500 animate-spin" strokeWidth={2.5} /> Sentry Autonomous Audit Orchestrator
              </h4>
              <p className="text-slate-550 text-[11px]">Directs in-memory machine telemetry, self-dispatches technician routes is active. Run a swift automation audit now.</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                disabled={auditRunning}
                onClick={runActiveAudit}
                className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Server className="w-3.5 h-3.5" /> {auditRunning ? "Auditing Indices..." : "Trigger AI State Audit"}
              </button>
            </div>
          </div>

          {auditLogText.length > 0 && (
            <div className="p-3 bg-slate-900 text-slate-200 border rounded-xl font-mono text-[10px] space-y-1">
              <span className="text-emerald-400 block font-bold">PROCLEAN AUTOMATION TELEMETRY AUDIT REPORT:</span>
              {auditLogText.map((act, lidx) => (
                <p key={lidx}>&gt; {act}</p>
              ))}
            </div>
          )}

        </div>

        {/* MALFUNCTION INJECTOR LABORATORY SENSORS PANEL */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
            <AlertOctagon className="w-5 h-5 text-rose-500" /> Telemetry Fail Simulation
          </h3>
          <p className="text-slate-500 text-xs mt-1">Inject dynamic hardware failures on washers or dryers to test physical warning flags, automated technican matching, and immediate notifications.</p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Target Machinery ID:</label>
              <select
                id="injector_machine_select"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-450 text-slate-700 font-medium"
                value={injectMachineId}
                onChange={(e) => setInjectMachineId(e.target.value)}
              >
                {state.machines.map(m => (
                  <option key={m.id} value={m.id}>{m.id}: {m.name} ({m.status})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Simulated Malfunction Reason:</label>
              <select
                id="injector_reason_select"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-450 text-slate-700"
                value={injectReason}
                onChange={(e) => setInjectReason(e.target.value)}
              >
                <option value="Severe centrifugal rotational weight imbalance (safety clutch locked at 1200RPM).">Severe drum imbalance</option>
                <option value="Thermal thermistor reading exceed critical threshold limits (98°C reached).">Thermal thermistor overload</option>
                <option value="Drain valve solenoid electrical failure, water level remains high.">Drain valve pump block</option>
                <option value="Main gas regulator line pressure deficit detected during pilot trigger.">Gas pressure supply lock</option>
              </select>
            </div>

            <button
              onClick={handleInjectFault}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-white" /> Trigger Equipment Fault Code!
            </button>
          </div>

          {/* ACTIVE DISPATCH NEW WORK ORDER FORM */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1 pt-2">
              <UserCheck className="w-4 h-4 text-blue-600" /> Manual Work-Order Dispatcher
            </h4>
            
            <form onSubmit={handleManualDispatch} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Machine</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700"
                    value={manualMachineId}
                    onChange={(e) => setManualMachineId(e.target.value)}
                  >
                    {state.machines.map(m => (
                      <option key={m.id} value={m.id}>{m.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Priority</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
                    value={priorityLevel}
                    onChange={(e) => setPriorityLevel(e.target.value as any)}
                  >
                    <option value="low">Low (Routine)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Technician (e.g. Sarah Connor)"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none text-slate-705"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                />
              </div>

              <div>
                <textarea
                  required
                  placeholder="Troubleshoot steps (e.g. inspect gas valve)..."
                  rows={2}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none text-slate-705"
                  value={repairDescription}
                  onChange={(e) => setRepairDescription(e.target.value)}
                />
              </div>

              {dispatchSuccess && (
                <div className="bg-blue-50 text-blue-800 text-xs p-2 rounded-lg border border-blue-100">
                  {dispatchSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors"
              >
                Dispatch Work-Order
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* DISPATCH AND TECHNICIAN TRACKER ELEMENT */}
      <div id="technician_tracking_terminal" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
          <Wrench className="w-5 h-5 text-indigo-500" /> Active Service Orders & Machinery Dispatches
        </h3>

        {state.maintenanceTasks.filter(t => t.status !== "completed").length === 0 ? (
          <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-400 text-xs">
            No active dispatched service work orders listed. Store machinery is executing beautifully.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Task ID</th>
                  <th className="py-2.5 px-3">Target Machinery</th>
                  <th className="py-2.5 px-3">Assigned Tech Specialist</th>
                  <th className="py-2.5 px-3">Diagnose Action Brief</th>
                  <th className="py-2.5 px-3">Date/ETAs</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 text-right">Interactive Fulfill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.maintenanceTasks.filter(t => t.status !== "completed").map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/40">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{t.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-850">{t.machineId}</td>
                    <td className="py-3 px-3 text-slate-700">{t.assignedTechnician}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={t.taskDescription}>{t.taskDescription}</td>
                    <td className="py-3 px-3 text-slate-550">{t.scheduledDate}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.priority === "high" ? "bg-rose-100 text-rose-800" :
                        t.priority === "medium" ? "bg-amber-100 text-amber-800" :
                        "bg-slate-100 text-slate-650"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleTaskFulfill(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wide py-1 px-3 rounded-lg text-[10.5px] transition-colors"
                      >
                        Complete Repairs (Checkout)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FIREBASE STATE TELEMETRY COCKPIT */}
      <div id="firebase_sync_cockpit" className="bg-slate-900 border border-indigo-950 text-white p-6 rounded-2xl relative overflow-hidden shadow-lg space-y-4 animate-fade-in">
        
        {/* Title row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Server className="w-5.5 h-5.5 text-indigo-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Firebase Firestore Realtime Telemetry Bridge
                <span className="bg-indigo-650/45 text-indigo-300 border border-indigo-500/20 text-[9px] uppercase px-2 py-0.5 rounded-full font-extrabold tracking-widest font-mono">
                  Cloud Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Synchronize transactional ledgers, active bookings, machine statuses, and loyalty rosters securely to Firestore collections.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-mono bg-indigo-950/50 border border-indigo-900/40 px-3 py-1.5 rounded-xl text-indigo-350 shrink-0">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping inline-block shrink-0" />
            <span>PROJECT: gen-lang-client-0659050457 (us-west1)</span>
          </div>
        </div>

        {/* Auth status & actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-indigo-950/20 p-4 rounded-xl border border-indigo-900/30">
          
          <div className="lg:col-span-4 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block font-mono">Authentication Access Control</span>
            {fbUser ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" /> {fbUser.displayName || "Manager Session"}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[8px] uppercase px-1.5 py-0.2 rounded-md font-bold">
                    Cleared
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-mono truncate">{fbUser.email}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-350 block">Signed out (Read-Only Security Fence)</span>
                <p className="text-[10.5px] text-slate-500">Sign in with Google is required to acquire Firestore write/update permission clearance.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-wrap gap-2 justify-start lg:justify-end">
            {fbUser ? (
              <button
                onClick={handleFbLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs tracking-wide transition-all border border-slate-700 active:scale-95 cursor-pointer"
              >
                Sign Out Operator
              </button>
            ) : (
              <button
                onClick={handleFbLogin}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2 px-4 rounded-xl text-xs tracking-wide transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-white" /> Sign in with Google (Firebase Auth)
              </button>
            )}

            <button
              disabled={fbSyncing || !fbUser}
              onClick={handleFbPush}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wide transition-all active:scale-95 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
            >
              {fbSyncing ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-white" />
              )}
              {fbSyncing ? "Syncing..." : "Push State to Firestore"}
            </button>

            <button
              disabled={fbPulling || !fbUser}
              onClick={handleFbPull}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold py-2 px-4 rounded-xl text-xs tracking-wide transition-all active:scale-95 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
            >
              {fbPulling ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Server className="w-4 h-4 text-slate-950" />
              )}
              {fbPulling ? "Acquiring..." : "Restore State from Firestore"}
            </button>
          </div>

        </div>

        {/* Diagnostic logs console */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block font-mono">Zero-Trust Telemetry Logs Console</label>
          <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-[11px] font-mono text-slate-300 space-y-1 max-h-[120px] overflow-y-auto leading-normal">
            {fbLogs.map((log, index) => (
              <p key={index} className="flex gap-2 items-start">
                <span className="text-indigo-400 shrink-0 font-bold">↳</span>
                <span className="text-slate-350">{log}</span>
              </p>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
