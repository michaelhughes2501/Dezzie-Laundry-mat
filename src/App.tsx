import React, { useState, useEffect } from "react";
import { LaundromatState, SystemNotification } from "./types";
import { getState, resetState } from "./api";
import CustomerPortal from "./components/CustomerPortal";
import ManagerDashboard from "./components/ManagerDashboard";
import AICopilot from "./components/AICopilot";
import { 
  Sparkles, 
  Smartphone, 
  Wrench, 
  Cpu, 
  MessageSquare, 
  RefreshCw, 
  Activity, 
  BellRing, 
  DollarSign, 
  AlertOctagon, 
  Undo2,
  Lock
} from "lucide-react";

export default function App() {
  const [appState, setAppState] = useState<LaundromatState | null>(null);
  const [activeTab, setActiveTab] = useState<"customer" | "manager" | "ai_copilot">("customer");
  const [loading, setLoading] = useState(true);
  
  // Local notification alerts toast
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [seenNotifications, setSeenNotifications] = useState<Set<string>>(new Set());

  // Handle periodic telemetry sync
  const syncTelemetryData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getState();
      setAppState(data);

      // Check if there are any new unread notifications to fly in as an automated toast
      if (data.notifications.length > 0) {
        const latestInfo = data.notifications[0];
        // If it's a new unread notification that we haven't popped up yet
        if (!seenNotifications.has(latestInfo.id) && !latestInfo.read) {
          setActiveToast(latestInfo);
          setSeenNotifications(prev => {
            const next = new Set(prev);
            next.add(latestInfo.id);
            return next;
          });
          
          // Simulated beep audio alert
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            // Adjust vibration tone based on alert type
            if (latestInfo.type === 'malfunction') {
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(180, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            } else {
              osc.type = 'sine';
              osc.frequency.setValueAtTime(800, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
              gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            }
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch (_) {
            // Audio context not allowed or supported yet (safe ignore)
          }

          // Auto close toast after 5s
          setTimeout(() => {
            setActiveToast(null);
          }, 6000);
        }
      }
    } catch (err) {
      console.error("Telemetry link sync failed:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    syncTelemetryData(true);

    // Dynamic background telemetry polling (sync operational logs and cycle times)
    const timer = setInterval(() => {
      syncTelemetryData(false);
    }, 7000);

    return () => clearInterval(timer);
  }, [seenNotifications]);

  const handleResetSystem = async () => {
    if (!window.confirm("Restore laundromat parameters to clean initial simulation states? All transaction logs and wallet wallets will be reset for cleaner evaluations.")) return;
    setLoading(true);
    try {
      const data = await resetState();
      setAppState(data);
      // Reset notifications set
      setSeenNotifications(new Set());
      setActiveToast(null);
      alert("Operations system reset successful!");
    } catch (err: any) {
      alert(err.message || "Failed to reset");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !appState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-lg font-bold">ProClean SmartMat System Loading...</h2>
          <p className="text-xs text-slate-400 mt-1">Establishing secure telemetry links with self-service sensor array.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-650 font-sans antialiased pb-12">
      
      {/* GLOBAL TELEMETRY SECURITY HEADER */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* BRAND AND REAL-TIME LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">ProClean <span className="text-indigo-600">SmartMat</span></h1>
                <span className="bg-indigo-50 border border-indigo-150 text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md text-indigo-700 font-mono tracking-widest flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-indigo-600" /> AI CORE LIVE
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Automated Self-Service Laundromat Operations Portal</p>
            </div>
          </div>

          {/* PERSISTENT SYSTEM STATS CHIP */}
          {appState && (
            <div id="telemetry_overall_pill" className="flex items-center gap-1.5 bg-slate-900 text-white border border-slate-800 px-4 py-1.5 rounded-full text-xs font-mono shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>Sensors Indexed: <span className="text-emerald-400 font-bold">{appState.machines.length} Units</span></span>
              <span className="text-slate-500">|</span>
              <span>Revenues Secured: <span className="text-amber-400 font-bold">${appState.transactions.reduce((acc, tx)=>acc+tx.amount, 0).toFixed(2)}</span></span>
            </div>
          )}

        </div>
      </header>

      {/* CORE CONTROL RAIL / NAVIGATION TABS */}
      <section className="bg-slate-900/5 py-4 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* TAB CHANNELS */}
          <div id="tab_navigation_bar" className="bg-white p-1 rounded-2xl border border-slate-150 shadow-sm flex gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("customer")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2.5 text-xs font-bold rounded-xl tracking-wide transition-all outline-none ${activeTab === "customer" ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Smartphone className="w-4 h-4" /> Consumer Booking Portal
            </button>
            <button
              onClick={() => setActiveTab("manager")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2.5 text-xs font-bold rounded-xl tracking-wide transition-all outline-none ${activeTab === "manager" ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Wrench className="w-4 h-4" /> Manager Operations Cockpit
            </button>
            <button
              onClick={() => setActiveTab("ai_copilot")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2.5 text-xs font-bold rounded-xl tracking-wide transition-all outline-none ${activeTab === "ai_copilot" ? 'bg-slate-900 text-indigo-300 border border-slate-800 shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Cpu className="w-4 h-4 text-indigo-500" /> AI Business Copilot
            </button>
          </div>

          {/* ACTIVE REFRESH BUTTON */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right hidden md:block">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wide">Dynamic Pulse</span>
              <span className="font-mono text-xs font-semibold text-slate-700">Sync cycle interval: every 7 seconds</span>
            </div>
            <button
              type="button"
              onClick={() => syncTelemetryData(true)}
              className="bg-white border border-slate-150 hover:border-slate-300 text-slate-705 text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Pull Telemetry
            </button>
          </div>

        </div>
      </section>

      {/* CORE WORKSPACE ENTRY VIEW WITH CONDITIONAL RENDER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {appState && (
          <div>
            
            {/* VIEWPORT CONTROLLER CONTENT */}
            {activeTab === "customer" && (
              <CustomerPortal state={appState} onRefresh={() => syncTelemetryData(false)} />
            )}

            {activeTab === "manager" && (
              <ManagerDashboard state={appState} onRefresh={() => syncTelemetryData(false)} />
            )}

            {activeTab === "ai_copilot" && (
              <AICopilot state={appState} />
            )}

          </div>
        )}

      </main>

      {/* FLOATING EMERGENCY ALERT NOTIFICATION TOAST BOX */}
      {activeToast && (
        <div 
          id="floating_alert_notification_toast" 
          className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-800 text-white rounded-2xl p-4.5 shadow-2xl max-w-sm w-full animate-bounce space-y-2.5"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activeToast.type === 'malfunction' ? 'bg-rose-500' : 'bg-indigo-400'}`} />
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">
                {activeToast.type === 'malfunction' ? '🚨 EQUIPMENT CRITICAL ALARM' : '📱 REAL-TIME MOBILE MSG'}
              </span>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white font-bold text-xs font-mono"
            >
              [X]
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-100">{activeToast.title}</h4>
            <p className="text-[11px] leading-relaxed text-slate-350">{activeToast.message}</p>
          </div>

          <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>Machine Ref: {activeToast.machineId || 'All-Nodes'}</span>
            <span>Alert timestamp: {new Date(activeToast.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS DETAIL */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-150 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
        <div className="space-y-1 text-center md:text-left">
          <p>© 2026 SmartMat Operations Suite. All telemetry keys are encrypted and secured.</p>
          <p className="text-[10px] text-slate-450 font-medium">Fully compliant with high-capacity self-service laundry operations standards.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetSystem}
            className="bg-slate-200/55 hover:bg-slate-205 border border-slate-250 hover:border-slate-300 text-slate-500 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 tracking-wide transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" /> Reset Simulation State
          </button>
          
          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg flex items-center gap-1 font-mono text-[10px] select-none font-bold">
            <Lock className="w-3.5 h-3.5 text-slate-450" /> SHARED DEPLOYMENT LOCKED
          </span>
        </div>
      </footer>

    </div>
  );
}
