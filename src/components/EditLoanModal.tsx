"use client";

import React, { useState } from "react";
import { Loan } from "../lib/storage";
import { getNextEmiDateString, getGlobalCurrency } from "../lib/utils";
import { X, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

interface EditLoanModalProps {
  loan: Loan;
  onClose: () => void;
  onUpdateLoan: (loanId: string, updatedData: Partial<Loan>) => Promise<void>;
}

const LOAN_TYPES = [
  "Home Loan",
  "Vehicle Loan",
  "Personal Loan",
  "Education Loan",
  "Credit Card EMI",
  "Pay Later / BNPL",
  "Informal/Gold Loan",
  "Consumer Durable",
];

export default function EditLoanModal({ loan, onClose, onUpdateLoan }: EditLoanModalProps) {
  const [nickname, setNickname] = useState(loan.nickname);
  const [provider, setProvider] = useState(loan.provider);
  const [loanType, setLoanType] = useState(loan.loanType);
  const [totalAmount, setTotalAmount] = useState(loan.totalAmount.toString());
  const [emiAmount, setEmiAmount] = useState(loan.emiAmount.toString());
  const [totalTenure, setTotalTenure] = useState(loan.totalTenureMonths.toString());
  const [completedMonths, setCompletedMonths] = useState(loan.monthsCompleted.toString());
  const [dueDay, setDueDay] = useState(loan.emiDayOfMonth.toString());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Confirmation checkpoint states
  const [showConfirm, setShowConfirm] = useState(false);
  const [understandChecked, setUnderstandChecked] = useState(false);

  const currencySymbol = getGlobalCurrency() === "INR" ? "₹" : getGlobalCurrency() === "EUR" ? "€" : getGlobalCurrency() === "GBP" ? "£" : "$";

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!nickname.trim() || !provider.trim()) {
      setError("Please enter a nickname and provider.");
      return;
    }

    const totalAmtVal = parseFloat(totalAmount);
    const emiAmtVal = parseFloat(emiAmount);
    const totalTenureVal = parseInt(totalTenure);
    const completedMonthsVal = parseInt(completedMonths);
    const dueDayVal = parseInt(dueDay);

    if (isNaN(totalAmtVal) || totalAmtVal <= 0) {
      setError("Total loan amount must be greater than zero.");
      return;
    }
    if (isNaN(emiAmtVal) || emiAmtVal <= 0) {
      setError("EMI amount must be greater than zero.");
      return;
    }
    if (isNaN(totalTenureVal) || totalTenureVal <= 0) {
      setError("Total tenure must be at least 1 month.");
      return;
    }
    if (isNaN(completedMonthsVal) || completedMonthsVal < 0 || completedMonthsVal > totalTenureVal) {
      setError("Completed months must be between 0 and the total tenure.");
      return;
    }
    if (isNaN(dueDayVal) || dueDayVal < 1 || dueDayVal > 31) {
      setError("EMI due day must be between 1 and 31.");
      return;
    }

    // Go to confirmation checkpoint
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    if (!understandChecked) return;
    setLoading(true);
    setError(null);

    const totalAmtVal = parseFloat(totalAmount);
    const emiAmtVal = parseFloat(emiAmount);
    const totalTenureVal = parseInt(totalTenure);
    const completedMonthsVal = parseInt(completedMonths);
    const dueDayVal = parseInt(dueDay);

    try {
      const nextEmiDate = getNextEmiDateString(dueDayVal);
      const isCompleted = completedMonthsVal >= totalTenureVal;

      await onUpdateLoan(loan.loanId, {
        nickname: nickname.trim(),
        provider: provider.trim(),
        loanType,
        totalAmount: totalAmtVal,
        emiAmount: emiAmtVal,
        totalTenureMonths: totalTenureVal,
        monthsCompleted: completedMonthsVal,
        emiDayOfMonth: dueDayVal,
        nextEmiDate,
        status: isCompleted ? "Closed" : loan.status === "Closed" ? "Active" : loan.status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update loan. Please try again.");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative border border-slate-100 my-8 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!showConfirm ? (
          <>
            {/* Edit Mode Header */}
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-1">
              Edit Commitment Details
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5">
              Update the settings for <strong className="text-slate-700">{loan.nickname}</strong>.
            </p>

            {/* Edit Form */}
            <form onSubmit={handlePreSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nickname */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="nickname">
                    Loan Nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Home Loan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="provider">
                    Lender / Provider
                  </label>
                  <input
                    id="provider"
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Loan Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="loanType">
                    Loan Type
                  </label>
                  <select
                    id="loanType"
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                  >
                    {LOAN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Day */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="dueDay">
                    EMI Due Day of Month
                  </label>
                  <input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="totalAmount">
                    Total Loan Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">{currencySymbol}</span>
                    <input
                      id="totalAmount"
                      type="number"
                      min="1"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* EMI Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="emiAmount">
                    Monthly EMI Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">{currencySymbol}</span>
                    <input
                      id="emiAmount"
                      type="number"
                      min="1"
                      value={emiAmount}
                      onChange={(e) => setEmiAmount(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Tenure */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="totalTenure">
                    Total Tenure (Months)
                  </label>
                  <input
                    id="totalTenure"
                    type="number"
                    min="1"
                    value={totalTenure}
                    onChange={(e) => setTotalTenure(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Completed Months */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1" htmlFor="completedMonths">
                  Current Completed Months (Already Paid)
                </label>
                <input
                  id="completedMonths"
                  type="number"
                  min="0"
                  value={completedMonths}
                  onChange={(e) => setCompletedMonths(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-2 animate-in fade-in zoom-in-95 duration-200">
            {/* Confirmation Checkpoint Overlay */}
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>

            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-tight mb-2">
              Confirm Schedule Modification
            </h2>
            <p className="text-xs text-slate-505 text-slate-500 leading-relaxed mb-6">
              You are updating parameters for <strong className="text-slate-700">"{loan.nickname}"</strong>. Modifying the total tenure, EMI amounts, or completed payments directly recalculates your timeline and shifts your monthly <strong>Breathing Room</strong> metrics.
            </p>

            {/* Checkbox Checkpoint */}
            <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl cursor-pointer select-none mb-6 group hover:bg-slate-100/50 transition-all">
              <input
                type="checkbox"
                checked={understandChecked}
                onChange={(e) => setUnderstandChecked(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 border-slate-200 mt-0.5 cursor-pointer accent-emerald-500"
              />
              <span className="text-[11px] text-slate-600 font-bold leading-normal group-hover:text-slate-800 transition-all">
                I understand that these changes are permanent and will modify my active schedule and timeline.
              </span>
            </label>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl mb-4">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!understandChecked || loading}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-450 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Confirm & Update"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
