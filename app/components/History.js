"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../AppContext";
import * as htmlToImage from "html-to-image";
import { getLocalMonthKey } from "@/utils/localDate";

export default function History({ initialMonth }) {
  const { entries, deleteEntry, settings, showDialog } = useAppContext();
  const currentMonthStr = getLocalMonthKey();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || currentMonthStr);

  useEffect(() => {
    if (initialMonth) setSelectedMonth(initialMonth);
  }, [initialMonth]);

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Public Holidays 2026 for multiplier calculations
  const holidays2026 = {
    "0-1": "New Year", "1-21": "Shaheed Day", "2-17": "Bangabandhu B-day", 
    "2-19": "Eid-ul-Fitr", "2-20": "Eid-ul-Fitr", "2-21": "Eid-ul-Fitr", "2-22": "Eid-ul-Fitr", "2-23": "Eid-ul-Fitr",
    "2-26": "Independence Day", "3-14": "Pohela Boishakh", "4-1": "May Day", 
    "4-28": "Eid-ul-Azha", "4-29": "Eid-ul-Azha", "4-30": "Eid-ul-Azha",
    "5-26": "Ashura", "7-5": "July Mass Uprising Day", "7-26": "Eid-e-Miladunnabi", "9-21": "Durga Puja",
    "11-16": "Victory Day", "11-25": "Christmas"
  };

  const calculateEntryTotal = (e) => {
    if (e.type === "work" || !e.type) {
      const d = parseLocalDate(e.date);
      const holKey = `${d.getMonth()}-${d.getDate()}`;
      const isFridayOrHoliday = d.getFullYear() === 2026 && !!holidays2026[holKey];
      const hourlyRate = parseFloat(settings.hourlyRate) || 0;
      const holidayMultiplier = parseFloat(settings.holidayMultiplier) || 2.0;
      const currentRate = isFridayOrHoliday ? (hourlyRate * holidayMultiplier) : hourlyRate;

      let t = (parseFloat(e.ot) || 0) * currentRate;
      if (e.tiffin) t += settings.tiffinRate || 30;
      if (e.night) t += settings.nightRate || 50;
      if (e.friday) t += parseFloat(e.friday) || 0;
      return t;
    }
    return parseFloat(e.amount) || 0;
  };

  // Build available months from entries
  const monthOptions = useMemo(() => {
    const set = new Set();
    const now = getLocalMonthKey();
    set.add(now); // Always include current month
    entries.forEach((e) => {
      if (!e.date) return;
      const [y, m] = e.date.split("-");
      set.add(`${y}-${m}`);
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Filter entries by selected month
  const filteredEntries = useMemo(() => {
    if (selectedMonth === "all") return [...entries].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
    return entries
      .filter((e) => e.date && e.date.startsWith(selectedMonth))
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }, [entries, selectedMonth]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    let totalHrs = 0, tiffinAmt = 0, nightAmt = 0, otEarnings = 0, otherEarnings = 0;
    filteredEntries.forEach((e) => {
      if (e.type && e.type !== "work") {
        otherEarnings += parseFloat(e.amount) || 0;
      } else {
        const d = parseLocalDate(e.date);
        const holKey = `${d.getMonth()}-${d.getDate()}`;
        const isFridayOrHoliday = d.getFullYear() === 2026 && !!holidays2026[holKey];
        const hourlyRate = parseFloat(settings.hourlyRate) || 0;
        const holidayMultiplier = parseFloat(settings.holidayMultiplier) || 2.0;
        const currentRate = isFridayOrHoliday ? (hourlyRate * holidayMultiplier) : hourlyRate;

        const ot = parseFloat(e.ot) || 0;
        totalHrs += ot;
        otEarnings += ot * currentRate;

        if (e.friday) otEarnings += parseFloat(e.friday) || 0;
        if (e.tiffin) tiffinAmt += settings.tiffinRate || 30;
        if (e.night) nightAmt += settings.nightRate || 50;
      }
    });
    const fixedMonthly = selectedMonth !== "all"
      ? (parseFloat(settings.gross) || 0) + (parseFloat(settings.bonus) || 0)
      : 0;
    return { totalHrs, tiffinAmt, nightAmt, otEarnings, otherEarnings, fixedMonthly, grandTotal: fixedMonthly + otEarnings + tiffinAmt + nightAmt + otherEarnings };
  }, [filteredEntries, settings, selectedMonth]);

  const getMonthLabel = (ym) => {
    const [y, m] = ym.split("-");
    return new Date(y, m - 1).toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <section className="view active animate-fade-in" style={{ paddingBottom: "100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div className="page-title" style={{ marginBottom: 0 }}>History</div>
        <button 
          onClick={async () => {
            if (selectedMonth === "all") {
              await showDialog({ title: "Select Month", message: "কোনো নির্দিষ্ট মাস সিলেক্ট করে শেয়ার করুন।", type: "info" });
              return;
            }
            const node = document.getElementById('monthly-summary-card');
            if (!node) return;
            try {
              // Capture the card as an image blob
              const blob = await htmlToImage.toBlob(node, { backgroundColor: '#0a0a0a', style: { padding: '15px', borderRadius: '15px' } });
              const file = new File([blob], `OT-Summary-${selectedMonth}.png`, { type: 'image/png' });

              // If mobile supports sharing files natively
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: 'OT Summary',
                  files: [file]
                });
              } else {
                // Fallback to text if browser doesn't support file sharing
                const text = `*My Overtime - ${getMonthLabel(selectedMonth)} Summary*\n---------------------------\nOT Hours: ${monthlySummary.totalHrs.toFixed(1)}h\nOT Earnings: ৳${Math.round(monthlySummary.otEarnings)}\nTiffin Bill: ৳${monthlySummary.tiffinAmt}\nNight Bill: ৳${monthlySummary.nightAmt}\n---------------------------\n*Total: ৳${Math.round(monthlySummary.grandTotal)}*\n\n_Generated by My Overtime App_`;
                const encodedText = encodeURIComponent(text);
                window.open(`https://wa.me/?text=${encodedText}`, "_blank");
              }
            } catch (err) {
              console.error(err);
            }
          }}
          className="btn-sm" 
          style={{ background: "rgba(37, 211, 102, 0.15)", color: "#25D366", border: "1px solid #25D366", padding: "8px 12px", borderRadius: "8px", fontSize: "0.8rem", display: "flex", gap: "5px", alignItems: "center" }}>
          <i className="ri-whatsapp-line"></i> <i className="ri-image-line"></i> IMAGE 
        </button>
      </div>

      {/* Month Filter */}
      <div style={{ marginBottom: "15px" }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            width: "100%", padding: "12px", background: "#111",
            border: "1px solid #333", color: "#fff", borderRadius: "8px", fontSize: "0.95rem"
          }}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
          <option value="all">All Time (সব মাসের তথ্য)</option>
        </select>
      </div>

      {/* Monthly Summary Card */}
      {selectedMonth !== "all" && (
        <div id="monthly-summary-card" className="glass-card" style={{ marginBottom: "15px", background: "rgba(0,243,255,0.04)", border: "1px solid rgba(0,243,255,0.2)" }}>
          <div style={{ color: "var(--primary)", fontWeight: "bold", marginBottom: "12px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            <i className="ri-bar-chart-2-line"></i> {getMonthLabel(selectedMonth)} Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>OT Hours</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>{monthlySummary.totalHrs.toFixed(1)}h</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>OT Earnings</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary)" }}>৳{Math.round(monthlySummary.otEarnings)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>Tiffin Bill</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#ffd500" }}>৳{monthlySummary.tiffinAmt}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>Night Bill</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#7000ff" }}>৳{monthlySummary.nightAmt}</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #222", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#aaa" }}>Gross + Bonus + OT:</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "800", color: "#00f3ff", fontFamily: "'Courier New', monospace" }}>
              ৳{Math.round(monthlySummary.grandTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Entry List */}
      <div className="history-list">
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#666", padding: "30px" }}>No records found.</div>
        ) : (
          filteredEntries.map((e) => {
            const d = parseLocalDate(e.date);
            const amt = Math.round(calculateEntryTotal(e));
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const isWork = e.type === "work" || !e.type;

            return (
              <div
                key={e.id}
                className="glass-card-sm"
                style={{
                  display: "flex", alignItems: "center", padding: "15px", marginBottom: "10px",
                  background: "linear-gradient(135deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))",
                  borderLeft: `4px solid ${isWork ? "var(--secondary)" : "#ffd500"}`,
                  borderRadius: "12px",
                }}
              >
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "10px", textAlign: "center", marginRight: "15px", minWidth: "55px" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#fff", lineHeight: 1 }}>
                    {String(d.getDate()).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--secondary)", textTransform: "uppercase" }}>
                    {d.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>{dayName}</span>
                    {isWork && e.tiffin && <span className="badge" style={{ background: "rgba(0,243,255,0.15)", color: "var(--secondary)", padding: "2px 7px", borderRadius: "10px", fontSize: "0.65rem" }}>Tiffin</span>}
                    {isWork && e.night && <span className="badge" style={{ background: "rgba(189,0,255,0.15)", color: "#bd00ff", padding: "2px 7px", borderRadius: "10px", fontSize: "0.65rem" }}>Night</span>}
                    {isWork && parseFloat(e.friday) > 0 && <span className="badge" style={{ background: "rgba(255,56,133,0.15)", color: "#ff3885", padding: "2px 7px", borderRadius: "10px", fontSize: "0.65rem" }}>Fri</span>}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>
                    {isWork ? `${e.ot || 0} hrs OT` : String(e.type || "").toUpperCase()}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", fontFamily: "'Courier New', monospace" }}>
                    ৳{amt}
                  </div>
                  <button
                    onClick={async () => { 
                      const ok = await showDialog({ title: "Delete Entry", message: "Are you sure you want to delete this entry?", type: "danger" });
                      if (ok) deleteEntry(e.id); 
                    }}
                    style={{ marginTop: "5px", background: "rgba(255,56,56,0.15)", border: "none", color: "#ff3838", padding: "5px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
