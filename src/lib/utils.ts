let activeCurrencyCode = "USD";

export function setGlobalCurrency(code: string) {
  activeCurrencyCode = code;
}

export function getGlobalCurrency(): string {
  return activeCurrencyCode;
}

/**
 * Format a number as currency (USD format by default, supports INR en-IN formatting).
 */
export function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat(activeCurrencyCode === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: activeCurrencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

/**
 * Calculates remaining months.
 */
export function getRemainingMonths(totalTenureMonths: number, monthsCompleted: number): number {
  return Math.max(0, totalTenureMonths - monthsCompleted);
}

/**
 * Calculates percentage of the loan completed based on tenure.
 */
export function getPercentCompleted(totalTenureMonths: number, monthsCompleted: number): number {
  if (totalTenureMonths <= 0) return 0;
  return Math.min(100, Math.round((monthsCompleted / totalTenureMonths) * 100));
}

/**
 * Get estimated remaining principal / repayable amount.
 */
export function getEstimatedOutstanding(
  totalAmount: number,
  monthsCompleted: number,
  emiAmount: number
): number {
  return Math.max(0, totalAmount - monthsCompleted * emiAmount);
}

/**
 * Returns a date string (YYYY-MM-DD) for the next due date based on the due day.
 * If the current day is past the due day in the current month, it targets next month.
 */
export function getNextEmiDateString(dueDay: number): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  // If today is past the due day, schedule for the next month
  if (now.getDate() > dueDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  // Handle month length (e.g. 31st on a 30-day month)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(dueDay, daysInMonth);

  const targetDate = new Date(year, month, targetDay);
  return targetDate.toISOString().split("T")[0];
}

/**
 * Calculate the number of calendar days between today and the due date.
 * Can be negative if overdue.
 */
export function getDaysRemaining(dueDateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateString);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats a YYYY-MM-DD date string into a user-friendly format (e.g. "Jul 15, 2026").
 */
export function formatFriendlyDate(dateString: string): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  // Create Date using local timezone to prevent UTC timezone shift issues
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
