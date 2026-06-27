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
import { formatCurrency, getEstimatedOutstanding } from "../lib/utils";
import AuthPage from "../components/AuthPage";
import OnboardingWizard from "../components/OnboardingWizard";
import BreathingRoomWidget from "../components/BreathingRoomWidget";
import LoanCard from "../components/LoanCard";
import Timeline from "../components/Timeline";
import AddLoanModal from "../components/AddLoanModal";
import PaymentModal from "../components/PaymentModal";
import {
  Plus,
  Heart,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Smile,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  X
} from "lucide-react";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activePaymentLoan, setActivePaymentLoan] = useState<Loan | null>(null);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [newIncome, setNewIncome] = useState("");
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Subscribe to Auth State
  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Loans State
  useEffect(() => {
    if (!currentUser || !currentUser.onboardingCompleted) {
      setLoans([]);
      return;
    }

    const unsubscribe = subscribeLoans(currentUser.uid, (loansList) => {
      setLoans(loansList);
      // Run the Set & Forget sync check
      syncPastDueLoans(loansList, currentUser.uid);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Set & Forget Sync Engine
  const syncPastDueLoans = async (loansList: Loan[], uid: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of loansList) {
      if (loan.status !== "Active") continue;

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
          if (currentPendingMissed) {
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
    if (!currentUser) return;
    const targetLoan = loans.find((l) => l.loanId === loanId);
    if (!targetLoan) return;

    try {
      await updateLoan(currentUser.uid, loanId, {
        pendingMissed: !targetLoan.pendingMissed,
      });
    } catch (e) {
      console.error("Error toggling skip state:", e);
    }
  };

  const handleConfirmPayment = async (
    loanId: string,
    extraAmount: number,
    option: "reduce_emi" | "reduce_tenure"
  ) => {
    if (!currentUser) return;
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
        await updateLoan(currentUser.uid, loanId, {
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

          await updateLoan(currentUser.uid, loanId, {
            emiAmount: newEmi,
            totalAmount: adjustedTotal,
          });
        } else {
          // Reduce tenure
          const newRemaining = Math.max(1, Math.round((outstanding - extraAmount) / targetLoan.emiAmount));
          const newTenure = targetLoan.monthsCompleted + newRemaining;
          const adjustedTotal =
            targetLoan.monthsCompleted * targetLoan.emiAmount + extraAmount + newRemaining * targetLoan.emiAmount;

          await updateLoan(currentUser.uid, loanId, {
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

    if (!currentUser) return;

    try {
      await updateProfile(currentUser.uid, { monthlyIncome: val });
      setCurrentUser({ ...currentUser, monthlyIncome: val });
      setIsIncomeOpen(false);
    } catch (err: any) {
      setIncomeError(err.message || "Failed to update income.");
    }
  };

  // Calculations for dashboard
  const activeLoansList = loans.filter((l) => l.status === "Active");
  const closedLoansList = loans.filter((l) => l.status === "Closed");
  const totalActiveEmis = activeLoansList.reduce((acc, curr) => acc + curr.emiAmount, 0);

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

  // Onboarding Guard
  if (!currentUser.onboardingCompleted) {
    return (
      <OnboardingWizard
        user={currentUser}
        onComplete={(updatedUser) => setCurrentUser(updatedUser)}
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
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Welcome back, <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
            <button
              onClick={() => {
                signOutUser().then(() => setCurrentUser(null));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 bg-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content Grid */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Metrics & Loan Commitments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Health widget */}
          <BreathingRoomWidget
            uid={currentUser.uid}
            monthlyIncome={currentUser.monthlyIncome}
            totalActiveEmis={totalActiveEmis}
            fcmTokens={currentUser.fcmTokens}
            onUpdateIncome={() => {
              setNewIncome(currentUser.monthlyIncome.toString());
              setIsIncomeOpen(true);
            }}
          />

          {/* Active Loans Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Your Active Commitments
                </h2>
                <p className="text-xs text-slate-400">
                  Manage your active installment periods.
                </p>
              </div>
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add Loan
              </button>
            </div>

            {activeLoansList.length === 0 ? (
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
                {activeLoansList.map((loan) => (
                  <LoanCard
                    key={loan.loanId}
                    loan={loan}
                    onToggleSkip={handleToggleSkip}
                    onOpenPaymentModal={(l) => setActivePaymentLoan(l)}
                    onDeleteLoan={(loanId) => deleteLoan(currentUser.uid, loanId)}
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
                    onOpenPaymentModal={(l) => setActivePaymentLoan(l)}
                    onDeleteLoan={(loanId) => deleteLoan(currentUser.uid, loanId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline & Advice */}
        <div className="space-y-6">
          {/* Upcoming Schedule Timeline */}
          <Timeline loans={loans} />

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
          onAddLoan={(loanData) => addLoan(currentUser.uid, loanData).then(() => {})}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
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
    </div>
  );
}
