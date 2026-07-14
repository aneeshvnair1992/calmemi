"use client";

import React, { useState, useEffect } from "react";
import { Loan, UserProfile } from "../lib/storage";
import { formatCurrency, getEstimatedOutstanding, getRemainingMonths } from "../lib/utils";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  FileSpreadsheet,
  Gauge,
  ShieldAlert,
  Flame,
  UserPlus,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  TrendingDown,
  Info,
  Calendar,
  Lock,
  ArrowRight
} from "lucide-react";

interface CalmAIHubProps {
  loans: Loan[];
  profile: UserProfile;
}

type TabType =
  | "advisor"
  | "goals"
  | "sip"
  | "optimize"
  | "cibil"
  | "emergency"
  | "layoff"
  | "salary";

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSavings: number;
  monthlyContribution: number;
  targetDate: string; // YYYY-MM-DD
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function CalmAIHub({ loans, profile }: CalmAIHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>("advisor");

  const activeLoans = loans.filter((l) => l.status === "Active" || l.status === "Paused");
  const totalActiveEmis = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const breathingRoom = Math.max(0, profile.monthlyIncome - totalActiveEmis);
  const emiRatio = profile.monthlyIncome > 0 ? (totalActiveEmis / profile.monthlyIncome) * 100 : 0;
  const currencySymbol = profile.currency === "INR" ? "₹" : profile.currency === "EUR" ? "€" : profile.currency === "GBP" ? "£" : "$";

  // ---------------------------------------------------------------------------
  // 1. AI ADVISOR CHAT STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: `Hello ${profile.name}! I am your Calm AI Financial Advisor. I've analyzed your financial profile. You have ${activeLoans.length} active commitments consuming ${formatCurrency(totalActiveEmis)} monthly, leaving you with a Breathing Room of ${formatCurrency(breathingRoom)} (${Math.round(100 - emiRatio)}% of your income free). How can I support your financial peace of mind today?`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const getAIAdviceContextual = (prompt: string): string => {
    const query = prompt.toLowerCase();
    
    // Core diagnostics
    const debtRatio = emiRatio;
    const hasCC = activeLoans.some(l => l.loanType === "Credit Card EMI");
    const hasBNPL = activeLoans.some(l => l.loanType === "Pay Later / BNPL");
    const highestLoan = activeLoans.length > 0 
      ? [...activeLoans].sort((a, b) => b.totalAmount - a.totalAmount)[0] 
      : null;

    if (query.includes("breathing") || query.includes("income") || query.includes("ratio") || query.includes("dti")) {
      if (debtRatio > 60) {
        return `Your current debt-to-income ratio is ${Math.round(debtRatio)}%, which is heavy. To increase your breathing room immediately:
1. Use the **Skip Month** feature on non-urgent commitments this month to retain cash reserves.
2. Consider consolidating your outstanding debts. For instance, your ${highestLoan ? highestLoan.nickname : "highest obligation"} might be refinanceable at a lower EMI.
3. Pause discretionary spending. Focus on establishing a 3-month survival fund before prepaying.`;
      } else if (debtRatio > 40) {
        return `Your debt ratio is ${Math.round(debtRatio)}% (Moderate). You have ${formatCurrency(breathingRoom)} free monthly.
- Try rolling over cleared EMIs into a high-impact savings account or a SIP.
- Avoid initiating any new Pay Later or Credit Card EMIs for the next 90 days.
- If you have an extra lump sum, prepay a portion of your highest interest commitment to expand your monthly breathing room.`;
      } else {
        return `Fantastic status! Your debt commitments take up only ${Math.round(debtRatio)}% of your monthly income. You have a very healthy Breathing Room of ${formatCurrency(breathingRoom)}.
- Since your fixed commitments are low, consider setting up a systematic investment plan (SIP) with 20% of your free income.
- Prepaying is optional; you are in a safe zone where investing in liquid assets may yield better psychological and financial utility.`;
      }
    }

    if (query.includes("prepay") || query.includes("avalanche") || query.includes("snowball") || query.includes("optimize")) {
      if (activeLoans.length === 0) {
        return "You have no active commitments! Congratulations. You can use your monthly income to build an emergency fund or invest via SIP.";
      }
      
      const smallestLoan = [...activeLoans].sort((a, b) => {
        const outA = getEstimatedOutstanding(a.totalAmount, a.monthsCompleted, a.emiAmount);
        const outB = getEstimatedOutstanding(b.totalAmount, b.monthsCompleted, b.emiAmount);
        return outA - outB;
      })[0];

      return `To optimize your repayments, look at two options based on your active loans:
1. **The Snowball Method (Recommended for Peace of Mind)**: Target **${smallestLoan.nickname}** (outstanding: ~${formatCurrency(getEstimatedOutstanding(smallestLoan.totalAmount, smallestLoan.monthsCompleted, smallestLoan.emiAmount))}). Closing this first eliminates one active EMI cycle immediately, giving you instant psychological relief.
2. **The Avalanche Method (Mathematical Savings)**: Target high-interest categories like ${hasCC ? "your Credit Card EMIs" : hasBNPL ? "your Pay Later EMIs" : "your unsecured personal loans"}. Check the **Loan Optimization** tab to enter your exact rates and run the simulators.`;
    }

    if (query.includes("emergency") || query.includes("reserve") || query.includes("saving")) {
      const minReserve = (totalActiveEmis + 1500) * 3;
      return `For your financial profile, a baseline 3-month emergency fund should be around **${formatCurrency(minReserve)}**.
- This covers your active monthly EMIs (${formatCurrency(totalActiveEmis)}) plus a basic estimated living expense.
- Head over to the **Emergency Fund Planner** tab to enter your actual living costs and calculate a tailored 3, 6, or 12-month runway tracker.`;
    }

    if (query.includes("layoff") || query.includes("job") || query.includes("survival") || query.includes("runway")) {
      return `If you are preparing for potential job transitions or layoffs:
1. Shift your focus entirely to **liquidity and capital preservation**. Do not prepay any loans right now.
2. If a layoff occurs, you can utilize CalmEMI's **Smart Pause** or **Skip Month** features to delay EMI dues by 1-2 months, conserving immediate cash.
3. Review the **Layoff Survival Planner** tab to estimate your runway (in months) and see step-by-step preservation actions.`;
    }

    if (query.includes("cibil") || query.includes("credit score") || query.includes("improvement")) {
      return `Your credit score is primarily driven by:
- **On-time repayments (35% weight)**: This is the absolute core. Enabling our gentle reminders or setting auto-debits ensures you never miss a payment.
- **Credit utilization (30% weight)**: Keep your credit card balances below 30% of their limits.
- Check the **CIBIL Improvement** tab for an interactive checklist simulator and customized score projections!`;
    }

    // Default response
    return `Empathy-first tip: Financial clarity takes precedence over anxiety.
Based on your portfolio, you have ${activeLoans.length} obligations costing ${formatCurrency(totalActiveEmis)} / mo.
To explore further, you can ask me:
- "How can I prepay my debts faster?"
- "Evaluate my breathing room ratio"
- "How much should I save for an emergency fund?"
- "What do I do in case of a layoff?"`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // Simulate AI response stream
    setTimeout(() => {
      const reply = getAIAdviceContextual(userMsg.text);
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, timestamp: new Date() }
      ]);
      setIsTyping(false);
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // 2. GOALS TRACKING STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSavings, setGoalSavings] = useState("");
  const [goalContribution, setGoalContribution] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`calmemi_goals_${profile.uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setGoals(parsed);
        }, 0);
      } else {
        setTimeout(() => {
          setGoals([]);
        }, 0);
      }
    }
  }, [profile.uid]);

  const saveGoalsLocal = (newGoals: FinancialGoal[]) => {
    setGoals(newGoals);
    if (typeof window !== "undefined") {
      localStorage.setItem(`calmemi_goals_${profile.uid}`, JSON.stringify(newGoals));
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError(null);

    if (!goalName.trim() || !goalTarget || !goalContribution) {
      setGoalError("Goal name, target amount, and monthly savings are required.");
      return;
    }

    const targetVal = parseFloat(goalTarget);
    const savingsVal = parseFloat(goalSavings || "0");
    const contribVal = parseFloat(goalContribution);

    if (isNaN(targetVal) || targetVal <= 0 || isNaN(contribVal) || contribVal <= 0) {
      setGoalError("Amounts must be positive numbers.");
      return;
    }

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      name: goalName.trim(),
      targetAmount: targetVal,
      currentSavings: savingsVal,
      monthlyContribution: contribVal,
      targetDate: goalDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    const updated = [...goals, newGoal];
    saveGoalsLocal(updated);

    // Reset fields
    setGoalName("");
    setGoalTarget("");
    setGoalSavings("");
    setGoalContribution("");
    setGoalDate("");
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    saveGoalsLocal(updated);
  };

  // ---------------------------------------------------------------------------
  // 3. SIP PLANNER STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [sipMonthly, setSipMonthly] = useState("5000");
  const [sipReturn, setSipReturn] = useState("12");
  const [sipYears, setSipYears] = useState("10");
  const [sipStepUp, setSipStepUp] = useState("10"); // Step up % annually

  const calculateSIPDetails = () => {
    const P = parseFloat(sipMonthly) || 0;
    const r = (parseFloat(sipReturn) || 0) / 100 / 12;
    const t = (parseFloat(sipYears) || 0) * 12;
    const stepUpRate = (parseFloat(sipStepUp) || 0) / 100;

    let totalInvested = 0;
    let maturityValue = 0;
    const yearlyData: { year: number; invested: number; value: number }[] = [];

    let currentMonthlyInvest = P;
    let accumulatedValue = 0;

    for (let month = 1; month <= t; month++) {
      // Add investment at beginning of month
      totalInvested += currentMonthlyInvest;
      accumulatedValue = (accumulatedValue + currentMonthlyInvest) * (1 + r);

      // Annual step-up
      if (month % 12 === 0 && month < t) {
        currentMonthlyInvest = currentMonthlyInvest * (1 + stepUpRate);
      }

      // Record end of year
      if (month % 12 === 0) {
        yearlyData.push({
          year: month / 12,
          invested: Math.round(totalInvested),
          value: Math.round(accumulatedValue)
        });
      }
    }

    maturityValue = Math.round(accumulatedValue);
    const estReturns = Math.max(0, maturityValue - totalInvested);

    return { totalInvested, estReturns, maturityValue, yearlyData };
  };

  const sipResult = calculateSIPDetails();

  // ---------------------------------------------------------------------------
  // 4. LOAN OPTIMIZATION (AVALANCHE VS SNOWBALL)
  // ---------------------------------------------------------------------------
  const [interestRates, setInterestRates] = useState<Record<string, number>>({});

  const handleRateChange = (loanId: string, rate: string) => {
    const val = parseFloat(rate) || 0;
    setInterestRates((prev) => ({ ...prev, [loanId]: val }));
  };

  const getOptimizedPrepaymentAnalysis = () => {
    if (activeLoans.length === 0) return null;

    // Estimate outstanding balances
    const loansWithDetails = activeLoans.map((loan) => {
      const outstanding = getEstimatedOutstanding(loan.totalAmount, loan.monthsCompleted, loan.emiAmount);
      const rate = interestRates[loan.loanId] || 12; // default 12% if not set
      const remainingMonths = getRemainingMonths(loan.totalTenureMonths, loan.monthsCompleted);
      return {
        ...loan,
        outstanding,
        rate,
        remainingMonths
      };
    });

    // Avalanche priority: highest interest rate first
    const avalancheRank = [...loansWithDetails].sort((a, b) => b.rate - a.rate);
    
    // Snowball priority: smallest outstanding balance first
    const snowballRank = [...loansWithDetails].sort((a, b) => a.outstanding - b.outstanding);

    // High Impact Loan: highest EMI amount (biggest boost to monthly breathing room)
    const emiImpactRank = [...loansWithDetails].sort((a, b) => b.emiAmount - a.emiAmount);

    return { avalancheRank, snowballRank, emiImpactRank };
  };

  const optimizationData = getOptimizedPrepaymentAnalysis();

  // ---------------------------------------------------------------------------
  // 5. CIBIL IMPROVEMENT STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [cibilSteps, setCibilSteps] = useState({
    onTime: false,
    creditCardLimit: false,
    creditMix: false,
    noInquiries: false,
    oldAccounts: false
  });

  const getSimulatedCibilScore = () => {
    let score = 650; // base score
    if (cibilSteps.onTime) score += 65;
    if (cibilSteps.creditCardLimit) score += 40;
    if (cibilSteps.creditMix) score += 20;
    if (cibilSteps.noInquiries) score += 15;
    if (cibilSteps.oldAccounts) score += 10;

    // Max cap 850
    return Math.min(850, score);
  };

  const simulatedCibil = getSimulatedCibilScore();

  // ---------------------------------------------------------------------------
  // 6. EMERGENCY FUND STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [livingExpenses, setLivingExpenses] = useState("20000"); // Monthly other expenses
  const [currentEmergencySavings, setCurrentEmergencySavings] = useState("50000");
  const [safetyMultiplier, setSafetyMultiplier] = useState(6); // 3, 6, or 12 months

  const monthlyObligations = totalActiveEmis;
  const nonEmiExpenses = parseFloat(livingExpenses) || 0;
  const totalMonthlyCost = monthlyObligations + nonEmiExpenses;
  const targetEmergencyFund = totalMonthlyCost * safetyMultiplier;
  const emergencySaved = parseFloat(currentEmergencySavings) || 0;
  const emergencyPct = targetEmergencyFund > 0 ? Math.min(100, Math.round((emergencySaved / targetEmergencyFund) * 100)) : 0;

  // ---------------------------------------------------------------------------
  // 7. LAYOFF SURVIVAL PLANNER STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [survivalSavings, setSurvivalSavings] = useState("100000");
  const [essentialExpenses, setEssentialExpenses] = useState("15000");
  const [applySkipMonth, setApplySkipMonth] = useState(false);

  const calculateSurvivalRunway = () => {
    const cash = parseFloat(survivalSavings) || 0;
    const essentials = parseFloat(essentialExpenses) || 0;
    
    // If skip month is enabled, we simulate active loan EMIs as 0 for 1 month
    const totalObligation = totalActiveEmis;
    const normalMonthlyBurn = essentials + totalObligation;
    
    if (normalMonthlyBurn <= 0) return { months: 999, message: "You have zero expenses." };

    let runwayMonths = 0;
    let remainingCash = cash;

    if (applySkipMonth && activeLoans.length > 0) {
      // Month 1: skip active loan EMIs
      const month1Burn = essentials; // EMI obligations skipped for month 1
      if (remainingCash >= month1Burn) {
        remainingCash -= month1Burn;
        runwayMonths += 1;
      }
    }

    // Subsequent months (or all months if skip is disabled)
    const ongoingBurn = essentials + totalObligation;
    if (ongoingBurn > 0) {
      const remainingMonths = remainingCash / ongoingBurn;
      runwayMonths += remainingMonths;
    }

    const roundedRunway = Math.round(runwayMonths * 10) / 10;
    
    let advice = "";
    if (roundedRunway < 3) {
      advice = "Your runway is tight. Prioritize immediate cash preservation. Avoid prepayment of any debts, slash discretionary spends by 75%, and seek soft-pause terms on credit cards.";
    } else if (roundedRunway < 6) {
      advice = "You have a solid cushion. Maintain high liquidity. Keep your funds in high-yield, easily accessible liquid assets rather than locked terms.";
    } else {
      advice = "Excellent safety runway. You are fully prepared. You have enough breathing room to navigate transitions without financial distress.";
    }

    return { runway: roundedRunway, advice };
  };

  const runwayData = calculateSurvivalRunway();

  // ---------------------------------------------------------------------------
  // 8. SALARY HIKE SIMULATOR STATE & LOGIC
  // ---------------------------------------------------------------------------
  const [hikePercentage, setHikePercentage] = useState(15);
  const [allocationPrepayment, setAllocationPrepayment] = useState(40);
  const [allocationSavings, setAllocationSavings] = useState(30);
  const [allocationSIP, setAllocationSIP] = useState(20);

  const currentSalary = profile.monthlyIncome;
  const hikeIncrement = (currentSalary * hikePercentage) / 100;
  const newSalary = currentSalary + hikeIncrement;
  
  // Allocations (make sure they don't exceed 100%)
  const prepayPct = allocationPrepayment;
  const savePct = allocationSavings;
  const sipPct = allocationSIP;
  const lifestylePct = Math.max(0, 100 - (prepayPct + savePct + sipPct));

  const prepayValue = (hikeIncrement * prepayPct) / 100;
  const saveValue = (hikeIncrement * savePct) / 100;
  const sipValue = (hikeIncrement * sipPct) / 100;
  const lifestyleValue = (hikeIncrement * lifestylePct) / 100;

  const newBreathingRoom = breathingRoom + hikeIncrement - prepayValue; // prepayment reduces current surplus usage, lifestyle increase consumes some surplus

  return (
    <div className="bg-slate-50 flex flex-col md:flex-row gap-8 mt-6 w-full animate-in fade-in duration-300">
      
      {/* LEFT NAVIGATION COLUMN (Tabs) */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-1.5">
          <div className="px-3 py-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
            AI Advisors & Planners
          </div>

          <button
            onClick={() => setActiveTab("advisor")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "advisor"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Brain className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            AI Financial Advisor
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "goals"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Target className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
            Goal Tracker
          </button>

          <button
            onClick={() => setActiveTab("sip")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "sip"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-blue-400 shrink-0" />
            SIP Wealth Planner
          </button>

          <button
            onClick={() => setActiveTab("optimize")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "optimize"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <TrendingDown className="w-4.5 h-4.5 text-amber-400 shrink-0" />
            Loan Optimization
          </button>

          <button
            onClick={() => setActiveTab("cibil")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "cibil"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Gauge className="w-4.5 h-4.5 text-purple-400 shrink-0" />
            CIBIL Score Booster
          </button>

          <button
            onClick={() => setActiveTab("emergency")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "emergency"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <ShieldAlert className="w-4.5 h-4.5 text-teal-400 shrink-0" />
            Emergency Planner
          </button>

          <button
            onClick={() => setActiveTab("layoff")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "layoff"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Flame className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            Layoff Survival
          </button>

          <button
            onClick={() => setActiveTab("salary")}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === "salary"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-650 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <UserPlus className="w-4.5 h-4.5 text-pink-400 shrink-0" />
            Salary Hike Simulator
          </button>
        </div>
      </div>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 min-w-0">
        
        {/* TAB 1: AI FINANCIAL ADVISOR */}
        {activeTab === "advisor" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[580px] relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Brain className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">AI Financial Advisor</h3>
                <p className="text-[10px] text-slate-400 font-medium">Personalized, data-driven, empathetic consultation</p>
              </div>
            </div>

            {/* Chat Box Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-4 scrollbar-thin">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white font-semibold rounded-tr-none shadow-sm"
                        : "bg-slate-50 border border-slate-100 text-slate-700 font-medium rounded-tl-none whitespace-pre-line"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 font-medium flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Prompts Drawer */}
            <div className="flex flex-wrap gap-2 mb-3.5">
              <button
                onClick={() => {
                  setChatInput("How can I increase my monthly breathing room?");
                }}
                className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-950 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
              >
                Evaluate my breathing room ratio
              </button>
              <button
                onClick={() => {
                  setChatInput("Which loan should I prepayment optimize first?");
                }}
                className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-950 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
              >
                Optimize prepayments (Snowball vs Avalanche)
              </button>
              <button
                onClick={() => {
                  setChatInput("How much emergency fund is recommended for me?");
                }}
                className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-950 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
              >
                Calculate emergency fund guidelines
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-100 pt-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your Calm AI Advisor anything about your commitments..."
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-semibold"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: GOAL TRACKER */}
        {activeTab === "goals" && (
          <div className="space-y-6">
            {/* Goal Builder Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Target className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Financial Goal Tracker</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Build a timeline for your targets alongside EMIs</p>
                </div>
              </div>

              <form onSubmit={handleAddGoal} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">GOAL NAME</label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g. House Downpayment"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">TARGET AMOUNT ({currencySymbol})</label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">CURRENT SAVINGS ({currencySymbol})</label>
                  <input
                    type="number"
                    value={goalSavings}
                    onChange={(e) => setGoalSavings(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">MONTHLY CONTRIBUTION ({currencySymbol}/mo)</label>
                  <input
                    type="number"
                    value={goalContribution}
                    onChange={(e) => setGoalContribution(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">TARGET TIMELINE DATE</label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Goal Target
                  </button>
                </div>
              </form>

              {goalError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {goalError}
                </div>
              )}
            </div>

            {/* Goals List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const requiredFund = Math.max(0, goal.targetAmount - goal.currentSavings);
                const monthsToReach = goal.monthlyContribution > 0 ? Math.ceil(requiredFund / goal.monthlyContribution) : 0;
                const progressPct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentSavings / goal.targetAmount) * 100)) : 0;

                // Check target date feasibility
                const targetDateObj = new Date(goal.targetDate);
                const today = new Date();
                const diffTime = targetDateObj.getTime() - today.getTime();
                const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
                const onTrack = monthsToReach <= diffMonths;

                return (
                  <div key={goal.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h4 className="font-bold text-slate-800 text-xs truncate uppercase tracking-wider">{goal.name}</h4>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-slate-350 hover:text-rose-500 hover:bg-rose-50/50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between items-baseline">
                          <span className="text-slate-400 text-[10px] font-bold">SAVINGS STATUS</span>
                          <span className="text-slate-700 text-xs font-bold">
                            {formatCurrency(goal.currentSavings)} / {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${onTrack ? "bg-indigo-500" : "bg-amber-400"}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 font-semibold mb-4">
                        <div>
                          <p className="text-slate-400 font-bold">SAVING SPEED</p>
                          <p className="text-slate-700 text-xs font-bold">+{formatCurrency(goal.monthlyContribution)}/mo</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold">PAYOFF RUNWAY</p>
                          <p className="text-slate-700 text-xs font-bold">{monthsToReach} months remaining</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-bold">TARGET DATE: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                      {onTrack ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-md">
                          On Track
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-md" title="Need to increase monthly contribution to reach target on time">
                          Speed Up
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {goals.length === 0 && (
                <div className="col-span-2 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                  <Target className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">No active financial goal targets.</p>
                  <p className="text-[10px] mt-0.5">Use the goal builder above to layout future target runs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SIP WEALTH PLANNER */}
        {activeTab === "sip" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <FileSpreadsheet className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Systematic Investment Plan (SIP) Planner</h3>
                <p className="text-[10px] text-slate-400 font-medium">Compound your breathing room surpluses over time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">MONTHLY SIP AMOUNT</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={sipMonthly}
                      onChange={(e) => setSipMonthly(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">EXPECTED ANNUAL RETURN (%)</label>
                  <input
                    type="number"
                    value={sipReturn}
                    onChange={(e) => setSipReturn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">TIME PERIOD (YEARS)</label>
                  <input
                    type="number"
                    value={sipYears}
                    onChange={(e) => setSipYears(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">ANNUAL STEP-UP (OPTIONAL %)</label>
                  <input
                    type="number"
                    value={sipStepUp}
                    onChange={(e) => setSipStepUp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  />
                </div>
              </div>

              {/* Outputs Summary & SVG graph */}
              <div className="md:col-span-2 space-y-5 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase">Total Invested</p>
                    <p className="text-sm font-black text-slate-750 mt-1">{formatCurrency(sipResult.totalInvested)}</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl text-center">
                    <p className="text-[9px] text-emerald-600 font-extrabold uppercase">Est. Returns</p>
                    <p className="text-sm font-black text-emerald-700 mt-1">+{formatCurrency(sipResult.estReturns)}</p>
                  </div>
                  <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-center">
                    <p className="text-[9px] text-blue-600 font-extrabold uppercase">Maturity Value</p>
                    <p className="text-sm font-black text-blue-700 mt-1">{formatCurrency(sipResult.maturityValue)}</p>
                  </div>
                </div>

                {/* SVG Visual compounding graph */}
                <div className="h-44 border border-slate-100 rounded-2xl p-4 bg-slate-50/40 relative flex items-end gap-1 px-6">
                  {sipResult.yearlyData.map((data, idx) => {
                    const maxVal = sipResult.yearlyData[sipResult.yearlyData.length - 1].value;
                    const investPct = maxVal > 0 ? (data.invested / maxVal) * 100 : 0;
                    const valuePct = maxVal > 0 ? (data.value / maxVal) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="w-full relative flex flex-col items-center justify-end h-[80%]">
                          {/* Compounded wealth block */}
                          <div
                            className="w-[12px] bg-blue-400/30 rounded-t-sm absolute bottom-0 transition-all duration-300"
                            style={{ height: `${valuePct}%` }}
                          />
                          {/* Invested principal block */}
                          <div
                            className="w-[12px] bg-slate-800 rounded-t-sm absolute bottom-0 transition-all duration-300"
                            style={{ height: `${investPct}%` }}
                          />
                        </div>
                        {/* Hover tag tooltip */}
                        <div className="absolute top-1 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg transition-all z-20 shadow-md">
                          Yr {data.year}: {formatCurrency(data.value)}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 mt-1">Y{data.year}</span>
                      </div>
                    );
                  })}
                  <div className="absolute left-2 top-2 flex flex-col gap-1.5 text-[8px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-800 rounded-sm" /> Invested</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400/40 rounded-sm" /> Wealth Value</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Projection table */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Year-by-Year Growth Table</h4>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50">
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3">Total Invested</th>
                      <th className="py-2 px-3">Compounded Value</th>
                      <th className="py-2 px-3 text-right">Wealth Gained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sipResult.yearlyData.map((data, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-500">Year {data.year}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{formatCurrency(data.invested)}</td>
                        <td className="py-2 px-3 font-bold text-blue-650">{formatCurrency(data.value)}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700 text-right">
                          +{formatCurrency(Math.max(0, data.value - data.invested))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LOAN OPTIMIZATION (AVALANCHE VS SNOWBALL) */}
        {activeTab === "optimize" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <TrendingDown className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Loan Repayment Optimization</h3>
                <p className="text-[10px] text-slate-400 font-medium">Compare the financial savings of the Avalanche vs Snowball methods</p>
              </div>
            </div>

            {activeLoans.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400">
                <Info className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-xs font-bold">No active obligations to optimize.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Card */}
                <div className="p-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl text-[11px] text-amber-800 flex gap-2.5 items-start">
                  <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Enter the **Interest Rates (%)** of your obligations below to calculate a precise optimization queue. The **Avalanche method** saves the absolute most cash in interest, whereas the **Snowball method** is excellent for early victories and psychological peace of mind.
                  </p>
                </div>

                {/* Input rate fields list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configure Interest Rates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeLoans.map((loan) => (
                      <div key={loan.loanId} className="flex items-center justify-between gap-4 p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{loan.nickname}</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">{loan.provider} • EMI: {formatCurrency(loan.emiAmount)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            placeholder="12"
                            value={interestRates[loan.loanId] || ""}
                            onChange={(e) => handleRateChange(loan.loanId, e.target.value)}
                            className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <span className="text-slate-400 text-xs font-bold">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranking Output */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  
                  {/* Avalanche rank (mathematical priority) */}
                  <div className="p-4 border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/10 rounded-2xl transition-all">
                    <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      1. Avalanche Priority
                    </h5>
                    <ol className="space-y-2.5">
                      {optimizationData?.avalancheRank.map((loan, idx) => (
                        <li key={loan.loanId} className="text-xs flex gap-2">
                          <span className="w-4 h-4 bg-slate-900 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-850 truncate">{loan.nickname}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Interest: {loan.rate}% • Outstanding: ~{formatCurrency(loan.outstanding)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Snowball rank (peace of mind) */}
                  <div className="p-4 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10 rounded-2xl transition-all">
                    <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      2. Snowball Priority
                    </h5>
                    <ol className="space-y-2.5">
                      {optimizationData?.snowballRank.map((loan, idx) => (
                        <li key={loan.loanId} className="text-xs flex gap-2">
                          <span className="w-4 h-4 bg-slate-900 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-850 truncate">{loan.nickname}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Outstanding: ~{formatCurrency(loan.outstanding)} • EMI: {formatCurrency(loan.emiAmount)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Freeing Up Cash rank (EMI amount) */}
                  <div className="p-4 border border-slate-100 hover:border-amber-100 hover:bg-amber-50/10 rounded-2xl transition-all">
                    <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      3. Cash-Flow Booster
                    </h5>
                    <ol className="space-y-2.5">
                      {optimizationData?.emiImpactRank.map((loan, idx) => (
                        <li key={loan.loanId} className="text-xs flex gap-2">
                          <span className="w-4 h-4 bg-slate-900 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-850 truncate">{loan.nickname}</p>
                            <p className="text-[9px] text-slate-400 font-medium">EMI size: {formatCurrency(loan.emiAmount)} • Outstanding: ~{formatCurrency(loan.outstanding)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CIBIL SCORE BOOSTER */}
        {activeTab === "cibil" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Gauge className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">CIBIL / Credit Score Booster</h3>
                <p className="text-[10px] text-slate-400 font-medium">Interactive simulator to build credit rating habits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              {/* Simulator Checklists */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Simulate Credit Habits</h4>
                
                {/* Step 1 */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-purple-200 rounded-2xl cursor-pointer select-none bg-slate-50/50 hover:bg-purple-50/10 transition-all">
                  <input
                    type="checkbox"
                    checked={cibilSteps.onTime}
                    onChange={(e) => setCibilSteps({ ...cibilSteps, onTime: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">Repayment History on-time (35% weight)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Maintain 100% on-time repayment records over 6 consecutive cycles.</p>
                  </div>
                </label>

                {/* Step 2 */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-purple-200 rounded-2xl cursor-pointer select-none bg-slate-50/50 hover:bg-purple-50/10 transition-all">
                  <input
                    type="checkbox"
                    checked={cibilSteps.creditCardLimit}
                    onChange={(e) => setCibilSteps({ ...cibilSteps, creditCardLimit: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">Low Credit Card Utilization (30% weight)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Keep monthly outstanding card balances below 30% of total credit limits.</p>
                  </div>
                </label>

                {/* Step 3 */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-purple-200 rounded-2xl cursor-pointer select-none bg-slate-50/50 hover:bg-purple-50/10 transition-all">
                  <input
                    type="checkbox"
                    checked={cibilSteps.creditMix}
                    onChange={(e) => setCibilSteps({ ...cibilSteps, creditMix: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">Balanced Credit Mix (15% weight)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">A healthy blend of secured loans (home/car) and unsecured loans (personal/cards).</p>
                  </div>
                </label>

                {/* Step 4 */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-purple-200 rounded-2xl cursor-pointer select-none bg-slate-50/50 hover:bg-purple-50/10 transition-all">
                  <input
                    type="checkbox"
                    checked={cibilSteps.noInquiries}
                    onChange={(e) => setCibilSteps({ ...cibilSteps, noInquiries: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">No hard inquiries recently (10% weight)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Avoid applying for new loans/cards within the past 6 months.</p>
                  </div>
                </label>

                {/* Step 5 */}
                <label className="flex items-start gap-3 p-3.5 border border-slate-100 hover:border-purple-200 rounded-2xl cursor-pointer select-none bg-slate-50/50 hover:bg-purple-50/10 transition-all">
                  <input
                    type="checkbox"
                    checked={cibilSteps.oldAccounts}
                    onChange={(e) => setCibilSteps({ ...cibilSteps, oldAccounts: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">Keep old accounts active (10% weight)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Retain oldest cards active without closure to increase credit history age.</p>
                  </div>
                </label>
              </div>

              {/* Score Gauge Visual */}
              <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-3xl bg-slate-50/30 text-center">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-5 tracking-wider">PROJECTED CREDIT RATING</p>
                
                {/* Score Circle Gauge */}
                <div className="w-36 h-36 rounded-full border-8 border-purple-100 flex flex-col items-center justify-center relative bg-white shadow-sm mb-4">
                  {/* Dynamic border highlight */}
                  <div
                    className="absolute inset-0 rounded-full border-8 border-purple-600 animate-pulse pointer-events-none"
                    style={{ clipPath: `inset(0px 0px 0px 0px)` }} // clipPath for progress can be stylized, but simple ring works.
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Score</span>
                  <span className="text-3xl font-black text-purple-700 tracking-tighter">{simulatedCibil}</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase mt-1">
                    {simulatedCibil >= 750 ? "Excellent" : simulatedCibil >= 700 ? "Good" : "Fair"}
                  </span>
                </div>

                <div className="max-w-xs space-y-1 mt-2">
                  <p className="text-xs font-bold text-slate-700">Practice mindful credit stewardship</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Credit scores do not define your self-worth. It is a utility grade to represent reliability to lenders. Plan repayments with peace.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: EMERGENCY FUND PLANNER */}
        {activeTab === "emergency" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <ShieldAlert className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Emergency Fund Planner</h3>
                <p className="text-[10px] text-slate-400 font-medium">Calculate a tailored liquidity cushion protecting obligations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">MONTHLY OBLIGATIONS (EMIS)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="text"
                      disabled
                      value={monthlyObligations}
                      className="w-full pl-6 pr-3 py-2 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">Automatically compiled from your active dashboard obligations.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">OTHER ESTIMATED LIVING COSTS</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={livingExpenses}
                      onChange={(e) => setLivingExpenses(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">CURRENT SAVINGS LIQUID</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={currentEmergencySavings}
                      onChange={(e) => setCurrentEmergencySavings(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">SAFETY RUNWAY MULTIPLIER</label>
                  <select
                    value={safetyMultiplier}
                    onChange={(e) => setSafetyMultiplier(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                  >
                    <option value="3">3 Months (Baseline cushion)</option>
                    <option value="6">6 Months (Recommended standard)</option>
                    <option value="12">12 Months (Freelancer/High safety)</option>
                  </select>
                </div>
              </div>

              {/* Progress & Target Visual */}
              <div className="md:col-span-2 flex flex-col justify-between p-5 border border-slate-100 rounded-3xl bg-slate-50/30">
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">Emergency Fund Goal</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(targetEmergencyFund)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">Current Progress</p>
                      <p className="text-lg font-bold text-teal-700 mt-1">{emergencyPct}% Saved</p>
                    </div>
                  </div>

                  {/* Large custom progress bar */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${emergencyPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-[9px] text-slate-400 block font-bold">TOTAL MONTHLY REQUIREMENT</span>
                      <span className="text-slate-800 font-bold text-sm block mt-0.5">{formatCurrency(totalMonthlyCost)}/mo</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-[9px] text-slate-400 block font-bold">SAVINGS GAP REMAINING</span>
                      <span className="text-rose-600 font-bold text-sm block mt-0.5">{formatCurrency(Math.max(0, targetEmergencyFund - emergencySaved))}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-teal-50/30 border border-teal-100/50 rounded-2xl text-[11px] text-teal-850 flex gap-2.5 items-start">
                  <Info className="w-4.5 h-4.5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-teal-900 font-medium">
                    This safety goal ensures that even if you face income disruptions, all your active monthly loan EMIs ({formatCurrency(monthlyObligations)}) and your necessary living costs ({formatCurrency(nonEmiExpenses)}) are fully covered for **{safetyMultiplier} months** with zero stress.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 7: LAYOFF SURVIVAL PLANNER */}
        {activeTab === "layoff" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Flame className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Layoff Survival Planner</h3>
                <p className="text-[10px] text-slate-400 font-medium">Empathetic runway calculator and job preservation strategies</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">CURRENT LIQUID CASH RESERVES</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={survivalSavings}
                      onChange={(e) => setSurvivalSavings(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-705 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5">MINIMUM ESSENTIAL COSTS (NON-EMI)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455 text-xs font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={essentialExpenses}
                      onChange={(e) => setEssentialExpenses(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-705 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">Groceries, rent, basic utilities. Excludes discretionary spends.</p>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 p-3.5 bg-rose-50/20 border border-rose-100/50 rounded-2xl cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applySkipMonth}
                      onChange={(e) => setApplySkipMonth(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500/20 cursor-pointer animate-none"
                    />
                    <span className="text-[10px] text-rose-800 font-bold leading-snug">
                      Simulate using skip-month feature on loans for month 1 (Zero active EMI payment)
                    </span>
                  </label>
                </div>
              </div>

              {/* Survival Runway Result */}
              <div className="md:col-span-2 space-y-5 flex flex-col justify-between">
                
                <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-5 border border-rose-100/60 rounded-3xl bg-rose-50/10">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">SURVIVAL RUNWAY EXPECTANCY</span>
                    <h3 className="text-3xl font-black text-rose-700 tracking-tight">{runwayData.runway} Months</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Estimated months you can stay afloat if income stops today.</p>
                  </div>
                  
                  {/* Gauge */}
                  <div className="w-24 h-24 rounded-full border-4 border-rose-100 flex flex-col items-center justify-center bg-white shadow-sm shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Runway</span>
                    <span className="text-2xl font-black text-rose-700 tracking-tighter">{Math.floor(runwayData.runway)}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Mo</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2">
                  <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-rose-500 stroke-none" />
                    Layoff Survival Roadmap
                  </h5>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">{runwayData.advice}</p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SALARY HIKE SIMULATOR */}
        {activeTab === "salary" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
                <UserPlus className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Salary Hike Simulator</h3>
                <p className="text-[10px] text-slate-400 font-medium">Simulate how a promotion or salary hike boosts your breathing room</p>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Hike slider input */}
              <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Simulated Salary Hike:</span>
                  <span className="font-bold text-pink-600 text-xs bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                    +{hikePercentage}% Hike
                  </span>
                </div>
                
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={hikePercentage}
                  onChange={(e) => setHikePercentage(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                />
                
                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                  <span>5%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Calculations grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Current Salary</span>
                  <span className="text-base font-black text-slate-800 block mt-0.5">{formatCurrency(currentSalary)}</span>
                </div>
                <div className="p-4 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-pink-600 font-bold uppercase block">Hike Increment</span>
                  <span className="text-base font-black text-pink-700 block mt-0.5">+{formatCurrency(hikeIncrement)}</span>
                </div>
                <div className="p-4 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">New Monthly Income</span>
                  <span className="text-base font-black text-slate-800 block mt-0.5">{formatCurrency(newSalary)}</span>
                </div>
                <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase block">Est. Breathing Room</span>
                  <span className="text-base font-black text-emerald-700 block mt-0.5">{formatCurrency(newBreathingRoom)}</span>
                </div>
              </div>

              {/* Hike surplus allocation sliders */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Allocate Your Hike Surplus (+{formatCurrency(hikeIncrement)})</h4>
                
                <div className="space-y-4 max-w-xl">
                  
                  {/* Slider 1: Prepayment */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-655 text-slate-600 font-bold text-[10px]">Prepay high-interest loan:</span>
                      <span className="text-slate-800 font-bold">{prepayPct}% ({formatCurrency(prepayValue)})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={prepayPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAllocationPrepayment(val);
                        // Make sure sum doesn't exceed 100%
                        if (val + allocationSavings + allocationSIP > 100) {
                          const diff = 100 - val;
                          setAllocationSavings(Math.round(diff * 0.6));
                          setAllocationSIP(Math.round(diff * 0.4));
                        }
                      }}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Slider 2: Savings */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-655 text-slate-600 font-bold text-[10px]">Boost emergency savings:</span>
                      <span className="text-slate-800 font-bold">{savePct}% ({formatCurrency(saveValue)})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={savePct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAllocationSavings(val);
                        if (val + allocationPrepayment + allocationSIP > 100) {
                          const diff = 100 - val;
                          setAllocationPrepayment(Math.round(diff * 0.6));
                          setAllocationSIP(Math.round(diff * 0.4));
                        }
                      }}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Slider 3: SIP */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-655 text-slate-600 font-bold text-[10px]">Increase SIP Investments:</span>
                      <span className="text-slate-800 font-bold">{sipPct}% ({formatCurrency(sipValue)})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sipPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAllocationSIP(val);
                        if (val + allocationPrepayment + allocationSavings > 100) {
                          const diff = 100 - val;
                          setAllocationPrepayment(Math.round(diff * 0.6));
                          setAllocationSavings(Math.round(diff * 0.4));
                        }
                      }}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Allocation output summary */}
                  <div className="p-3.5 bg-pink-50/20 border border-pink-100/50 rounded-2xl text-[11px] text-pink-850 flex items-center justify-between">
                    <span className="font-semibold text-pink-800">Remaining for Lifestyle Upgrade (Discretionary Spend)</span>
                    <span className="font-black text-pink-800">{100 - (prepayPct + savePct + sipPct)}% ({formatCurrency(lifestyleValue)})</span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
