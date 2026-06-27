"use client";

import React, { useState } from "react";
import { Loan } from "../lib/storage";
import { getNextEmiDateString } from "../lib/utils";
import { X, Info } from "lucide-react";

interface AddLoanModalProps {
  onClose: () => void;
  onAddLoan: (loan: Omit<Loan, "loanId" | "updatedAt">) => Promise<void>;
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

export default function AddLoanModal({ onClose, onAddLoan }: AddLoanModalProps) {
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("");
  const [loanType, setLoanType] = useState(LOAN_TYPES[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [totalTenure, setTotalTenure] = useState("");
  const [completedMonths, setCompletedMonths] = useState("0");
  const [dueDay, setDueDay] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      const nextEmiDate = getNextEmiDateString(dueDayVal);
      const isCompleted = completedMonthsVal >= totalTenureVal;

      await onAddLoan({
        nickname: nickname.trim(),
        provider: provider.trim(),
        loanType,
        totalAmount: totalAmtVal,
        emiAmount: emiAmtVal,
        totalTenureMonths: totalTenureVal,
        monthsCompleted: completedMonthsVal,
        emiDayOfMonth: dueDayVal,
        nextEmiDate,
        status: isCompleted ? "Closed" : "Active",
        pendingMissed: false,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add loan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative border border-slate-100 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-1">
          Add Active Commitment
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-5">
          Enter loan parameters below. We don't require account linking or passwords.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="e.g. Home Loan, My Sedan"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
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
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                <input
                  id="totalAmount"
                  type="number"
                  min="1"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="40000"
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                <input
                  id="emiAmount"
                  type="number"
                  min="1"
                  value={emiAmount}
                  onChange={(e) => setEmiAmount(e.target.value)}
                  placeholder="1200"
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
                placeholder="36"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Current Completed Months */}
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
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              💡 For a new loan, set this to 0. If you've already made 12 payments, type 12 to show current progress.
            </p>
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
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Commitment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
