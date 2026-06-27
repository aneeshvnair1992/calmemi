"use client";

import React, { useState } from "react";
import { updateProfile, UserProfile } from "../lib/storage";
import { Coins, User, ArrowRight, ArrowLeft } from "lucide-react";

interface OnboardingWizardProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || "");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Please tell us your name.");
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const incomeVal = parseFloat(monthlyIncome);
    if (isNaN(incomeVal) || incomeVal <= 0) {
      setError("Please enter a valid monthly income greater than zero.");
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        name,
        monthlyIncome: incomeVal,
        onboardingCompleted: true,
      };
      await updateProfile(user.uid, updatedData);
      onComplete({
        ...user,
        ...updatedData,
      });
    } catch (err: any) {
      setError(err.message || "Failed to save details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-slate-50 relative overflow-hidden select-none">
      {/* Background radial soft light */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-50 blur-3xl -z-10" />
      
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-8">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${step >= 1 ? "bg-emerald-500" : "bg-slate-100"}`} />
          <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${step >= 2 ? "bg-emerald-500" : "bg-slate-100"}`} />
        </div>

        {step === 1 ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">What should we call you?</h2>
            <p className="text-slate-500 text-sm mb-6">
              We personalize your dashboard so it feels tailored for you and your family.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="onb-name">
                  First Name or Nickname
                </label>
                <input
                  id="onb-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-medium rounded-xl text-sm hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
              <Coins className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">What is your monthly income?</h2>
            <p className="text-slate-500 text-sm mb-6">
              This helps calculate your <strong>"Breathing Room"</strong>—the safe-to-spend balance after obligations.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="onb-income">
                  Net Monthly Take-Home Income
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                  <input
                    id="onb-income"
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="5,500"
                    min="1"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  🔒 We encrypt and secure your data. This metric is used solely for your dashboard calculations.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? "Saving..." : "Start Managing"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
