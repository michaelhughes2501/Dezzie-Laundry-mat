import React, { useState, useEffect, useRef } from "react";
import { LaundromatState } from "../types";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  AlertCircle, 
  Lightbulb, 
  Zap, 
  HelpCircle,
  Clock
} from "lucide-react";
import { queryAI } from "../api";

interface AICopilotProps {
  state: LaundromatState;
}

interface Message {
  id: string;
  sender: 'ai' | 'operator';
  text: string;
  timestamp: string;
}

export default function AICopilot({ state }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject welcoming diagnostic messages
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: "msg-welcome",
        sender: "ai",
        text: `### 🤖 ProClean AI Sentry Online
Greetings Operator! I am your autonomous laundromat intelligence assistant, linked directly to live store sensors, loyalty wallets, and dispatch rosters.

**Diagnostic Status:**
*   **Operating Metrics:** Store holds **$${calculatetotalrev(state).toFixed(2)}** in transaction velocity across **${state.loyaltyProfiles.length} active customer wallets**.
*   **Active Alarms:** **${state.machines.filter(m => m.status === 'malfunctioning').length} malfunctions** logged today. Active task dispatches are operating under high priority.

Give me an instruction or tap one of the **optimization blueprints** below to programmatically configure peak performance workflows or evaluate store trends!`,
        timestamp: timeStr
      }
    ]);
  }, []);

  useEffect(() => {
    // Scroll chat to bottom on changes
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMsg).trim();
    if (!textToSend) return;

    if (!customPrompt) {
      setInputMsg("");
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const userMsgId = "msg-" + Math.random().toString(36).substring(2, 9);
    
    // Append client message
    const newMsgs = [
      ...messages,
      {
        id: userMsgId,
        sender: 'operator' as const,
        text: textToSend,
        timestamp
      }
    ];
    setMessages(newMsgs);
    setAiLoading(true);

    try {
      const gResult = await queryAI(textToSend, "Laundromat Store Manager");
      const appendAiId = "msg-" + Math.random().toString(36).substring(2, 9);
      
      setMessages([
        ...newMsgs,
        {
          id: appendAiId,
          sender: 'ai',
          text: gResult,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      const errorMsgId = "msg-" + Math.random().toString(36).substring(2, 9);
      setMessages([
        ...newMsgs,
        {
          id: errorMsgId,
          sender: 'ai',
          text: `⚠️ **API Gateway Timeout:** Failed to prompt intelligence core. Diagnostic reason: ${err.message || 'Busy thread'}. Please try again shortly.`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const quickPrompts = [
    {
      label: "📈 Revenue Profiles",
      prompt: "Evaluate store transactions, revenue patterns, and recommend active business actions to maximize laundry checkout volume.",
      icon: TrendingUp,
      color: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
    },
    {
      label: "⚠️ Audit Malfunctions",
      prompt: "Provide a complete list of malfunctioning machinery and open technician scheduled dispatches. Rate their urgency level.",
      icon: AlertCircle,
      color: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
    },
    {
      label: "💡 Dynamic Pricing",
      prompt: "Model peak operational slots today. Suggest automated discount structures to increase machine duty cycle rates.",
      icon: Lightbulb,
      color: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
    },
    {
      label: "⚙️ Loyalty Schemes",
      prompt: "Review loyalty profiles (Michael Hughes, Sarah, etc.) and propose tailored discount promotions to boost customer loyalty.",
      icon: Zap,
      color: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100"
    }
  ];

  return (
    <div id="ai_copilot_assistant_view" className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col h-[600px] overflow-hidden text-slate-100">
      
      {/* COGNITIVE TOP BANNER */}
      <div className="bg-slate-950 p-4 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-650 rounded-xl flex items-center justify-center border border-indigo-400/30">
            <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono">Operations Advisor Core</span>
            <h3 className="font-bold text-sm text-slate-100">ProClean Operations Copilot</h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-[10.5px]">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-slate-450 font-medium">Model: gemini-3.5-flash</span>
        </div>
      </div>

      {/* CHAT CHRONOS MESSAGES BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-slate-900">
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={`flex gap-3 max-w-4xl ${msg.sender === 'operator' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {/* AVATARS */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${msg.sender === 'operator' ? 'bg-slate-850 border-slate-700 text-slate-200' : 'bg-indigo-950 border-indigo-500/40 text-indigo-400'}`}>
              {msg.sender === 'operator' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* BUBBLE */}
            <div className={`rounded-2xl p-4 border text-xs leading-relaxed space-y-2 ${
              msg.sender === 'operator' 
                ? 'bg-indigo-650 border-indigo-505 text-white rounded-tr-none' 
                : 'bg-slate-950/70 border-slate-850 text-slate-300 rounded-tl-none markdown-container'
            }`}>
              
              {/* Parse rudimentary bullet markdowns for visual beauty */}
              {renderSimpleMarkdown(msg.text)}

              <span className={`block text-[9px] mt-2 font-mono ${msg.sender === 'operator' ? 'text-indigo-200 text-right' : 'text-slate-500'}`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="flex gap-3 mr-auto items-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="animate-pulse">Consulting store parameters and evaluating optimization formulas...</span>
            </div>
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      {/* FOOTER ACTIONS AND TEXT INPUT COMPOSER */}
      <div className="p-4 bg-slate-950 border-t border-slate-850 space-y-3">
        
        {/* QUICK OPTIMIZATION SUGGESTION PILLS */}
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp, qindex) => {
            const IconComponent = qp.icon;
            return (
              <button
                key={qindex}
                type="button"
                className={`py-1 px-3 border text-[11px] rounded-lg flex items-center gap-1.5 transition-all outline-none font-medium ${qp.color}`}
                onClick={() => handleSend(qp.prompt)}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {qp.label}
              </button>
            );
          })}
        </div>

        {/* INPUT COMPOSER FIELD */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask AI Copilot (e.g. 'How much revenue from Cash wallet top-ups?' or 'Is there scheduled checkups on W4?')..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-500 text-slate-200"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputMsg.trim() || aiLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <span className="text-[10px] text-slate-550 block text-center font-mono">
          🔒 AI operations token uses end-to-end telemetry sandboxing. Store owners authorization keys preserved.
        </span>
      </div>

    </div>
  );
}

function calculatetotalrev(s: LaundromatState): number {
  return s.transactions.reduce((acc, t) => acc + t.amount, 0);
}

// Simple text formatter to safely render header lists in Markdown-like arrays inside React without HTML injection vulnerabilities
function renderSimpleMarkdown(rawText: string) {
  const lines = rawText.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("###")) {
          return <h4 key={idx} className="font-extrabold text-sm text-indigo-400 pt-1 tracking-tight">{trimmed.replace("###", "").trim()}</h4>;
        }
        if (trimmed.startsWith("##")) {
          return <h3 key={idx} className="font-extrabold text-sm text-indigo-300 pt-1">{trimmed.replace("##", "").trim()}</h3>;
        }
        if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
          // Check for bold parts
          const block = trimmed.substring(1).trim();
          return (
            <div key={idx} className="flex gap-1.5 pl-2 items-start">
              <span className="text-indigo-400 font-bold shrink-0">•</span>
              <p className="flex-1">{parseBolds(block)}</p>
            </div>
          );
        }
        return <p key={idx}>{parseBolds(trimmed)}</p>;
      })}
    </div>
  );
}

function parseBolds(text: string) {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="text-white font-black">{match[1]}</strong>);
    lastIndex = boldPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
