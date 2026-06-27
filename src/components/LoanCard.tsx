"use client";

import React from "react";
import { Loan } from "../lib/storage";
import { formatCurrency, getPercentCompleted, getRemainingMonths } from "../lib/utils";
import {
  Home,
  Car,
  User,
  GraduationCap,
  CreditCard,
  Clock,
  CircleDollarSign,
  Laptop,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Trash2,
  CheckCircle2,
  Pencil
} from "lucide-react";

interface LoanCardProps {
  loan: Loan;
  onToggleSkip: (loanId: string) => void;
  onTogglePause: (loanId: string) => void;
  onOpenPaymentModal: (loan: Loan) => void;
  onOpenEditModal?: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
}

const LOAN_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  "Home Loan": Home,
  "Vehicle Loan": Car,
  "Personal Loan": User,
  "Education Loan": GraduationCap,
  "Credit Card EMI": CreditCard,
  "Pay Later / BNPL": Clock,
  "Informal/Gold Loan": CircleDollarSign,
  "Consumer Durable": Laptop,
};

export default function LoanCard({
  loan,
  onToggleSkip,
  onTogglePause,
  onOpenPaymentModal,
  onOpenEditModal,
  onDeleteLoan,
}: LoanCardProps) {
  const IconComponent = LOAN_TYPE_ICONS[loan.loanType] || CircleDollarSign;
  const percent = getPercentCompleted(loan.totalTenureMonths, loan.monthsCompleted);
  const remaining = getRemainingMonths(loan.totalTenureMonths, loan.monthsCompleted);

  return (
    <div
      className={`bg-white border rounded-3xl p-6 transition-all duration-300 shadow-sm relative overflow-hidden select-none hover:shadow-md ${
        loan.status === "Closed"
          ? "border-slate-100 opacity-75"
          : loan.status === "Paused"
          ? "border-amber-200 ring-2 ring-amber-50/50"
          : loan.pendingMissed
          ? "border-rose-200 ring-2 ring-rose-50/50"
          : "border-slate-100"
      }`}
    >
      {/* Background soft color glow */}
      {loan.status !== "Closed" && (loan.status === "Paused" ? (
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-50 blur-xl -z-10 pointer-events-none" />
      ) : loan.pendingMissed ? (
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-rose-50 blur-xl -z-10 pointer-events-none" />
      ) : null)}

      {/* Card Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
              loan.status === "Closed"
                ? "bg-slate-50 border-slate-100 text-slate-400"
                : loan.status === "Paused"
                ? "bg-amber-50 border-amber-100 text-amber-500"
                : loan.pendingMissed
                ? "bg-rose-50 border-rose-100 text-rose-500"
                : "bg-slate-50 border-slate-100 text-slate-700"
            }`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          {/* Titles */}
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-1.5">
              {loan.nickname}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {loan.provider} • {loan.loanType}
            </p>
          </div>
        </div>

        {/* Badges / Controls */}
        <div className="flex items-center gap-2">
          {loan.status === "Closed" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          ) : loan.status === "Paused" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              Paused
            </span>
          ) : loan.pendingMissed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-full">
              EMI Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              Active
            </span>
          )}
          
          {loan.status !== "Closed" && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(loan)}
              className="p-1.5 text-slate-350 hover:text-slate-650 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              title="Edit loan details"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Are you sure you want to remove the loan "${loan.nickname}"?`)) {
                onDeleteLoan(loan.loanId);
              }
            }}
            className="p-1.5 text-slate-305 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            title="Delete loan record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>{percent}% Completed</span>
          <span>{remaining} months remaining</span>
        </div>
        
        {/* Progress bar container */}
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              loan.status === "Closed"
                ? "bg-slate-400"
                : loan.status === "Paused"
                ? "bg-amber-400"
                : loan.pendingMissed
                ? "bg-rose-400"
                : "bg-emerald-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium text-slate-400 pt-0.5">
          <span>{loan.monthsCompleted} paid</span>
          <span>{loan.totalTenureMonths} months total</span>
        </div>
      </div>

      {/* Monthly obligation summary */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-slate-300" />
          <span>Due day: {loan.emiDayOfMonth}th</span>
        </div>
        <div>
          <span className="text-slate-400">Monthly EMI: </span>
          <span className="font-bold text-slate-800 text-sm">
            {formatCurrency(loan.emiAmount)}
          </span>
        </div>
      </div>

      {/* Paused Plan Banner */}
      {loan.status === "Paused" && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-normal font-medium">
            <strong>Plan Paused for this month.</strong> Your breathing room has been adjusted to protect your immediate cash flow.
          </p>
        </div>
      )}

      {/* Missed Month Warning Banner */}
      {loan.status === "Active" && loan.pendingMissed && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-700 leading-normal font-medium">
            <strong>Taking a breath.</strong> We paused this month's sync. Next cycle, the loan tenure will append by 1 month instead of incrementing your completed payments.
          </p>
        </div>
      )}

      {/* Actions Footer */}
      {loan.status !== "Closed" && (
        <div className="mt-5 pt-4 border-t border-slate-50 flex gap-2.5">
          {/* Missed Month / Resume (only if not paused) */}
          {loan.status !== "Paused" && (
            <button
              onClick={() => onToggleSkip(loan.loanId)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                loan.pendingMissed
                  ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50/50"
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-600"
              }`}
            >
              {loan.pendingMissed ? "Resume Sync" : "Skip Month"}
            </button>
          )}

          {/* Pause / Resume Plan Button */}
          <button
            onClick={() => onTogglePause(loan.loanId)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              loan.status === "Paused"
                ? "bg-amber-600 border-amber-600 text-white hover:bg-amber-700"
                : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-600"
            }`}
          >
            {loan.status === "Paused" ? "Resume Plan" : "Pause Plan"}
          </button>

          {/* Part-Payment Modal Trigger */}
          <button
            onClick={() => onOpenPaymentModal(loan)}
            className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Pay Extra
          </button>
        </div>
      )}
    </div>
  );
}
