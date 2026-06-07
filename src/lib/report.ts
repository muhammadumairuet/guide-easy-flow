// Client-side report generation: a one-page PDF summary and a plain-text summary.

import { jsPDF } from "jspdf";
import type { AnalysisResult } from "./predictor";
import { STOCKS } from "./stock-data";

function modelName(m: AnalysisResult["model"]) {
  return m === "logistic" ? "Logistic Regression" : "Momentum";
}

export function buildTextSummary(result: AnalysisResult, dataSource: string): string {
  const name = STOCKS.find((s) => s.symbol === result.symbol)?.name ?? result.symbol;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    `StockSight prediction — ${result.symbol} (${name})`,
    `Prediction: likely to close ${result.direction} tomorrow`,
    `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
    `Last close: $${result.lastClose.toFixed(2)}`,
    `Model: ${modelName(result.model)} · Data: ${dataSource}`,
    `Accuracy: ${pct(result.accuracy)} · F1 score: ${result.f1.toFixed(2)}`,
    `Strategy return: ${pct(result.strategyReturn)} vs Buy & hold: ${pct(result.buyHoldReturn)}`,
    ``,
    `Educational demo only — not financial advice.`,
  ].join("\n");
}

export function downloadPdfReport(result: AnalysisResult, dataSource: string): void {
  const name = STOCKS.find((s) => s.symbol === result.symbol)?.name ?? result.symbol;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("StockSight Analysis Report", 48, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 48, y);
  doc.setTextColor(0);
  y += 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${result.symbol} — ${name}`, 48, y);
  y += 30;

  // Prediction banner
  const up = result.direction === "UP";
  if (up) doc.setFillColor(220, 252, 231);
  else doc.setFillColor(254, 226, 226);
  doc.roundedRect(48, y - 18, W - 96, 64, 8, 8, "F");
  doc.setFontSize(18);
  doc.setTextColor(up ? 21 : 153, up ? 128 : 27, up ? 61 : 27);
  doc.text(`Likely to close ${result.direction} tomorrow`, 64, y + 6);
  doc.setFontSize(12);
  doc.text(`Confidence: ${(result.confidence * 100).toFixed(0)}%`, 64, y + 28);
  doc.setTextColor(0);
  y += 80;

  const rows: [string, string][] = [
    ["Last close", `$${result.lastClose.toFixed(2)}`],
    ["Model", modelName(result.model)],
    ["Data source", dataSource],
    ["Accuracy (hold-out)", pct(result.accuracy)],
    ["F1 score", result.f1.toFixed(2)],
    ["Strategy return", pct(result.strategyReturn)],
    ["Buy & hold return", pct(result.buyHoldReturn)],
  ];
  doc.setFontSize(12);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 48, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 260, y);
    y += 24;
  }

  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(120);
  const disclaimer = doc.splitTextToSize(
    "Educational demo using a lightweight in-browser model. This is not financial advice — do not trade real money based on these predictions.",
    W - 96,
  );
  doc.text(disclaimer, 48, y);

  doc.save(`stocksight-${result.symbol}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
