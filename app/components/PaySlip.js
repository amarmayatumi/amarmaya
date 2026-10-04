"use client";

export function generatePaySlipHTML(group, entries, settings) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthName = monthNames[group.monthIndex];
  const year = group.year;

  const hourlyRate = parseFloat(settings.hourlyRate) || 0;
  const tiffinRate = parseFloat(settings.tiffinRate) || 30;
  const nightRate  = parseFloat(settings.nightRate)  || 50;
  const gross      = parseFloat(settings.gross)      || 0;
  const bonus      = parseFloat(settings.bonus)      || 0;
  const basic      = parseFloat(settings.basic)      || Math.round(gross * 0.55);
  const house      = parseFloat(settings.house)      || Math.round(gross * 0.275);
  const medical    = parseFloat(settings.medical)    || 750;
  const transport  = parseFloat(settings.transport)  || 450;
  const food       = parseFloat(settings.food)       || 1250;
  const name       = settings.name  || "Employee";
  const floor      = settings.floor || "—";
  const holidayMultiplier = parseFloat(settings.holidayMultiplier) || 2.0;

  // Public Holidays 2026 (Month starting from 0)
  const holidays2026 = {
    "0-1": "New Year", "1-21": "Shaheed Day", "2-17": "Bangabandhu B-day", 
    "2-19": "Eid-ul-Fitr", "2-20": "Eid-ul-Fitr", "2-21": "Eid-ul-Fitr", "2-22": "Eid-ul-Fitr", "2-23": "Eid-ul-Fitr",
    "2-26": "Independence Day", "3-14": "Pohela Boishakh", "4-1": "May Day", 
    "4-28": "Eid-ul-Azha", "4-29": "Eid-ul-Azha", "4-30": "Eid-ul-Azha",
    "5-26": "Ashura", "7-5": "July Mass Uprising Day", "7-26": "Eid-e-Miladunnabi", "9-21": "Durga Puja",
    "11-16": "Victory Day", "11-25": "Christmas"
  };

  // Get all entries for the selected month
  const monthKey = `${year}-${String(group.monthIndex + 1).padStart(2, "0")}`;
  const monthEntries = entries
    .filter(e => e.date && e.date.startsWith(monthKey))
    .sort((a, b) => new Date(a.date + "T00:00") - new Date(b.date + "T00:00"));

  let totalOtHrs = 0, totalOtEarnings = 0, totalTiffin = 0, totalNight = 0, totalFriday = 0;
  let workDays = 0, leaveDays = 0, fridayOffDays = 0;
  let otherEarnings = 0;
  const otRows = [];
  const otherRows = [];

  monthEntries.forEach(e => {
    const d = new Date(e.date + "T00:00:00");
    const dateStr = `${String(d.getDate()).padStart(2,"0")} ${monthNames[d.getMonth()].slice(0,3)}`;
    const dayStr  = d.toLocaleDateString("en-US", { weekday: "short" });
    const holKey  = `${d.getMonth()}-${d.getDate()}`;
    const isFridayOrHoliday = !!holidays2026[holKey];

    if (e.type === "work" || !e.type) {
      const ot     = parseFloat(e.ot) || 0;
      const currentRate = isFridayOrHoliday ? (hourlyRate * holidayMultiplier) : hourlyRate;
      const earn   = ot * currentRate;
      const tiff   = e.tiffin ? tiffinRate : 0;
      const ngt    = e.night  ? nightRate  : 0;
      const fri    = parseFloat(e.friday) || 0;
      const rowTotal = earn + tiff + ngt + fri;

      totalOtHrs      += ot;
      totalOtEarnings += earn;
      totalTiffin     += tiff;
      totalNight      += ngt;
      totalFriday     += fri;
      workDays++;

      otRows.push(`
        <tr>
          <td>
            ${dateStr} <span class="day-badge">${dayStr}</span>
            ${isFridayOrHoliday ? `<span style="background:rgba(255, 60, 60, 0.15);color:#ff4d4d;font-size:0.65rem;padding:2px 6px;border-radius:4px;font-weight:bold;margin-left:5px">${d.getDay() === 5 ? 'FRIDAY' : 'HOLIDAY'}</span>` : ''}
          </td>
          <td class="center">${ot.toFixed(1)}${isFridayOrHoliday ? ` <span style="font-size:0.7rem;color:#ff4d4d;font-weight:600">(${holidayMultiplier.toFixed(1)}x)</span>` : ''}</td>
          <td class="center">${tiff ? "✔" : ""}</td>
          <td class="center">${ngt  ? "✔" : ""}</td>
          <td class="center">${fri  ? "৳" + fri : ""}</td>
          <td class="amt">৳${Math.round(rowTotal).toLocaleString()}</td>
        </tr>
      `);
    } else {
      const typeLabel = {
        "leave": "Leave (Chuti)",
        "friday-off": "Friday Off",
        "eid-bonus": "Eid Bonus",
        "earned-leave": "Earned Leave",
      }[e.type] || e.type.toUpperCase();

      const amt = parseFloat(e.amount) || 0;
      otherEarnings += amt;

      if (e.type === "leave") leaveDays++;
      if (e.type === "friday-off") fridayOffDays++;

      otherRows.push(`
        <tr>
          <td>${dateStr}<span class="day-badge">${dayStr}</span></td>
          <td colspan="4" style="color:#ffd500">${typeLabel}</td>
          <td class="amt" style="color:#ffd500">${amt ? "৳" + Math.round(amt).toLocaleString() : "—"}</td>
        </tr>
      `);
    }
  });

  const totalOtBlock = totalOtEarnings + totalTiffin + totalNight + totalFriday;
  const grandTotal   = gross + bonus + totalOtBlock + otherEarnings;
  const today        = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Pay Slip – ${name} – ${monthName} ${year}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: #f0f2f5;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── TOOLBAR ────────────────────────────────── */
    .premium-toolbar {
      background: #0d0d12;
      color: #fff;
      padding: 15px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #222;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .toolbar-logo { font-weight: 800; color: #00f3ff; font-size: 1rem; display: flex; align-items: center; gap: 8px; }
    .toolbar-actions { display: flex; gap: 10px; }
    .toolbar-btn {
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print { background: linear-gradient(135deg, #00f3ff, #0070f3); color: #000; }
    .btn-print:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,243,255,0.4); }
    .btn-copy { background: #222; color: #fff; border: 1px solid #444; }
    .btn-copy:hover { background: #333; }
    .btn-close { background: #ff334b; color: #fff; }
    .btn-close:hover { background: #ff556b; }

    .page {
      max-width: 820px;
      margin: 30px auto;
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }

    /* ── HEADER ─────────────────────────────────── */
    .top-bar {
      background: linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%);
      padding: 35px 40px;
      position: relative;
      overflow: hidden;
    }
    .top-bar::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at 20% 50%, rgba(0,243,255,0.12), transparent 50%),
                  radial-gradient(circle at 80% 50%, rgba(189,0,255,0.12), transparent 50%);
    }
    .top-inner {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 54px; height: 54px;
      background: linear-gradient(135deg, #00f3ff, #bd00ff);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem;
    }
    .brand-text h1 { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: 2px; }
    .brand-text p  { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px; }

    .slip-title { text-align: right; }
    .slip-title h2 { font-size: 2rem; font-weight: 800; color: #fff; letter-spacing: 3px; }
    .slip-title p  { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 4px; }

    /* ── EMPLOYEE INFO ───────────────────────────── */
    .emp-bar {
      background: #f8f8fa;
      border-bottom: 1px solid #eee;
      padding: 20px 40px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .emp-bar .info-item label { font-size: 0.68rem; color: #999; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
    .emp-bar .info-item span  { font-size: 0.95rem; font-weight: 700; color: #111; }

    /* ── BODY ───────────────────────────────────── */
    .body { padding: 30px 40px; }

    /* ── SECTION TITLE ──────────────────────────── */
    .s-title {
      font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1.5px; color: #aaa;
      margin: 25px 0 12px;
      display: flex; align-items: center; gap: 8px;
    }
    .s-title::after { content: ''; flex: 1; height: 1px; background: #eee; }

    /* ── SALARY GRID ────────────────────────────── */
    .salary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 5px;
    }
    .s-card {
      border: 1px solid #eee;
      border-radius: 12px;
      padding: 14px 16px;
      background: #fdfdfd;
    }
    .s-card.highlight { border-color: rgba(0,243,255,0.3); background: rgba(0,243,255,0.04); }
    .s-card .lbl { font-size: 0.72rem; color: #aaa; text-transform: uppercase; margin-bottom: 4px; }
    .s-card .val { font-size: 1.15rem; font-weight: 700; color: #111; }
    .s-card.highlight .val { color: #0070f3; }

    /* ── OT TABLE ───────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    thead tr { background: #0a0a0f; color: #fff; }
    thead th { padding: 11px 12px; text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) td { background: #fafafa; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; color: #333; }
    .day-badge { display: inline-block; margin-left: 6px; font-size: 0.65rem; color: #aaa; text-transform: uppercase; }
    td.center { text-align: center; color: #00a87e; }
    td.amt  { text-align: right; font-weight: 700; color: #0a0a0f; }

    /* ── OT SUMMARY ROW ─────────────────────────── */
    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    .sum-card { background: #f5f5f8; border-radius: 10px; padding: 12px 15px; }
    .sum-card .lbl { font-size: 0.7rem; color: #999; margin-bottom: 3px; }
    .sum-card .val { font-size: 1rem; font-weight: 700; color: #111; }

    /* ── GRAND TOTAL ─────────────────────────────── */
    .grand-total {
      margin-top: 25px;
      background: linear-gradient(135deg, #0a0a0f, #1a0a2e);
      border-radius: 18px;
      padding: 28px 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .grand-total::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at 0% 50%, rgba(0,243,255,0.1), transparent 60%),
                  radial-gradient(circle at 100% 50%, rgba(189,0,255,0.1), transparent 60%);
    }
    .gt-left { position: relative; }
    .gt-label { font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .gt-breakdown { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin-top: 8px; }
    .gt-amount {
      position: relative;
      font-size: 3rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -1px;
      line-height: 1;
    }
    .gt-amount .currency { font-size: 1.8rem; opacity: 0.7; margin-right: 4px; }
    .gt-amount .glow { color: #00f3ff; text-shadow: 0 0 30px rgba(0,243,255,0.5); }

    /* ── FOOTER ─────────────────────────────────── */
    .footer {
      padding: 18px 40px;
      background: #f8f8fa;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #aaa;
    }

    @media print {
      body { background: #fff; }
      .page { margin: 0; border-radius: 0; box-shadow: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- PREMIUM TOOLBAR -->
  <div class="premium-toolbar no-print">
    <div class="toolbar-logo">
      <span>⚡</span> MY OVERTIME
    </div>
    <div class="toolbar-actions">
      <button class="toolbar-btn btn-print" onclick="window.print()">
        Print / PDF
      </button>
      <button class="toolbar-btn btn-copy" id="btn-copy">
        Copy Text Summary
      </button>
      <button class="toolbar-btn btn-close" onclick="window.close()">
        Close
      </button>
    </div>
  </div>

  <div class="page">

    <!-- HEADER -->
    <div class="top-bar">
      <div class="top-inner">
        <div class="brand">
          <div class="brand-icon">⚡</div>
          <div class="brand-text">
            <h1>MY OVERTIME</h1>
            <p>Overtime &amp; Salary Tracker</p>
          </div>
        </div>
        <div class="slip-title">
          <h2>PAY SLIP</h2>
          <p>${monthName.toUpperCase()} ${year}</p>
        </div>
      </div>
    </div>

    <!-- EMPLOYEE INFO BAR -->
    <div class="emp-bar">
      <div class="info-item"><label>Employee Name</label><span>${name}</span></div>
      <div class="info-item"><label>Floor / Unit</label><span>${floor}</span></div>
      <div class="info-item"><label>Pay Period</label><span>${monthName} ${year}</span></div>
      <div class="info-item"><label>Issue Date</label><span>${today}</span></div>
    </div>

    <div class="body">

      <!-- FIXED SALARY -->
      <div class="s-title">Fixed Monthly Salary</div>
      <div class="salary-grid">
        <div class="s-card highlight"><div class="lbl">Gross Salary</div><div class="val">৳${gross.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">Basic</div><div class="val">৳${basic.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">House Rent</div><div class="val">৳${house.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">Medical</div><div class="val">৳${medical.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">Transport</div><div class="val">৳${transport.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">Food</div><div class="val">৳${food.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">Attendance Bonus</div><div class="val">৳${bonus.toLocaleString()}</div></div>
        <div class="s-card"><div class="lbl">OT Rate / hr</div><div class="val">৳${hourlyRate.toFixed(2)}</div></div>
        <div class="s-card"><div class="lbl">Work Days</div><div class="val">${workDays} days</div></div>
      </div>

      <!-- OVERTIME ENTRIES -->
      <div class="s-title">Overtime &amp; Work Entries (${totalOtHrs.toFixed(1)} hrs)</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="center">OT Hrs</th>
            <th class="center">Tiffin</th>
            <th class="center">Night</th>
            <th class="center">Fri. Bill</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${otRows.join("") || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No overtime entries</td></tr>'}
          <tr style="background:#f0f0f0">
            <td style="font-weight:700">SUBTOTAL</td>
            <td class="center" style="font-weight:700">${totalOtHrs.toFixed(1)} hrs</td>
            <td class="center" style="color:#0a0a0f;font-weight:700">৳${totalTiffin}</td>
            <td class="center" style="color:#0a0a0f;font-weight:700">৳${totalNight}</td>
            <td class="center" style="color:#0a0a0f;font-weight:700">৳${totalFriday}</td>
            <td class="amt">৳${Math.round(totalOtBlock).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- OT SUMMARY CARDS -->
      <div class="summary-row">
        <div class="sum-card"><div class="lbl">OT Earnings</div><div class="val">৳${Math.round(totalOtEarnings).toLocaleString()}</div></div>
        <div class="sum-card"><div class="lbl">Tiffin Bill</div><div class="val">৳${totalTiffin.toLocaleString()}</div></div>
        <div class="sum-card"><div class="lbl">Night Bill</div><div class="val">৳${totalNight.toLocaleString()}</div></div>
        <div class="sum-card"><div class="lbl">Friday Bill</div><div class="val">৳${totalFriday.toLocaleString()}</div></div>
      </div>

      ${otherRows.length > 0 ? `
      <!-- OTHER ENTRIES -->
      <div class="s-title">Other Entries (Leave / Bonus)</div>
      <table>
        <thead><tr><th>Date</th><th class="center" colspan="4">Type</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${otherRows.join("")}</tbody>
      </table>
      ` : ""}

      <!-- GRAND TOTAL -->
      <div class="grand-total">
        <div class="gt-left">
          <div class="gt-label">Total Net Pay — ${monthName} ${year}</div>
          <div class="gt-amount">
            <span class="currency">৳</span><span class="glow">${Math.round(grandTotal).toLocaleString()}</span>
          </div>
          <div class="gt-breakdown">
            Gross ৳${gross.toLocaleString()} + Bonus ৳${bonus.toLocaleString()} + OT ৳${Math.round(totalOtBlock).toLocaleString()}${otherEarnings ? ` + Other ৳${Math.round(otherEarnings).toLocaleString()}` : ""}
          </div>
        </div>
        <div style="position:relative;font-size:4rem;opacity:0.15">⚡</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <span>Generated by My Overtime &nbsp;·&nbsp; ${monthName} ${year}</span>
      <span>This is a system-generated document.</span>
    </div>
  </div>

  <script>
    document.getElementById('btn-copy').addEventListener('click', () => {
      const summaryText = \`My Overtime Pay Slip - ${name}\\nMonth: ${monthName} ${year}\\nGross Salary: ৳${gross.toLocaleString()}\\nBasic Salary: ৳${basic.toLocaleString()}\\nWork Days: ${workDays} days\\nOT Hours: ${totalOtHrs.toFixed(1)} hrs\\nOT Earnings: ৳${Math.round(totalOtEarnings).toLocaleString()}\\nTotal Net Pay: ৳${Math.round(grandTotal).toLocaleString()}\\nGenerated by My Overtime Tracker.\`;
      navigator.clipboard.writeText(summaryText)
        .then(() => alert('Pay slip summary copied to clipboard!'))
        .catch(() => alert('Failed to copy to clipboard.'));
    });
  </script>
</body>
</html>`;
}
