"use client";

import React from "react";
import { Loan } from "../lib/storage";
import { formatCurrency, formatFriendlyDate, getDaysRemaining } from "../lib/utils";
import { Calendar, ChevronRight, PauseCircle } from "lucide-react";

interface TimelineProps {
  loans: Loan[];
}

export default function Timeline({ loans }: TimelineProps) {
  // Filter active loans and sort them chronologically by due date
  const activeLoans = loans
    .filter((l) => l.status === "Active")
    .map((l) => {
      const days = getDaysRemaining(l.nextEmiDate);
      return { ...l, daysRemaining: days };
    })
    // Sort by days remaining (earliest first)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (activeLoans.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center select-none">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Calendar className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">All commitments clear</h4>
        <p className="text-xs text-slate-400 mt-1">No active upcoming EMIs found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 select-none space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Upcoming Payments
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">Current Cycle</span>
      </div>

      <div className="relative pl-4 border-l border-slate-100 space-y-5">
        {activeLoans.map((loan) => {
          const days = loan.daysRemaining;
          
          let dayBadgeColor = "text-slate-500 bg-slate-50 border-slate-100";
          let dayText = `${days} days left`;
          
          if (days === 0) {
            dayBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-100 font-bold";
            dayText = "Due today";
          } else if (days < 0) {
            dayBadgeColor = "text-rose-700 bg-rose-50 border-rose-100 font-bold";
            dayText = `${Math.abs(days)}d overdue`;
          } else if (days <= 3) {
            dayBadgeColor = "text-amber-700 bg-amber-50 border-amber-100 font-bold animate-pulse";
            dayText = `${days}d left`;
          }

          return (
            <div key={loan.loanId} className="relative group">
              {/* Chronological bullet marker */}
              <div className="absolute left-[-21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-slate-300 group-hover:bg-emerald-500 transition-all duration-300" />

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-all">
                      {loan.nickname}
                    </span>
                    {loan.pendingMissed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 rounded px-1 py-0.5">
                        <PauseCircle className="w-2.5 h-2.5" />
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {loan.provider} • due {formatFriendlyDate(loan.nextEmiDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${dayBadgeColor}`}>
                    {dayText}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {formatCurrency(loan.emiAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
