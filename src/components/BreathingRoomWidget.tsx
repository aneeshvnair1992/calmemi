"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, getPercentCompleted } from "../lib/utils";
import { addFcmToken } from "../lib/storage";
import { Bell, BellRing, Sparkles, AlertCircle, Info, ChevronRight, Edit2 } from "lucide-react";

interface BreathingRoomWidgetProps {
  uid: string;
  monthlyIncome: number;
  totalActiveEmis: number;
  fcmTokens: string[];
  onUpdateIncome: () => void;
}

export default function BreathingRoomWidget({
  uid,
  monthlyIncome,
  totalActiveEmis,
  fcmTokens,
  onUpdateIncome,
}: BreathingRoomWidgetProps) {
  const [permissionStatus, setPermissionStatus] = useState<string>("default");
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [isSyncingToken, setIsSyncingToken] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
      setFcmEnabled((fcmTokens && fcmTokens.length > 0) || Notification.permission === "granted");
    }
  }, [fcmTokens]);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setIsSyncingToken(true);

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === "granted") {
        // Blueprint for FCM Web Push
        // Generate a simulated token for representation or check if service worker FCM registration is setup
        const mockFcmToken = `fcm-token-${Math.random().toString(36).substring(2)}-${Date.now()}`;
        await addFcmToken(uid, mockFcmToken);
        setFcmEnabled(true);
      }
    } catch (e) {
      console.error("Error requesting notifications permission:", e);
    } finally {
      setIsSyncingToken(false);
    }
  };

  const safeToSpend = Math.max(0, monthlyIncome - totalActiveEmis);
  const emiRatio = monthlyIncome > 0 ? (totalActiveEmis / monthlyIncome) * 100 : 0;

  // Empathy styling & content based on EMI ratio
  let zoneColor = "bg-emerald-500";
  let zoneBorder = "border-emerald-100";
  let zoneBg = "bg-emerald-50/50";
  let zoneText = "text-emerald-700";
  let emiBarColor = "bg-emerald-500";
  let empathyMessage = "Your budget is in a healthy, safe zone. You have plenty of breathing room.";
  let empathySub = "You're doing great keeping commitments below 40% of your take-home pay.";

  if (emiRatio >= 40 && emiRatio <= 60) {
    zoneColor = "bg-amber-500";
    zoneBorder = "border-amber-100";
    zoneBg = "bg-amber-50/40";
    zoneText = "text-amber-700";
    emiBarColor = "bg-amber-500";
    empathyMessage = "You have moderate breathing room, but please monitor new commitments.";
    empathySub = "Your EMIs consume a noticeable portion of your budget. Take a pause if you can.";
  } else if (emiRatio > 60) {
    zoneColor = "bg-rose-500";
    zoneBorder = "border-rose-100";
    zoneBg = "bg-rose-50/40";
    zoneText = "text-rose-700";
    emiBarColor = "bg-rose-500";
    empathyMessage = "Your commitments are heavy. Let's prioritize adding breathing room.";
    empathySub = "Over 60% of your income is locked. Use Skip Month if you need immediate peace of mind.";
  }

  return (
    <div className="space-y-6">
      {/* Web Push FCM Blueprint Banner */}
      {!fcmEnabled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-800 rounded-xl text-emerald-400 mt-0.5 sm:mt-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Enable stress-free reminders</h4>
              <p className="text-xs text-slate-300">
                Get a gentle, friendly reminder 3 days before your payments are due. No anxiety-inducing alerts.
              </p>
            </div>
          </div>
          <button
            onClick={requestNotificationPermission}
            disabled={isSyncingToken}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSyncingToken ? (
              "Setting up..."
            ) : (
              <>
                Enable Reminders
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {fcmEnabled && permissionStatus === "granted" && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-[11px] text-emerald-800">
          <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Gentle notifications are enabled. We'll ping you soft reminders before dues.</span>
        </div>
      )}

      {/* Main Metric Container */}
      <div className={`p-6 bg-white border border-slate-100 rounded-3xl shadow-sm transition-all duration-300 relative overflow-hidden`}>
        {/* Abstract background highlight */}
        <div className={`absolute top-[-30px] right-[-30px] w-28 h-28 rounded-full ${zoneColor} opacity-5 blur-2xl pointer-events-none`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Breathing Room Figure */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Your Breathing Room
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {formatCurrency(safeToSpend)}
              </h2>
              <span className="text-xs text-slate-500 font-medium">/ month safe to spend</span>
            </div>
          </div>

          {/* Ratio indicator badge */}
          <div className="flex flex-col md:items-end gap-1.5">
            <div className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${zoneColor}`} />
              <span className="text-xs font-semibold text-slate-700">
                {Math.round(emiRatio)}% Income Obligated
              </span>
            </div>
            <button
              onClick={onUpdateIncome}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 transition-all font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              Adjust Income ({formatCurrency(monthlyIncome)})
            </button>
          </div>
        </div>

        {/* Custom Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {/* Obligated Portion */}
            <div
              className={`h-full ${emiBarColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, emiRatio)}%` }}
            />
            {/* Free Portion */}
            <div
              className="h-full bg-emerald-100 transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - emiRatio)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-medium text-slate-400">
            <span>{formatCurrency(totalActiveEmis)} Obligations (EMIs)</span>
            <span>{formatCurrency(safeToSpend)} Remaining (Free)</span>
          </div>
        </div>

        {/* Empathetic copy box */}
        <div className={`mt-6 p-4 border ${zoneBorder} ${zoneBg} rounded-2xl flex gap-3 items-start`}>
          {emiRatio > 60 ? (
            <AlertCircle className={`w-5 h-5 ${zoneText} shrink-0 mt-0.5`} />
          ) : (
            <Info className={`w-5 h-5 ${zoneText} shrink-0 mt-0.5`} />
          )}
          <div>
            <p className={`text-sm font-bold ${zoneText}`}>{empathyMessage}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{empathySub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
