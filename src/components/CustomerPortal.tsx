import React, { useState } from "react";
import { 
  LaundromatState, 
  LoyaltyProfile, 
  Machine 
} from "../types";
import { 
  CreditCard, 
  UserPlus, 
  Coins, 
  Smartphone, 
  Timer, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Ticket,
  Clock,
  Sparkles,
  RefreshCw,
  PlusCircle,
  HelpCircle
} from "lucide-react";
import { 
  processCheckout, 
  processTopup, 
  signupLoyalty, 
  bookSession 
} from "../api";

interface CustomerPortalProps {
  state: LaundromatState;
  onRefresh: () => void;
}

export default function CustomerPortal({ state, onRefresh }: CustomerPortalProps) {
  // Navigation states & subform states
  const [activeUser, setActiveUser] = useState<LoyaltyProfile>(
    state.loyaltyProfiles[0] || {
      id: "unknown",
      name: "Guest Operator",
      email: "guest@example.com",
      points: 0,
      totalVisits: 0,
      balance: 0,
      discountTier: "Bronze",
      discountRate: 0.0,
    }
  );

  // Loyalty Signup
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Top-Up Wallet
  const [topupAmount, setTopupAmount] = useState("10");
  const [topupCardHolder, setTopupCardHolder] = useState("");
  const [topupCardNum, setTopupCardNum] = useState("");
  const [topupCvv, setTopupCvv] = useState("");
  const [topupSuccess, setTopupSuccess] = useState("");
  const [topupError, setTopupError] = useState("");
  const [fundingInProgress, setFundingInProgress] = useState(false);

  // Cycle Launch & Payments
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Prepaid Wallet");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);

  // Mobile Alerts setup
  const [alertPhone, setAlertPhone] = useState("");
  const [isAlertSubscribed, setIsAlertSubscribed] = useState(false);

  // Booking details
  const [bookingMachine, setBookingMachine] = useState<Machine | null>(null);
  const [bookingTimeSlot, setBookingTimeSlot] = useState("12:00 PM");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const refreshUserContext = (newState: LaundromatState, updatedUserId: string) => {
    const updatedUser = newState.loyaltyProfiles.find(u => u.id === updatedUserId);
    if (updatedUser) {
      setActiveUser(updatedUser);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess(false);

    if (!signupName.trim() || !signupEmail.trim()) {
      setSignupError("Please provide both name and email.");
      return;
    }

    try {
      const data = await signupLoyalty(signupName, signupEmail);
      if (data.success) {
        setSignupName("");
        setSignupEmail("");
        setSignupSuccess(true);
        onRefresh();
        if (data.user) {
          setActiveUser(data.user);
        }
      }
    } catch (err: any) {
      setSignupError(err.message || "Email registration failed.");
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupError("");
    setTopupSuccess("");
    setFundingInProgress(true);

    if (!topupCardHolder || !topupCardNum || !topupCvv) {
      setTopupError("Please fill out all card gateway fields.");
      setFundingInProgress(false);
      return;
    }

    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) {
      setTopupError("Invalid transaction amount.");
      setFundingInProgress(false);
      return;
    }

    try {
      // Simulate visual security pause
      await new Promise(resolve => setTimeout(resolve, 800));
      const response = await processTopup({
        userId: activeUser.id,
        amount: amt,
        cardHolder: topupCardHolder,
        cardNumber: topupCardNum.replace(/\s+/g, ""),
        cvv: topupCvv,
      });

      if (response.success) {
        setTopupSuccess(`Success! Prepaid Balance increased to $${response.newBalance.toFixed(2)}.`);
        setTopupCardHolder("");
        setTopupCardNum("");
        setTopupCvv("");
        onRefresh();
        refreshUserContext(response.state, activeUser.id);
      }
    } catch (err: any) {
      setTopupError(err.message || "Failed to process card gate authorization.");
    } finally {
      setFundingInProgress(false);
    }
  };

  const handleLaunchCycle = async () => {
    if (!selectedMachine) return;
    setCheckoutError("");
    setCheckoutSuccess("");
    setCheckoutInProgress(true);

    const cycleStr = selectedCycle || `${selectedMachine.type === "washer" ? "Fast Cotton Hot" : "Regular Warm Tumble"}`;

    try {
      const response = await processCheckout({
        userId: activeUser.id,
        machineId: selectedMachine.id,
        selectedCycle: cycleStr,
        paymentMethod: paymentMethod,
      });

      if (response.success) {
        setCheckoutSuccess(`Verified! Launched ${selectedMachine.id}. Dynamic Loyalty point balance updated!`);
        setSelectedMachine(null);
        setSelectedCycle("");
        
        // Trigger automated browser push alert
        if (isAlertSubscribed) {
          if (Notification.permission === "granted") {
            new Notification("SmartMat Cycle Triggered", {
              body: `Launched ${selectedMachine.name}. We'll notify you under ${selectedMachine.type === "washer" ? "35" : "30"} minutes.`,
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }

        onRefresh();
        refreshUserContext(response.state, activeUser.id);
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Payment gateway processing terminated.");
    } finally {
      setCheckoutInProgress(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingMachine) return;
    setBookingSuccess("");

    try {
      const response = await bookSession(bookingMachine.id, activeUser.id, bookingTimeSlot);
      if (response.success) {
        setBookingSuccess(`Slot Secured! Booked ${bookingMachine.id} for ${bookingTimeSlot}.`);
        setBookingMachine(null);
        onRefresh();
      }
    } catch (err: any) {
      alert(err.message || "Booking failed.");
    }
  };

  const handleProfileSwitch = (profileId: string) => {
    const prof = state.loyaltyProfiles.find(p => p.id === profileId);
    if (prof) {
      setActiveUser(prof);
      setCheckoutSuccess("");
      setCheckoutError("");
      setTopupSuccess("");
      setTopupError("");
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "VIP": return "bg-purple-100 text-purple-800 border-purple-200 ring-2 ring-purple-400 font-bold";
      case "Gold": return "bg-amber-100 text-amber-800 border-amber-200 ring-1 ring-amber-300 font-semibold";
      case "Silver": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Get active cycles running under this user
  const userCycles = state.machines.filter(m => m.currentUserId === activeUser.id && (m.status === "running" || m.status === "completed"));

  return (
    <div id="customer_portal_view" className="space-y-6">
      
      {/* SECTION 1: PROFILE CORNER WITH QUICK SELECTION */}
      <div id="client_profile_badge_row" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" /> Remote SmartMat Web App
          </h2>
          <p className="text-slate-500 text-sm mt-1">Book machines, run self-service washers, and check transaction logs remotely.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Change Active Account:</label>
          <select 
            id="account_selector"
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            value={activeUser.id}
            onChange={(e) => handleProfileSwitch(e.target.value)}
          >
            {state.loyaltyProfiles.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.discountTier})</option>
            ))}
          </select>
          <button 
            id="trigger_state_refresh"
            onClick={onRefresh}
            className="p-2 border border-slate-200 hover:border-indigo-300 hover:text-indigo-500 rounded-lg text-slate-500 transition-colors"
            title="Refresh System Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID FOR ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: WALLET CARD, LOYALTY CARD, MOBILE NOTIFICATION OVERVIEW */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* LOYALTY CARD CONTAINER */}
          <div id={`loyalty_card_${activeUser.id}`} className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-500/20 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
              <Ticket className="w-56 h-56 text-white" />
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-indigo-400 font-mono text-xs tracking-widest font-semibold uppercase">Customer Loyalty Rewards</span>
                <h3 className="text-2xl font-bold mt-1 tracking-tight">{activeUser.name}</h3>
                <p className="text-slate-300 text-xs font-mono mt-0.5">{activeUser.email}</p>
              </div>
              <span className={`px-2.5 py-1 text-xs border rounded-full uppercase tracking-wider ${getTierColor(activeUser.discountTier)}`}>
                {activeUser.discountTier} Tier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-indigo-400/15">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Loyalty Balance</span>
                <p className="text-2xl font-bold flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-5 h-5 text-yellow-400" /> {activeUser.points} <span className="text-xs text-indigo-300">points</span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Member Perks</span>
                <p className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> {Math.round(activeUser.discountRate * 100)}% Auto Discount
                </p>
              </div>
            </div>

            {/* Targeted Segment Promotions Card */}
            {activeUser.segment && activeUser.personalizedOffer && (
              <div id={`targeted_coupon_offer_${activeUser.id}`} className="mt-5 p-3.5 bg-indigo-500/10 border border-indigo-400/25 rounded-xl space-y-1 relative z-10">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-mono text-indigo-300 font-bold uppercase tracking-wider">
                    🎯 Group: <span className="text-pink-400 font-extrabold">{activeUser.segment.replace(/_/g, " ").toUpperCase()}</span>
                  </span>
                  <span className="bg-pink-600 text-white text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                    Code: {activeUser.personalizedOffer.discountBonusCode}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> {activeUser.personalizedOffer.title}
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">{activeUser.personalizedOffer.description}</p>
                <p className="text-[10px] text-emerald-400 font-semibold font-mono pt-0.5">
                  Benefit: Stacked +{Math.round(activeUser.personalizedOffer.extraDiscountRate * 100)}% off drying/washing booking channels!
                </p>
              </div>
            )}

            <div className="mt-4 text-center bg-white/5 border border-white/5 py-2 px-3 rounded-xl text-[11px] text-slate-300">
              🎖️ <span className="font-semibold text-white">Conversion rate:</span> Earn +10 pts per dollar + 20 standard bonus per launch cycle!
            </div>
          </div>

          {/* SECURE PREPAID CASH CARD GATEWAY */}
          <div id="prepaid_secure_wallet_component" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" /> Secure Prepaid Wallet
              </h3>
              <span className="text-emerald-500 font-mono font-bold text-lg bg-emerald-50 px-2.5 py-1 rounded-lg">
                Wallet Balance: ${activeUser.balance.toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleTopup} className="space-y-3">
              <span className="text-slate-400 text-xs block">Secured visa/debit/ACH payment processor gateway. Fully encrypted.</span>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Authorization Funding Amount ($ USD):</label>
                <div className="grid grid-cols-4 gap-2">
                  {["10", "20", "50", "100"].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTopupAmount(v)}
                      className={`py-1.5 text-xs text-center border rounded-lg font-medium transition-all ${topupAmount === v ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Cardholder Name"
                    value={topupCardHolder}
                    onChange={(e) => setTopupCardHolder(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="Card Number (XXXX XXXX XXXX XXXX)"
                    value={topupCardNum}
                    onChange={(e) => setTopupCardNum(e.target.value)}
                    className="col-span-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="CVV"
                    value={topupCvv}
                    onChange={(e) => setTopupCvv(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {topupSuccess && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{topupSuccess}</span>
                </div>
              )}
              {topupError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2 border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{topupError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={fundingInProgress}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" /> {fundingInProgress ? "Authorizing Security Node..." : `Authorize secure credit payload $${topupAmount}`}
              </button>
            </form>
          </div>

          {/* LOYAL REWARDS SIGNUP FOR NEW USERS */}
          <div id="loyalty_activation_box" className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" /> Activate New Rewards Account
            </h3>
            <p className="text-slate-500 text-xs">Unlock auto-discounts and access to the dynamic session scheduling system immediately.</p>
            
            <form onSubmit={handleSignup} className="space-y-2.5">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />

              {signupSuccess && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-2.5 rounded-lg border border-emerald-200">
                  🎉 Registration complete! $5.00 welcome bonus posted. Roster updated.
                </div>
              )}
              {signupError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-2.5 rounded-lg border border-rose-200">
                  ⚠️ {signupError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500"
              >
                Join Rewards & Secure Points
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: REAL-TIME LAUNCHPAD, ACTIVE RUNNING TIMERS, SMS NOTIFICATIONS SYSTEM */}
        <div className="lg:col-span-7 space-y-6">

          {/* ACTIVE LIVE CYCLES TIMER STATUS / MOBILE NOTIFICATIONS PANEL */}
          <div id="user_active_sessions_box" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
              <Timer className="w-5 h-5 text-indigo-500" /> Live Cycle Progress & Remote Alerts
            </h3>
            
            {userCycles.length === 0 ? (
              <div className="bg-slate-50 p-8 rounded-xl text-center text-slate-400">
                <Smartphone className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                <p className="text-xs">No active washer or dryer cycles running on your account.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Select a machine below to experience secure gateway checkout and automated mobile alerts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userCycles.map(m => (
                  <div key={m.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.status === "running" ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-bounce"}`} />
                        <h4 className="font-bold text-slate-700 text-sm">{m.id}: {m.name}</h4>
                      </div>
                      <p className="text-slate-500 text-xs">Cycle Mode: <span className="text-slate-800 font-medium">{m.cycleType}</span></p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Remaining</span>
                        <span className="font-mono font-bold text-lg text-slate-900">{m.remainingMinutes}m</span>
                      </div>

                      {m.status === "completed" ? (
                        <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold py-1 px-2.5 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed
                        </span>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Processing
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-50 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/40">
                  <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5 mb-1">
                    <Smartphone className="w-4 h-4 text-indigo-600" /> Live Completion Alert Notification Config:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox" 
                        id="sms_subscriber_check"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={isAlertSubscribed}
                        onChange={(e) => setIsAlertSubscribed(e.target.checked)}
                      />
                      <label htmlFor="sms_subscriber_check" className="text-slate-600 font-medium">Auto-trigger alert on completion</label>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Mobile for alerts (e.g., 555-0199)" 
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                        value={alertPhone}
                        onChange={(e) => setAlertPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* REAL-TIME EQUIPMENT AVAILABILITY & DISPATCH SELECTOR */}
          <div id="equipment_booking_matrix" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-500" /> Live Laundry Terminal
              </h3>
              <span className="text-xs text-slate-400">Apply custom cycles & launch securely!</span>
            </div>

            {/* LIVE MACHINE GRID CHIPS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.machines.map(m => {
                const isUnderRepair = m.status === "malfunctioning" || m.status === "maintenance";
                return (
                  <div 
                    key={m.id} 
                    id={`machine_client_card_${m.id}`}
                    className={`p-4 rounded-xl border transition-all ${selectedMachine?.id === m.id ? 'border-indigo-600 ring-2 ring-indigo-450 bg-indigo-50/15' : isUnderRepair ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.type} ({m.id})</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-0.5">{m.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md uppercase ${
                        m.status === "available" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        m.status === "running" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        m.status === "completed" ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                        m.status === "malfunctioning" ? "bg-rose-100 text-rose-800 border border-rose-200 font-bold" :
                        "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Rate: {m.dynamicPrice !== undefined && m.dynamicPrice !== m.revenueRate ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-400 line-through">${m.revenueRate.toFixed(2)}</span>
                            <span className="text-indigo-600 font-mono font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 animate-pulse">${m.dynamicPrice.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-800 font-mono font-bold">${m.revenueRate.toFixed(2)}</span>
                        )} / cycle</span>
                        <span>Usage: <span className="text-slate-700 font-medium">{m.usageCount} cycles</span></span>
                      </div>

                      {m.dynamicPrice !== undefined && m.dynamicPrice !== m.revenueRate && m.priceReasons && (
                        <div className="text-[10px] text-indigo-500 font-medium flex flex-wrap gap-1 leading-tight mt-1">
                          {m.priceReasons.map((reason, idx) => (
                            <span key={idx} className="bg-indigo-50/75 border border-indigo-100/40 px-1.5 py-0.5 rounded-md">⚡ {reason}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isUnderRepair && (
                      <div className="mt-2.5 p-2 bg-slate-100 rounded text-[11px] text-slate-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span>Unavailable. Registered diagnostics team is active.</span>
                      </div>
                    )}

                    {!isUnderRepair && m.status === "available" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMachine(m);
                            setSelectedCycle(m.type === 'washer' ? "Normal Eco-Warm" : "High Heat Speed-Dry");
                            setCheckoutSuccess("");
                            setCheckoutError("");
                          }}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                        >
                          Launch Checkout Gateway
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingMachine(m);
                            setBookingSuccess("");
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg"
                          title="Schedule/Book slot"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {m.status === "running" && (
                      <div className="mt-3 bg-amber-50 rounded-lg p-2 flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Running for: <span className="font-semibold text-slate-800">{m.currentUserName || "Customer"}</span></span>
                        <span className="font-mono text-amber-800 font-medium">{m.remainingMinutes} mins left</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECURE GATEWAY CHECKOUT MODAL ELEMENT */}
            {selectedMachine && (
              <div id="checkout_gateway_modal" className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-indigo-650" /> Secure Payment & Cycle Dispatch Gate
                  </h4>
                  <button 
                    onClick={() => setSelectedMachine(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">Equipment Selection</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg block">
                      {selectedMachine.id}: {selectedMachine.name}
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Select Cycle Package:</label>
                    {selectedMachine.type === "washer" ? (
                      <select 
                        className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700"
                        value={selectedCycle}
                        onChange={(e) => setSelectedCycle(e.target.value)}
                      >
                        <option value="Normal Eco-Warm">Normal Eco-Warm - Included Rate</option>
                        <option value="Delicate Cold Refresh">Delicate Cold Refresh - Included Rate</option>
                        <option value="Heavy Duty Sanitizing Hot">Heavy Duty Sanitizing Hot - Included Rate</option>
                      </select>
                    ) : (
                      <select
                        className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700"
                        value={selectedCycle}
                        onChange={(e) => setSelectedCycle(e.target.value)}
                      >
                        <option value="Regular Medium Heat">Regular Medium Heat - Included Rate</option>
                        <option value="High Heat Cotton Dry">High Heat Cotton Dry - Included Rate</option>
                        <option value="Low Delicate Tumble">Low Delicate Tumble - Included Rate</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1">Dynamic Standard Base Price: {selectedMachine.dynamicPrice !== undefined && selectedMachine.dynamicPrice !== selectedMachine.revenueRate && <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1 py-0.5 rounded font-bold">Dynamic Adjuster Active</span>}</span>
                    <span className="font-mono">${(selectedMachine.dynamicPrice || selectedMachine.revenueRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-purple-600">
                    <span>Base loyalty Reward Discount ({activeUser.discountTier} - {idx(activeUser.discountRate)}%):</span>
                    <span className="font-mono">-${((selectedMachine.dynamicPrice || selectedMachine.revenueRate) * activeUser.discountRate).toFixed(2)}</span>
                  </div>
                  {activeUser.personalizedOffer && (
                    <div className="flex justify-between text-xs text-pink-650 font-medium">
                      <span>Segment Offer Bonus ({activeUser.personalizedOffer.discountBonusCode} - {idx(activeUser.personalizedOffer.extraDiscountRate)}%):</span>
                      <span className="font-mono">-${((selectedMachine.dynamicPrice || selectedMachine.revenueRate) * activeUser.personalizedOffer.extraDiscountRate).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-100">
                    <span>Authorized Net Price:</span>
                    <span className="font-mono text-indigo-700">
                      ${(
                        (selectedMachine.dynamicPrice || selectedMachine.revenueRate) - 
                        ((selectedMachine.dynamicPrice || selectedMachine.revenueRate) * (activeUser.discountRate + (activeUser.personalizedOffer?.extraDiscountRate || 0)))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Billing Channel</label>
                    <select
                      className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Prepaid Wallet">Prepaid Wallet (${activeUser.balance.toFixed(2)} available)</option>
                      <option value="Apple Pay">Apple Pay Integration</option>
                      <option value="Secure Visa Card">Direct secure Cards (Visa/MC)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={checkoutInProgress}
                      onClick={handleLaunchCycle}
                      className="w-full bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" /> {checkoutInProgress ? "Verifying Token..." : "Purchase & Dispatch Cycle"}
                    </button>
                  </div>
                </div>

                {checkoutError && (
                  <div className="bg-rose-50 text-rose-800 text-xs p-2.5 rounded-lg border border-rose-200">
                    ⚠️ Payment Rejected: {checkoutError}
                  </div>
                )}
              </div>
            )}

            {/* REMOTE SESSION BOOKING MODAL ELEMENT */}
            {bookingMachine && (
              <form onSubmit={handleBooking} className="p-4 border border-slate-200 bg-slate-50 rounded-2xl space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-150">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-indigo-600" /> Secure Remote Booking Slot Scheduler
                  </h4>
                  <button type="button" onClick={() => setBookingMachine(null)} className="text-slate-400 hover:text-slate-600 text-xs">
                    Cancel
                  </button>
                </div>

                <p className="text-slate-450 text-[11px]">Reservations require zero credit checkout down-payment. We reserve the machinery for 15 minutes past the slot check-in.</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block mb-1">Target Machinery ID</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1.5 rounded block">{bookingMachine.id}: {bookingMachine.name}</span>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Target Hours (Today):</label>
                    <select
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded text-slate-705"
                      value={bookingTimeSlot}
                      onChange={(e) => setBookingTimeSlot(e.target.value)}
                    >
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="12:30 PM">12:30 PM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-700 hover:bg-slate-850 text-white font-semibold py-1.5 rounded-lg transition-colors"
                >
                  Schedule and Secure Machine
                </button>
              </form>
            )}

            {bookingSuccess && (
              <div className="bg-emerald-50 text-emerald-800 text-xs p-2.5 rounded-lg border border-emerald-200">
                ✔️ {bookingSuccess}
              </div>
            )}

            {checkoutSuccess && (
              <div className="bg-emerald-50 text-emerald-800 text-xs p-2.5 rounded-lg border border-emerald-200">
                🚀 {checkoutSuccess}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

// Inline pure helper calculators to avoid react render dependency traps
function idx(rate: number): number {
  return Math.round(rate * 100);
}

function calculatetotal(base: number, rate: number): string {
  const final = base - (base * rate);
  return final.toFixed(2);
}
