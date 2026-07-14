import { Loan, UserProfile } from "./storage";
import { getEstimatedOutstanding, getRemainingMonths, formatCurrency } from "./utils";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to escape CSV values
function escapeCSV(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports loan and profile data as a CSV download
 */
export function exportToCSV(loans: Loan[], profile: UserProfile) {
  const headers = [
    "Loan Nickname",
    "Lender / Provider",
    "Loan Type",
    "Total Principal",
    "Monthly EMI",
    "Total Tenure (Months)",
    "Months Completed",
    "Remaining Months",
    "Outstanding Balance",
    "EMI Due Day",
    "Next EMI Date",
    "Status",
    "Skip Active This Month"
  ];

  const rows = loans.map((loan) => {
    const remainingMonths = getRemainingMonths(loan.totalTenureMonths, loan.monthsCompleted);
    const outstanding = getEstimatedOutstanding(loan.totalAmount, loan.monthsCompleted, loan.emiAmount);
    return [
      escapeCSV(loan.nickname),
      escapeCSV(loan.provider),
      escapeCSV(loan.loanType),
      loan.totalAmount,
      loan.emiAmount,
      loan.totalTenureMonths,
      loan.monthsCompleted,
      remainingMonths,
      outstanding,
      loan.emiDayOfMonth,
      loan.nextEmiDate,
      loan.status,
      loan.pendingMissed ? "Yes" : "No"
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `calmemi_portfolio_${profile.name.replace(/\s+/g, "_").toLowerCase()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports loan and profile data as an Excel (.xlsx) workbook download
 */
export function exportToExcel(loans: Loan[], profile: UserProfile) {
  const activeLoans = loans.filter((l) => l.status === "Active" || l.status === "Paused");
  const totalActiveEmis = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const currency = profile.currency || "USD";

  // Summary sheet data
  const summaryData = [
    { "Portfolio Summary": "Owner Name", "Value": profile.name },
    { "Portfolio Summary": "Email Address", "Value": profile.email },
    { "Portfolio Summary": "Monthly Income", "Value": profile.monthlyIncome },
    { "Portfolio Summary": "Currency", "Value": currency },
    { "Portfolio Summary": "Total Monthly EMI Commitments", "Value": totalActiveEmis },
    { "Portfolio Summary": "Breathing Room", "Value": Math.max(0, profile.monthlyIncome - totalActiveEmis) },
    { "Portfolio Summary": "Active Loans Count", "Value": loans.filter((l) => l.status === "Active").length },
    { "Portfolio Summary": "Paused Loans Count", "Value": loans.filter((l) => l.status === "Paused").length },
    { "Portfolio Summary": "Completed Loans Count", "Value": loans.filter((l) => l.status === "Closed").length },
    { "Portfolio Summary": "Export Date", "Value": new Date().toLocaleDateString() }
  ];

  // Loans details sheet data
  const loansData = loans.map((loan) => {
    const remainingMonths = getRemainingMonths(loan.totalTenureMonths, loan.monthsCompleted);
    const outstanding = getEstimatedOutstanding(loan.totalAmount, loan.monthsCompleted, loan.emiAmount);
    return {
      "Nickname": loan.nickname,
      "Lender": loan.provider,
      "Type": loan.loanType,
      "Total Amount": loan.totalAmount,
      "Monthly EMI": loan.emiAmount,
      "Tenure (Months)": loan.totalTenureMonths,
      "Completed (Months)": loan.monthsCompleted,
      "Remaining (Months)": remainingMonths,
      "Estimated Outstanding": outstanding,
      "Due Day": loan.emiDayOfMonth,
      "Next Due Date": loan.nextEmiDate,
      "Status": loan.status,
      "Skip Active This Month": loan.pendingMissed ? "Yes" : "No"
    };
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  const wsLoans = XLSX.utils.json_to_sheet(loansData);

  // Basic styling configurations can go here if needed, but standard sheets work great
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  XLSX.utils.book_append_sheet(wb, wsLoans, "Obligations");

  XLSX.writeFile(wb, `calmemi_portfolio_${profile.name.replace(/\s+/g, "_").toLowerCase()}.xlsx`);
}

/**
 * Exports loan and profile data as a formatted PDF download
 */
export function exportToPDF(loans: Loan[], profile: UserProfile) {
  const doc = new jsPDF();
  const currency = profile.currency || "USD";
  const activeLoans = loans.filter((l) => l.status === "Active" || l.status === "Paused");
  const completedLoans = loans.filter((l) => l.status === "Closed");
  const totalActiveEmis = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const breathingRoom = Math.max(0, profile.monthlyIncome - totalActiveEmis);
  const emiRatio = profile.monthlyIncome > 0 ? (totalActiveEmis / profile.monthlyIncome) * 100 : 0;

  // Local helper to format currency using safe currency codes instead of special symbols
  // which Helvetica font in jsPDF fails to render correctly (shows boxes or question marks)
  const formatPDFCurrency = (num: number) => {
    return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("calm.emi", 14, 20);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Clarity over Anxiety — Portfolio Report", 14, 25);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);
  
  // Divider
  doc.setDrawColor(241, 245, 249); // Slate 100
  doc.line(14, 34, 196, 34);

  // Profile Summary Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, 38, 182, 45, 4, 4, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Portfolio of ${profile.name}`, 18, 45);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(`Email: ${profile.email}`, 18, 50);

  // Summary Metrics Columns
  doc.setFont("Helvetica", "bold");
  doc.text("Monthly Income:", 18, 62);
  doc.setFont("Helvetica", "normal");
  doc.text(formatPDFCurrency(profile.monthlyIncome), 50, 62);

  doc.setFont("Helvetica", "bold");
  doc.text("Total Monthly EMI:", 18, 68);
  doc.setFont("Helvetica", "normal");
  doc.text(formatPDFCurrency(totalActiveEmis), 50, 68);

  doc.setFont("Helvetica", "bold");
  doc.text("Breathing Room:", 18, 74);
  doc.setFont("Helvetica", "bold");
  // Set breathing room color based on healthy threshold
  if (emiRatio > 60) {
    doc.setTextColor(225, 29, 72); // Rose 600
  } else if (emiRatio >= 40) {
    doc.setTextColor(217, 119, 6); // Amber 600
  } else {
    doc.setTextColor(5, 150, 105); // Emerald 600
  }
  doc.text(formatPDFCurrency(breathingRoom), 50, 74);
  doc.setTextColor(71, 85, 105);
  doc.setFont("Helvetica", "normal");

  // Right Column Metrics
  doc.setFont("Helvetica", "bold");
  doc.text("DTI Ratio:", 110, 62);
  doc.setFont("Helvetica", "normal");
  doc.text(`${Math.round(emiRatio)}%`, 142, 62);

  doc.setFont("Helvetica", "bold");
  doc.text("Active obligations:", 110, 68);
  doc.setFont("Helvetica", "normal");
  doc.text(`${activeLoans.length} commitments`, 142, 68);

  doc.setFont("Helvetica", "bold");
  doc.text("Completed debts:", 110, 74);
  doc.setFont("Helvetica", "normal");
  doc.text(`${completedLoans.length} closed`, 142, 74);

  let currentY = 93;

  // Active Loans Table
  if (activeLoans.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Active Commitments", 14, currentY);
    currentY += 4;

    const activeHeaders = [
      ["Nickname", "Lender", "Type", "Monthly EMI", "Paid / Total", "Outstanding", "Due Day"]
    ];

    const activeRows = activeLoans.map((loan) => {
      const outstanding = getEstimatedOutstanding(loan.totalAmount, loan.monthsCompleted, loan.emiAmount);
      return [
        loan.nickname,
        loan.provider,
        loan.loanType,
        formatPDFCurrency(loan.emiAmount),
        `${loan.monthsCompleted}/${loan.totalTenureMonths} mo`,
        formatPDFCurrency(outstanding),
        `${loan.emiDayOfMonth}th`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: activeHeaders,
      body: activeRows,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: "auto" },
        2: { cellWidth: "auto" },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "center", cellWidth: 22 },
        5: { halign: "right", cellWidth: 32 },
        6: { halign: "center", cellWidth: 18 }
      },
      margin: { left: 14, right: 14 }
    });

    // Update currentY using last draw position
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Completed Loans Table
  if (completedLoans.length > 0) {
    // Check if it fits on page, else add page
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(100, 116, 139);
    doc.text("Completed Commitments (Closed)", 14, currentY);
    currentY += 4;

    const completedHeaders = [
      ["Nickname", "Lender", "Type", "Monthly EMI", "Tenure Paid", "Status"]
    ];

    const completedRows = completedLoans.map((loan) => [
      loan.nickname,
      loan.provider,
      loan.loanType,
      formatPDFCurrency(loan.emiAmount),
      `${loan.totalTenureMonths} months`,
      "Closed & Free"
    ]);

    autoTable(doc, {
      startY: currentY,
      head: completedHeaders,
      body: completedRows,
      theme: "striped",
      headStyles: { fillColor: [100, 116, 139], fontSize: 8.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [100, 116, 139] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: "auto" },
        2: { cellWidth: "auto" },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "center", cellWidth: 28 },
        5: { halign: "center", cellWidth: 28 }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Check if footer fits
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  // Empathetic footer message
  doc.setDrawColor(241, 245, 249);
  doc.line(14, 268, 196, 268);
  
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("EMI tracking designed with empathy. Focus on remaining periods and Breathing Room. You are in control of your financial calendar.", 14, 275);
  doc.text("calm.emi — Clarity over anxiety", 158, 275);

  doc.save(`calmemi_portfolio_${profile.name.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}
