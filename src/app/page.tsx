"use client";

import React, { useState, useEffect } from "react";
import {
  subscribeAuth,
  subscribeLoans,
  addLoan,
  updateLoan,
  deleteLoan,
  updateProfile,
  signOutUser,
  UserProfile,
  Loan
} from "../lib/storage";
import { formatCurrency, getEstimatedOutstanding, setGlobalCurrency, getGlobalCurrency } from "../lib/utils";
import AuthPage from "../components/AuthPage";
import OnboardingWizard from "../components/OnboardingWizard";
import BreathingRoomWidget from "../components/BreathingRoomWidget";
import LoanCard from "../components/LoanCard";
import Timeline from "../components/Timeline";
import AddLoanModal from "../components/AddLoanModal";
import PaymentModal from "../components/PaymentModal";
import AdminPanel from "../components/AdminPanel";
import EditLoanModal from "../components/EditLoanModal";
import CalmAIHub from "../components/CalmAIHub";
import { exportToCSV, exportToExcel, exportToPDF } from "../lib/exportUtils";
import {
  Plus,
  Heart,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Smile,
  ShieldCheck,
  Shield,
  CheckCircle,
  HelpCircle,
  X,
  Users,
  TrendingDown,
  BookOpen,
  Settings,
  Trash2,
  Download,
  ChevronDown,
  FileSpreadsheet,
  ArrowRight
} from "lucide-react";

interface DashboardLoan extends Loan {
  owner?: "Me" | "Sarah" | "Shared";
}

// Feature A: Repayment Snowball math simulator
const simulateSnowball = (activeLoans: DashboardLoan[], extraPayment: number) => {
  if (activeLoans.length === 0) return { standardMonths: 0, savedMonths: 0, snowballMonths: 0 };

  let standardMonths = 0;
  const simLoans = activeLoans.map((l) => {
    const monthsLeft = Math.max(0, l.totalTenureMonths - l.monthsCompleted);
    if (monthsLeft > standardMonths) standardMonths = monthsLeft;

    const balance = Math.max(0, l.totalAmount - (l.monthsCompleted * l.emiAmount));
    return {
      id: l.loanId,
      balance,
      emi: l.emiAmount,
    };
  });

  if (extraPayment <= 0) {
    return { standardMonths, savedMonths: 0, snowballMonths: standardMonths };
  }

  const totalBaseEmi = simLoans.reduce((sum, l) => sum + l.emi, 0);
  const totalBudget = totalBaseEmi + extraPayment;

  let snowballMonths = 0;
  const maxSimMonths = 600;

  while (snowballMonths < maxSimMonths) {
    const active = simLoans.filter((l) => l.balance > 0);
    if (active.length === 0) break;

    active.sort((a, b) => a.balance - b.balance);

    let standardPaidThisMonth = 0;
    active.forEach((l) => {
      const payment = Math.min(l.emi, l.balance);
      l.balance -= payment;
      standardPaidThisMonth += payment;
    });

    let snowballPool = totalBudget - standardPaidThisMonth;
    
    for (let i = 0; i < active.length; i++) {
      if (snowballPool <= 0) break;
      const l = active[i];
      if (l.balance > 0) {
        const extraPaymentApplied = Math.min(snowballPool, l.balance);
        l.balance -= extraPaymentApplied;
        snowballPool -= extraPaymentApplied;
      }
    }

    snowballMonths++;
  }

  const savedMonths = Math.max(0, standardMonths - snowballMonths);
  return { standardMonths, savedMonths, snowballMonths };
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Admin module states
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<UserProfile | null>(null);

  // Advanced features states
  const [isFamilyView, setIsFamilyView] = useState(false);
  const [snowballExtra, setSnowballExtra] = useState(0);
  const [activeAppTab, setActiveAppTab] = useState<"dashboard" | "ai_hub">("dashboard");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activePaymentLoan, setActivePaymentLoan] = useState<Loan | null>(null);
  const [activeEditLoan, setActiveEditLoan] = useState<Loan | null>(null);
  const [activeDeleteLoan, setActiveDeleteLoan] = useState<Loan | null>(null);
  const [deleteConfirmCheck, setDeleteConfirmCheck] = useState(false);
  const [simulationAlertText, setSimulationAlertText] = useState<string | null>(null);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [newIncome, setNewIncome] = useState("");
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Profile Settings States
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileIncome, setProfileIncome] = useState("");
  const [profileCurrency, setProfileCurrency] = useState("USD");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Subscribe to Auth State
  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user?.currency) {
        setGlobalCurrency(user.currency);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Loans State
  useEffect(() => {
    const targetUser = impersonatedUser || currentUser;
    if (!targetUser || !targetUser.onboardingCompleted) {
      setLoans([]);
      return;
    }

    const unsubscribe = subscribeLoans(targetUser.uid, (loansList) => {
      setLoans(loansList);
      // Run the Set & Forget sync check
      syncPastDueLoans(loansList, targetUser.uid);
    });

    return () => unsubscribe();
  }, [currentUser, impersonatedUser]);

  // Set & Forget Sync Engine
  const syncPastDueLoans = async (loansList: Loan[], uid: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of loansList) {
      if (loan.status !== "Active" && loan.status !== "Paused") continue;

      let nextDate = new Date(loan.nextEmiDate);
      nextDate.setHours(0, 0, 0, 0);

      // If the due date is in the past (or today, meaning billing day has passed)
      if (today >= nextDate) {
        let currentMonthsCompleted = loan.monthsCompleted;
        let currentTotalTenure = loan.totalTenureMonths;
        let currentPendingMissed = loan.pendingMissed;
        let updatedNextEmiDate = loan.nextEmiDate;
        let updatedStatus: Loan["status"] = loan.status;

        // In case multiple cycles passed (e.g. user offline for 2 months)
        while (today >= nextDate) {
          if (updatedStatus === "Paused") {
            // Smart Pause: Halt increment, append tenure, reset to Active
            currentTotalTenure += 1;
            updatedStatus = "Active";
          } else if (currentPendingMissed) {
            // Exception Handler: Halt increment, append tenure
            currentTotalTenure += 1;
            currentPendingMissed = false; // Reset for next cycle
          } else {
            // Normal Set & Forget increment
            currentMonthsCompleted += 1;
          }

          // Check if fully closed
          if (currentMonthsCompleted >= currentTotalTenure) {
            updatedStatus = "Closed";
            break;
          }

          // Advance nextEmiDate by 1 month
          const [year, month, day] = updatedNextEmiDate.split("-").map(Number);
          let newMonth = month + 1;
          let newYear = year;
          if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
          }

          const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
          const targetDay = Math.min(loan.emiDayOfMonth, daysInNewMonth);

          const newMonthStr = String(newMonth).padStart(2, "0");
          const newDayStr = String(targetDay).padStart(2, "0");
          updatedNextEmiDate = `${newYear}-${newMonthStr}-${newDayStr}`;

          nextDate = new Date(updatedNextEmiDate);
          nextDate.setHours(0, 0, 0, 0);
        }

        // Apply changes
        try {
          await updateLoan(uid, loan.loanId, {
            monthsCompleted: currentMonthsCompleted,
            totalTenureMonths: currentTotalTenure,
            pendingMissed: currentPendingMissed,
            nextEmiDate: updatedNextEmiDate,
            status: updatedStatus,
          });
        } catch (error) {
          console.error("Failed to auto-sync loan:", loan.nickname, error);
        }
      }
    }
  };

  // Actions
  const handleToggleSkip = async (loanId: string) => {
    const activeUser = impersonatedUser || currentUser;
    if (!activeUser) return;
    const targetLoan = loans.find((l) => l.loanId === loanId);
    if (!targetLoan) return;

    try {
      await updateLoan(activeUser.uid, loanId, {
        pendingMissed: !targetLoan.pendingMissed,
      });
    } catch (e) {
      console.error("Error toggling skip state:", e);
    }
  };

  const handleTogglePause = async (loanId: string) => {
    const activeUser = impersonatedUser || currentUser;
    if (!activeUser) return;
    const targetLoan = loans.find((l) => l.loanId === loanId);
    if (!targetLoan) return;

    const newStatus = targetLoan.status === "Paused" ? "Active" : "Paused";
    try {
      await updateLoan(activeUser.uid, loanId, {
        status: newStatus,
      });
    } catch (e) {
      console.error("Error toggling pause state:", e);
    }
  };

  const handleConfirmPayment = async (
    loanId: string,
    extraAmount: number,
    option: "reduce_emi" | "reduce_tenure"
  ) => {
    const activeUser = impersonatedUser || currentUser;
    if (!activeUser) return;
    const targetLoan = loans.find((l) => l.loanId === loanId);
    if (!targetLoan) return;

    const outstanding = getEstimatedOutstanding(
      targetLoan.totalAmount,
      targetLoan.monthsCompleted,
      targetLoan.emiAmount
    );

    try {
      if (extraAmount >= outstanding) {
        // Full Closure
        await updateLoan(activeUser.uid, loanId, {
          status: "Closed",
          monthsCompleted: targetLoan.totalTenureMonths,
          pendingMissed: false,
          totalAmount: targetLoan.monthsCompleted * targetLoan.emiAmount + extraAmount,
        });
      } else {
        const remainingMonths = targetLoan.totalTenureMonths - targetLoan.monthsCompleted;

        if (option === "reduce_emi") {
          const newEmi = Math.max(1, Math.round((outstanding - extraAmount) / remainingMonths));
          const adjustedTotal =
            targetLoan.monthsCompleted * targetLoan.emiAmount + extraAmount + remainingMonths * newEmi;

          await updateLoan(activeUser.uid, loanId, {
            emiAmount: newEmi,
            totalAmount: adjustedTotal,
          });
        } else {
          // Reduce tenure
          const newRemaining = Math.max(1, Math.round((outstanding - extraAmount) / targetLoan.emiAmount));
          const newTenure = targetLoan.monthsCompleted + newRemaining;
          const adjustedTotal =
            targetLoan.monthsCompleted * targetLoan.emiAmount + extraAmount + newRemaining * targetLoan.emiAmount;

          await updateLoan(activeUser.uid, loanId, {
            totalTenureMonths: newTenure,
            totalAmount: adjustedTotal,
          });
        }
      }
    } catch (e) {
      console.error("Error processing part-payment:", e);
      throw e;
    }
  };

  const handleUpdateIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    const val = parseFloat(newIncome);

    if (isNaN(val) || val <= 0) {
      setIncomeError("Please enter a valid monthly income.");
      return;
    }

    const activeUser = impersonatedUser || currentUser;
    if (!activeUser) return;

    try {
      await updateProfile(activeUser.uid, { monthlyIncome: val });
      if (impersonatedUser) {
        setImpersonatedUser({ ...impersonatedUser, monthlyIncome: val });
      } else if (currentUser) {
        setCurrentUser({ ...currentUser, monthlyIncome: val });
      }
      setIsIncomeOpen(false);
    } catch (err: any) {
      setIncomeError(err.message || "Failed to update income.");
    }
  };

  const openProfileSettings = () => {
    const activeUser = impersonatedUser || currentUser;
    if (activeUser) {
      setProfileName(activeUser.name);
      setProfileIncome(activeUser.monthlyIncome.toString());
      setProfileCurrency(activeUser.currency || "USD");
      setProfileError(null);
      setIsProfileSettingsOpen(true);
    }
  };

  const handleProfileSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileLoading(true);

    if (!profileName.trim() || !profileIncome.trim()) {
      setProfileError("Name and income cannot be empty.");
      setProfileLoading(false);
      return;
    }

    const incomeVal = parseFloat(profileIncome);
    if (isNaN(incomeVal) || incomeVal < 0) {
      setProfileError("Please enter a valid monthly income.");
      setProfileLoading(false);
      return;
    }

    const activeUser = impersonatedUser || currentUser;
    if (!activeUser) return;

    try {
      await updateProfile(activeUser.uid, {
        name: profileName.trim(),
        monthlyIncome: incomeVal,
        currency: profileCurrency,
      });
      setGlobalCurrency(profileCurrency);

      const updated = {
        ...activeUser,
        name: profileName.trim(),
        monthlyIncome: incomeVal,
        currency: profileCurrency,
      };

      if (impersonatedUser) {
        setImpersonatedUser(updated);
      } else if (currentUser) {
        setCurrentUser(updated);
      }
      setIsProfileSettingsOpen(false);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile settings.");
    } finally {
      setProfileLoading(false);
    }
  };

  const activeUser = impersonatedUser || currentUser;

  // Family View data injection
  const myDashboardLoans: DashboardLoan[] = loans.map((l) => ({ ...l, owner: "Me" }));
  const familyDashboardLoans: DashboardLoan[] = [
    {
      loanId: "family-loan-1",
      nickname: "Sarah's Student Loan",
      provider: "Sallie Mae",
      loanType: "Education Loan",
      totalAmount: 35000,
      emiAmount: 350,
      totalTenureMonths: 120,
      monthsCompleted: 60,
      emiDayOfMonth: 15,
      nextEmiDate: "2026-07-15",
      status: "Active",
      pendingMissed: false,
      updatedAt: new Date().toISOString(),
      owner: "Sarah",
    },
    {
      loanId: "family-loan-2",
      nickname: "Shared Home Renovation",
      provider: "SBI",
      loanType: "Personal Loan",
      totalAmount: 15000,
      emiAmount: 250,
      totalTenureMonths: 60,
      monthsCompleted: 24,
      emiDayOfMonth: 22,
      nextEmiDate: "2026-07-22",
      status: "Active",
      pendingMissed: false,
      updatedAt: new Date().toISOString(),
      owner: "Shared",
    }
  ];

  const displayLoans = isFamilyView ? [...myDashboardLoans, ...familyDashboardLoans] : myDashboardLoans;
  const displayIncome = isFamilyView ? ((activeUser?.monthlyIncome || 0) + 4500) : (activeUser?.monthlyIncome || 0);

  // Calculations for dashboard
  const commitmentsLoansList = displayLoans.filter((l) => l.status === "Active" || l.status === "Paused");
  const activeLoansList = displayLoans.filter((l) => l.status === "Active");
  const closedLoansList = displayLoans.filter((l) => l.status === "Closed");
  const totalActiveEmis = activeLoansList.reduce((acc, curr) => acc + curr.emiAmount, 0);

  // Safe Zone calculations
  const activeDueDays = activeLoansList.map((l) => l.emiDayOfMonth);
  const latestDueDay = activeDueDays.length > 0 ? Math.max(...activeDueDays) : 0;
  const activeEmiSum = activeLoansList.reduce((sum, l) => sum + l.emiAmount, 0);

  const currencySymbol = getGlobalCurrency() === "INR" ? "₹" : getGlobalCurrency() === "EUR" ? "€" : getGlobalCurrency() === "GBP" ? "£" : "$";

  // Snowball Simulator math
  const snowballStats = simulateSnowball(activeLoansList, snowballExtra);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Creating a safe space...
          </p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!currentUser) {
    return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  // Admin Guard
  if (isAdminMode && currentUser.role === "admin") {
    return (
      <AdminPanel
        currentAdmin={currentUser}
        onImpersonateUser={(user, userLoans) => {
          setImpersonatedUser(user);
          setLoans(userLoans);
          setIsAdminMode(false);
        }}
        onClose={() => setIsAdminMode(false)}
      />
    );
  }

  // Onboarding Guard
  if (!activeUser) return null;
  if (!activeUser.onboardingCompleted) {
    return (
      <OnboardingWizard
        user={activeUser}
        onComplete={(updatedUser) => {
          if (impersonatedUser) {
            setImpersonatedUser(updatedUser);
          } else {
            setCurrentUser(updatedUser);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-12 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[500px] rounded-full bg-emerald-50/30 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-rose-50/20 blur-3xl -z-10 pointer-events-none" />

      {/* Main Header */}
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 fill-emerald-400 stroke-emerald-500" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                emi.calm
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Clarity over Anxiety</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser.role === "admin" && !impersonatedUser && (
              <button
                onClick={() => setIsAdminMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Admin Panel
              </button>
            )}
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">
              Welcome back, <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
            <button
              onClick={openProfileSettings}
              className="p-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Profile & Currency Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                signOutUser().then(() => {
                  setImpersonatedUser(null);
                  setCurrentUser(null);
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 bg-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Impersonation Banner */}
      {impersonatedUser && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-20">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 fill-emerald-500 stroke-white animate-pulse" />
            <span>Currently inspecting the portfolio of <strong className="underline font-bold">{impersonatedUser.name}</strong> ({impersonatedUser.email})</span>
          </span>
          <button
            onClick={() => {
              setImpersonatedUser(null);
              setIsAdminMode(true);
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all cursor-pointer font-bold border border-white/10"
          >
            Return to Admin Panel
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-slate-200 flex gap-6">
          <button
            onClick={() => setActiveAppTab("dashboard")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeAppTab === "dashboard"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveAppTab("ai_hub")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeAppTab === "ai_hub"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
            Calm AI Hub
          </button>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1">
        {activeAppTab === "ai_hub" ? (
          <CalmAIHub loans={loans} profile={activeUser} />
        ) : (
          <>
            {/* Feature B: Buffer Day Safe Zone Timeline */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/50 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Buffer Day Safe Zone</h3>
                <p className="text-[10px] text-slate-400 font-medium">Cognitive cushion for current month EMIs</p>
              </div>
            </div>
            {latestDueDay > 0 ? (
              <div className="px-4 py-2 bg-emerald-50/50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 animate-pulse fill-emerald-100" />
                <span>
                  Keep <strong>{formatCurrency(activeEmiSum)}</strong> in account until the <strong>{latestDueDay}th</strong>. After this, your budget is in the clear.
                </span>
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 text-xs font-semibold rounded-2xl">
                No active obligations this month.
              </div>
            )}
          </div>

          {/* Timeline track */}
          <div className="relative pt-6 pb-2 px-2">
            <div className="h-2 w-full bg-slate-100 rounded-full relative">
              {latestDueDay > 0 && (
                <div 
                  className="h-full bg-rose-100/70 border-r border-rose-300 transition-all duration-500 rounded-l-full absolute left-0"
                  style={{ width: `${(latestDueDay / 31) * 100}%` }}
                />
              )}
              {latestDueDay > 0 && (
                <div 
                  className="h-full bg-emerald-50/50 absolute top-0 rounded-r-full"
                  style={{ left: `${(latestDueDay / 31) * 100}%`, width: `${((31 - latestDueDay) / 31) * 100}%` }}
                />
              )}
            </div>

            {/* Markers */}
            {commitmentsLoansList.map((loan) => {
              const position = (loan.emiDayOfMonth / 31) * 100;
              return (
                <div
                  key={loan.loanId}
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                  style={{ left: `${position}%` }}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 shadow-sm ${
                    loan.status === "Paused"
                      ? "bg-amber-400 border-white ring-2 ring-amber-100"
                      : loan.pendingMissed
                      ? "bg-rose-400 border-white ring-2 ring-rose-100"
                      : "bg-emerald-500 border-white ring-2 ring-emerald-100"
                  }`} />
                  <div className="absolute bottom-6 scale-0 group-hover:scale-100 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap transition-all z-20 flex flex-col items-center border border-slate-800">
                    <span className="font-extrabold">{loan.nickname}</span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {formatCurrency(loan.emiAmount)} (Due {loan.emiDayOfMonth}th)
                    </span>
                    {loan.owner && (
                      <span className="text-[8px] uppercase tracking-wider bg-slate-800 text-slate-300 px-1 py-0.5 rounded mt-1 border border-slate-700">
                        {loan.owner}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-5">{loan.emiDayOfMonth}</span>
                </div>
              );
            })}

            <div className="flex justify-between text-[9px] text-slate-350 font-bold mt-2">
              <span>Day 1</span>
              <span>Day 31</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Metrics & Loan Commitments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Health widget */}
          <BreathingRoomWidget
            uid={activeUser.uid}
            monthlyIncome={displayIncome}
            totalActiveEmis={totalActiveEmis}
            fcmTokens={activeUser.fcmTokens}
            onUpdateIncome={() => {
              setNewIncome(activeUser.monthlyIncome.toString());
              setIsIncomeOpen(true);
            }}
          />

          {/* Active Loans Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {isFamilyView ? "Family Shared Commitments" : "Your Active Commitments"}
                </h2>
                <p className="text-xs text-slate-400">
                  {isFamilyView ? "Combined schedule for Me, Sarah, and Shared tracks." : "Manage your active installment periods."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Family View Toggle */}
                <button
                  onClick={() => setIsFamilyView(!isFamilyView)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isFamilyView
                      ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/50"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {isFamilyView ? "Individual View" : "Family View"}
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {isExportOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-20 bg-transparent" 
                        onClick={() => setIsExportOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          onClick={() => {
                            exportToCSV(loans, activeUser);
                            setIsExportOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <BookOpen className="w-4 h-4 text-slate-400" />
                          Export as CSV
                        </button>
                        <button
                          onClick={() => {
                            exportToExcel(loans, activeUser);
                            setIsExportOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          Export as Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => {
                            exportToPDF(loans, activeUser);
                            setIsExportOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                          Export as PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Add Loan
                </button>
              </div>
            </div>

            {commitmentsLoansList.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <Smile className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">You are completely EMI-free!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Excellent. You have no active installment cycles. Add a loan using the button above to start tracking.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {commitmentsLoansList.map((loan) => (
                  <LoanCard
                    key={loan.loanId}
                    loan={loan}
                    onToggleSkip={handleToggleSkip}
                    onTogglePause={handleTogglePause}
                    onOpenPaymentModal={(l) => setActivePaymentLoan(l)}
                    onOpenEditModal={(l) => {
                      if (loan.loanId.startsWith("family-loan")) {
                        setSimulationAlertText("Family view simulation loans cannot be edited. Toggle off Family View to modify your actual commitments.");
                      } else {
                        setActiveEditLoan(l);
                      }
                    }}
                    onDeleteLoan={(loanId) => {
                      if (loan.loanId.startsWith("family-loan")) {
                        setSimulationAlertText("Family view simulation loans cannot be deleted. Toggle off Family View to modify your actual commitments.");
                      } else {
                        setActiveDeleteLoan(loan);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completed Commitments Section */}
          {closedLoansList.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-150">
              <div>
                <h3 className="text-sm font-extrabold text-slate-600 tracking-tight flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  Completed Commitments ({closedLoansList.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Well done! These obligations are fully closed and behind you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
                {closedLoansList.map((loan) => (
                  <LoanCard
                    key={loan.loanId}
                    loan={loan}
                    onToggleSkip={handleToggleSkip}
                    onTogglePause={handleTogglePause}
                    onOpenPaymentModal={(l) => setActivePaymentLoan(l)}
                    onOpenEditModal={(l) => {
                      if (loan.loanId.startsWith("family-loan")) {
                        setSimulationAlertText("Family view simulation loans cannot be edited. Toggle off Family View to modify your actual commitments.");
                      } else {
                        setActiveEditLoan(l);
                      }
                    }}
                    onDeleteLoan={(loanId) => {
                      if (loan.loanId.startsWith("family-loan")) {
                        setSimulationAlertText("Family view simulation loans cannot be deleted. Toggle off Family View to modify your actual commitments.");
                      } else {
                        setActiveDeleteLoan(loan);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline & Advice */}
        <div className="space-y-6">
          
          {/* Calm AI Hub Invitation Banner */}
          <div className="p-6 bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 rounded-3xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-emerald-500 stroke-none" />
              Smart Calm AI Advisor
            </h4>
            <h3 className="text-base font-extrabold text-white tracking-tight">Unlock Financial Wisdom</h3>
            <p className="text-[11px] text-slate-300 mt-1 mb-5 leading-relaxed font-semibold">
              Analyze your current commitments, simulate salary hikes, track future goals, plan emergency funds, and boost your credit health.
            </p>

            <button
              onClick={() => setActiveAppTab("ai_hub")}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              Consult AI Advisor
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Feature A: Snowball Debt-Free Simulator */}
          <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-50/50 blur-2xl pointer-events-none" />
            
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-500 fill-emerald-50" />
              Snowball Debt Simulator
            </h4>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Accelerate Your Freedom</h3>
            <p className="text-[11px] text-slate-450 mt-1 mb-5 leading-normal">
              Adding a tiny extra lump sum to your debt repayment speeds up payoff exponentially by rolling over cleared EMIs.
            </p>

            {/* Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Fictional Monthly Extra:</span>
                <span className="font-bold text-emerald-600 text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  +{formatCurrency(snowballExtra)}/mo
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="10000"
                step="500"
                value={snowballExtra}
                onChange={(e) => setSnowballExtra(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
              
              <div className="flex justify-between text-[10px] font-bold text-slate-300">
                <span>{currencySymbol}0</span>
                <span>{currencySymbol}5,000</span>
                <span>{currencySymbol}10,000</span>
              </div>
            </div>

            {/* Results */}
            <div className="mt-5 p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-center">
              {snowballExtra > 0 && snowballStats.savedMonths > 0 ? (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-xs font-bold text-emerald-800 leading-tight">
                    One-Click Hope: Save {snowballStats.savedMonths} Months!
                  </p>
                  <p className="text-[10px] text-emerald-700 leading-normal font-medium">
                    By adding <strong>+{formatCurrency(snowballExtra)}/mo</strong>, you will become debt-free in <strong>{snowballStats.snowballMonths} months</strong> instead of {snowballStats.standardMonths} months!
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-455 text-slate-400 leading-normal font-medium">
                  Move the slider above to see how quickly you can become completely EMI-free!
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Schedule Timeline */}
          <Timeline loans={displayLoans} />

          {/* stress-relief high empathy advice card */}
          <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-emerald-50/50 blur-xl pointer-events-none" />
            
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" />
              Mindful Budgeting
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 leading-tight">No penalizing jargon</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Debt triggers stress. We focus purely on remaining tenure cycles and "Breathing Room". You won't find credit scores, debt flags, or warning bells here.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 leading-tight">Using the Skip Month feature</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Need some cash-flow space this month? Toggle the "Skip Month" flag. The sync engine will pause billing, postpones the date, and extends the tenure by 1 month automatically. Zero friction.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[10px] text-emerald-800 font-semibold">
                  You are in control of your financial calendar.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
          </>
        )}
    </main>

      {/* FOOTER */}
      <footer className="max-w-6xl w-full mx-auto px-4 mt-12 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6">
        <span>© {new Date().getFullYear()} emi.calm. Designed with empathy for financial well-being.</span>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <span>Private & Secure</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>FCM Enabled</span>
        </div>
      </footer>

      {/* MODALS */}

      {/* Add Loan Modal */}
      {isAddOpen && (
        <AddLoanModal
          onClose={() => setIsAddOpen(false)}
          onAddLoan={(loanData) => addLoan(activeUser.uid, loanData).then(() => {})}
        />
      )}

      {/* Payment / Pre-Closure Modal */}
      {activePaymentLoan && (
        <PaymentModal
          loan={activePaymentLoan}
          onClose={() => setActivePaymentLoan(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Update Income Modal */}
      {isIncomeOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-slate-100">
            <button
              onClick={() => setIsIncomeOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-1">
              Adjust Monthly Income
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Update your monthly take-home to re-calculate your Breathing Room.
            </p>

            <form onSubmit={handleUpdateIncomeSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5" htmlFor="edit-income">
                  Net Monthly Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">{currencySymbol}</span>
                  <input
                    id="edit-income"
                    type="number"
                    value={newIncome}
                    onChange={(e) => setNewIncome(e.target.value)}
                    placeholder="e.g. 6000"
                    className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  />
                </div>
              </div>

              {incomeError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {incomeError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Update Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {activeEditLoan && (
        <EditLoanModal
          loan={activeEditLoan}
          onClose={() => setActiveEditLoan(null)}
          onUpdateLoan={async (loanId, updatedData) => {
            const activeUser = impersonatedUser || currentUser;
            if (!activeUser) return;
            await updateLoan(activeUser.uid, loanId, updatedData);
          }}
        />
      )}

      {/* Profile Settings Modal */}
      {isProfileSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsProfileSettingsOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-1">
              Profile Settings
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Update your account details and currency format preference.
            </p>

            <form onSubmit={handleProfileSettingsSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5" htmlFor="prof-name">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-705 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition-all font-semibold"
                />
              </div>

              {/* Monthly Income */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5" htmlFor="prof-income">
                  Monthly Income
                </label>
                <input
                  id="prof-income"
                  type="number"
                  value={profileIncome}
                  onChange={(e) => setProfileIncome(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-705 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition-all font-bold"
                />
              </div>

              {/* Preferred Currency */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5" htmlFor="prof-currency">
                  Preferred Currency
                </label>
                <select
                  id="prof-currency"
                  value={profileCurrency}
                  onChange={(e) => setProfileCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>

              {profileError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {profileError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileSettingsOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  {profileLoading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {activeDeleteLoan && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setActiveDeleteLoan(null);
                setDeleteConfirmCheck(false);
              }}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer animate-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-1">
              Delete Commitment?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              You are about to remove <strong className="text-slate-700 font-bold">{activeDeleteLoan.nickname}</strong>. 
              This will permanently delete this loan entry, all historical payment records, and exclude its EMI obligation from your timeline.
            </p>

            <div className="space-y-4">
              <label className="flex items-start gap-2.5 p-3.5 bg-rose-50/40 border border-rose-100/70 rounded-2xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteConfirmCheck}
                  onChange={(e) => setDeleteConfirmCheck(e.target.checked)}
                  className="mt-0.5 rounded border-rose-200 text-rose-600 focus:ring-rose-500/20 cursor-pointer"
                />
                <span className="text-[11px] text-rose-800 font-semibold leading-snug">
                  I understand that this action is irreversible and will delete all payment history for this loan.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDeleteLoan(null);
                    setDeleteConfirmCheck(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const activeUser = impersonatedUser || currentUser;
                    if (activeUser && activeDeleteLoan) {
                      await deleteLoan(activeUser.uid, activeDeleteLoan.loanId);
                      setActiveDeleteLoan(null);
                      setDeleteConfirmCheck(false);
                    }
                  }}
                  disabled={!deleteConfirmCheck}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Info Modal */}
      {simulationAlertText && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-250">
            <button
              onClick={() => setSimulationAlertText(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-100">
              <Users className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-1">
              Simulation Item
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              {simulationAlertText}
            </p>

            <button
              onClick={() => setSimulationAlertText(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
