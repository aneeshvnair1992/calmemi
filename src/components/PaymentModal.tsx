"use client";

import React, { useState, useEffect } from "react";
import { Loan } from "../lib/storage";
import { formatCurrency, getEstimatedOutstanding, getRemainingMonths } from "../lib/utils";
import { X, Check, Calculator, Clock, DollarSign, Sparkles } from "lucide-react";

interface PaymentModalProps {
  loan: Loan;
  onClose: () => void;
  onConfirmPayment: (
    loanId: string,
    extraAmount: number,
    option: "reduce_emi" | "reduce_tenure"
  ) => Promise<void>;
}

export default function PaymentModal({ loan, onClose, onConfirmPayment }: PaymentModalProps) {
  const [extraPayment, setExtraPayment] = useState("");
  const [paymentOption, setPaymentOption] = useState<"reduce_emi" | "reduce_tenure">("reduce_emi");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-calculated values
  const outstanding = getEstimatedOutstanding(loan.totalAmount, loan.monthsCompleted, loan.emiAmount);
  const remainingMonths = getRemainingMonths(loan.totalTenureMonths, loan.monthsCompleted);

  // Real-time preview values
  const [preview, setPreview] = useState<{
    isFullClosure: boolean;
    newEmi: number;
    newRemainingMonths: number;
    monthsSaved: number;
  } | null>(null);

  useEffect(() => {
    const extraVal = parseFloat(extraPayment);
    if (isNaN(extraVal) || extraVal <= 0) {
      setPreview(null);
      return;
    }

    if (extraVal >= outstanding) {
      setPreview({
        isFullClosure: true,
        newEmi: 0,
        newRemainingMonths: 0,
        monthsSaved: remainingMonths,
      });
    } else {
      const newOutstanding = outstanding - extraVal;
      
      // Option 1: Reduce EMI
      const recalculatedEmi = Math.max(1, Math.round(newOutstanding / remainingMonths));
      
      // Option 2: Reduce Tenure
      const recalculatedRemaining = Math.max(1, Math.round(newOutstanding / loan.emiAmount));
      const saved = Math.max(0, remainingMonths - recalculatedRemaining);

      setPreview({
        isFullClosure: false,
        newEmi: recalculatedEmi,
        newRemainingMonths: recalculatedRemaining,
        monthsSaved: saved,
      });
    }
  }, [extraPayment, outstanding, remainingMonths, loan.emiAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const extraVal = parseFloat(extraPayment);
    if (isNaN(extraVal) || extraVal <= 0) {
      setError("Please enter a valid extra payment amount greater than zero.");
      return;
    }

    setLoading(true);
    try {
      await onConfirmPayment(loan.loanId, extraVal, paymentOption);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log part-payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative border border-slate-100 my-8">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-1 flex items-center gap-1.5">
          <Calculator className="w-5 h-5 text-emerald-600" />
          Part-Payment & Pre-Closure
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-4">
          Recalculate your loan parameters by logging an extra lump-sum payment.
        </p>

        {/* Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Loan Commitment</span>
            <span className="font-bold text-slate-700">{loan.nickname} ({loan.provider})</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Current Monthly EMI</span>
            <span className="font-bold text-slate-700">{formatCurrency(loan.emiAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Estimated Balance Left</span>
            <span className="font-extrabold text-emerald-700">{formatCurrency(outstanding)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Extra Amount */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5" htmlFor="extraPayment">
              Extra Lump-Sum Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
              <input
                id="extraPayment"
                type="number"
                min="1"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Any amount paid directly reduces your remaining balance of {formatCurrency(outstanding)}.
            </p>
          </div>

          {/* Recalculate Options */}
          {preview && !preview.isFullClosure && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-slate-500">
                How would you like to apply the savings?
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Option 1: Reduce EMI */}
                <button
                  type="button"
                  onClick={() => setPaymentOption("reduce_emi")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer h-24 ${
                    paymentOption === "reduce_emi"
                      ? "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between w-full items-start">
                    <DollarSign className={`w-4 h-4 ${paymentOption === "reduce_emi" ? "text-emerald-600" : "text-slate-400"}`} />
                    {paymentOption === "reduce_emi" && (
                      <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 leading-tight">Reduce Monthly EMI</h4>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">Pay less every month. Keep tenure same.</p>
                  </div>
                </button>

                {/* Option 2: Reduce Tenure */}
                <button
                  type="button"
                  onClick={() => setPaymentOption("reduce_tenure")}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer h-24 ${
                    paymentOption === "reduce_tenure"
                      ? "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between w-full items-start">
                    <Clock className={`w-4 h-4 ${paymentOption === "reduce_tenure" ? "text-emerald-600" : "text-slate-400"}`} />
                    {paymentOption === "reduce_tenure" && (
                      <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 leading-tight">Shorten Tenure</h4>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">Keep EMI amount. Clear debt faster.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Preview Box */}
          {preview && (
            <div className="p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-emerald-300 text-emerald-600" />
                Savings Preview
              </h4>
              {preview.isFullClosure ? (
                <p className="text-xs text-emerald-700 leading-normal font-medium">
                  🎉 <strong>Outstanding Fully Cleared!</strong> Clicking confirm will close this loan. You will save <strong>{preview.monthsSaved} months</strong> of obligations!
                </p>
              ) : paymentOption === "reduce_emi" ? (
                <div className="space-y-1">
                  <p className="text-xs text-emerald-700 leading-normal font-medium">
                    Your monthly payment will fall from <strong>{formatCurrency(loan.emiAmount)}</strong> to <strong className="text-emerald-800 text-sm">{formatCurrency(preview.newEmi)}</strong>.
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Remaining tenure stays at {preview.newRemainingMonths} months.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-emerald-700 leading-normal font-medium">
                    Your tenure will be shortened by <strong className="text-emerald-800 text-sm">{preview.monthsSaved} months</strong>!
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    You will make {preview.newRemainingMonths} more payments of {formatCurrency(loan.emiAmount)} (reduced from {remainingMonths} remaining).
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Submit buttons */}
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
              {loading ? "Processing..." : preview?.isFullClosure ? "Pre-Close Loan" : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
