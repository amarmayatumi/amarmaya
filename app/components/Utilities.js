"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { generatePaySlipHTML } from "./PaySlip";
import BanglaCalendarView from "./BanglaCalendarView";

export default function Utilities({ onBack, onViewMonth }) {
  const { entries, settings } = useAppContext();
  const [bnDate, setBnDate] = useState("--");
  const [bnSeason, setBnSeason] = useState("--");
  const [engDate, setEngDate] = useState("--");
  const [weather, setWeather] = useState({ 
    temp: "--°C", 
    wind: "--", 
    humidity: undefined, 
    feelsLike: "--°C", 
    rainProb: undefined, 
    desc: "Updating..." 
  });
  const [lifetimeHistory, setLifetimeHistory] = useState([]);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  useEffect(() => {
    // Bangla Date Logic
    const updateBanglaDate = () => {
      const today = new Date();
      const engDay = today.getDate();
      const engMonth = today.getMonth();
      const engYear = today.getFullYear();
      const bnMonths = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ন", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
      const bnSeasons = ["গ্রীষ্ম", "বর্ষা", "শরৎ", "হেমন্ত", "শীত", "বসন্ত"];
      const engMonthStarts = [15, 14, 15, 14, 15, 15, 16, 16, 16, 16, 15, 15];
      const bnMonthMap = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
      const startDayOfNext = engMonthStarts[engMonth];
      
      let bnMonth = 0;
      let bnDay = 1;
      let bnYear = engYear - 593;

      if (engMonth < 3 || (engMonth === 3 && engDay < 14)) bnYear = engYear - 594;
      if (engDay >= startDayOfNext) {
        bnMonth = bnMonthMap[engMonth];
        bnDay = engDay - startDayOfNext + 1;
      } else {
        bnMonth = (bnMonthMap[engMonth] - 1 + 12) % 12;
        const prevEngMonth = (engMonth - 1 + 12) % 12;
        const prevEngMonthDays = new Date(engYear, engMonth, 0).getDate();
        const startDayOfCurrent = engMonthStarts[prevEngMonth];
        const daysInPrevEng = prevEngMonthDays - startDayOfCurrent + 1;
        bnDay = daysInPrevEng + engDay;
      }
      if (bnDay < 1) {
        bnMonth = (bnMonth - 1 + 12) % 12;
        bnDay = 30;
      }
      const bnSeasonIndex = Math.floor(bnMonth / 2);
      const toBnNum = (n) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

      setBnDate(`${toBnNum(bnDay)} ${bnMonths[bnMonth]}, ${toBnNum(bnYear)}`);
      setBnSeason(bnSeasons[bnSeasonIndex] + "কাল");
      setEngDate(today.toDateString());
    };

    updateBanglaDate();

    // Weather (Dhaka coords with extended variables matching Dashboard.js)
    fetch("https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=precipitation_probability&timezone=Asia/Dhaka&forecast_days=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.current) {
          const currentHour = new Date().getHours();
          const rainProb = d.hourly?.precipitation_probability?.[currentHour] || d.hourly?.precipitation_probability?.[0] || 0;
          setWeather({
            temp: `${Math.round(d.current.temperature_2m)}°C`,
            wind: Math.round(d.current.wind_speed_10m),
            humidity: d.current.relative_humidity_2m,
            feelsLike: `${Math.round(d.current.apparent_temperature)}°C`,
            rainProb: rainProb,
            desc: d.current.precipitation > 0 ? "বৃষ্টি হচ্ছে" : rainProb > 30 ? "মেঘলা আকাশ" : "পরিষ্কার আকাশ",
          });
        }
      })
      .catch(() => {});

    // Lifetime History logic
    const groups = {};
    entries.forEach((e) => {
      if (!e.date) return;
      const [y, m, d] = e.date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = { year: dateObj.getFullYear(), monthIndex: dateObj.getMonth(), entries: [] };
      groups[key].entries.push(e);
    });

    const sortedKeys = Object.keys(groups).sort().reverse();
    setLifetimeHistory(sortedKeys.map((key) => groups[key]));

  }, [entries]);

  // Holiday Bengali translations mapping helper
  const getHolidayBnName = (engName) => {
    const mapping = {
      "New Year": "নতুন বছর (New Year)",
      "Shaheed Day": "শহীদ দিবস",
      "Bangabandhu B-day": "বঙ্গবন্ধুর জন্মদিন",
      "Eid-ul-Fitr": "ঈদুল ফিতর",
      "Independence Day": "স্বাধীনতা দিবস",
      "Pohela Boishakh": "পহেলা বৈশাখ",
      "May Day": "মে দিবস",
      "Eid-ul-Azha": "ঈদুল আজহা",
      "Ashura": "আশুরা",
      "July Mass Uprising Day": "গণ-অভ্যুত্থান দিবস",
      "Eid-e-Miladunnabi": "ঈদে মিলাদুন্নবী",
      "Durga Puja": "দুর্গাপূজা",
      "Victory Day": "বিজয় দিবস",
      "Christmas": "বড় দিন (Christmas)"
    };
    return mapping[engName] || engName;
  };

  // Get upcoming holidays list
  const getUpcomingHolidays = () => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const list = [];
    const seen = new Set();

    const holidays2026 = {
      "0-1": "New Year", "1-21": "Shaheed Day", "2-17": "Bangabandhu B-day", 
      "2-19": "Eid-ul-Fitr", "2-20": "Eid-ul-Fitr", "2-21": "Eid-ul-Fitr", "2-22": "Eid-ul-Fitr", "2-23": "Eid-ul-Fitr",
      "2-26": "Independence Day", "3-14": "Pohela Boishakh", "4-1": "May Day", 
      "4-28": "Eid-ul-Azha", "4-29": "Eid-ul-Azha", "4-30": "Eid-ul-Azha",
      "5-26": "Ashura", "7-5": "July Mass Uprising Day", "7-26": "Eid-e-Miladunnabi", "9-21": "Durga Puja",
      "11-16": "Victory Day", "11-25": "Christmas"
    };

    for (let key in holidays2026) {
      const [m, d] = key.split("-").map(Number);
      const hDate = new Date(2026, m, d);
      if (hDate >= todayMidnight) {
        const name = holidays2026[key];
        const diff = Math.ceil((hDate - todayMidnight) / (1000 * 60 * 60 * 24));
        list.push({
          name: getHolidayBnName(name),
          date: hDate,
          dateStr: hDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          diff: diff
        });
      }
    }

    list.sort((a, b) => a.date - b.date);

    const uniqueList = [];
    for (let item of list) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        uniqueList.push(item);
      }
    }
    return uniqueList.slice(0, 4);
  };

  // Ramadan 2027 countdown calculation
  const getRamadanCountdown = () => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const ramadanDate = new Date(2027, 1, 7); // Feb 7, 2027
    const diff = Math.ceil((ramadanDate - todayMidnight) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // 6-Month Overtime Trend SVG Graph Data
  const getSixMonthOTData = () => {
    const today = new Date();
    const data = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      let totalOT = 0;
      entries.forEach(e => {
        if (!e.date || e.type !== "work") return;
        const [ey, em, ed] = e.date.split("-").map(Number);
        if (ey === year && (em - 1) === month) {
          totalOT += parseFloat(e.ot) || 0;
        }
      });

      data.push({
        label: monthNames[month],
        value: totalOT,
        year: year
      });
    }
    return data;
  };

  const otData = getSixMonthOTData();
  const maxOT = Math.max(...otData.map(d => d.value), 10);

  return (
    <section className="view active animate-fade-in" style={{ paddingBottom: "100px" }}>
      <div className="page-title">INFO CENTER</div>

      {/* Bangla Calendar View */}
      <div className="glass-card util-card">
        <div className="card-title">
          <i className="ri-calendar-fill"></i> Bangla Calendar
        </div>
        <h2>{bnDate}</h2>
        <p className="season">{bnSeason}</p>
        <div className="eng-date">{engDate}</div>
        
        {!showFullCalendar && (
          <div className="premium-btn-wrapper" style={{ marginTop: "20px" }}>
            <button 
              className="premium-calendar-btn" 
              onClick={() => setShowFullCalendar(true)}
            >
              <div className="btn-content">
                <i className="ri-calendar-todo-line"></i> 
                <span>সম্পূর্ণ ক্যালেন্ডার</span>
              </div>
              <div className="glow-effect"></div>
            </button>
            <style jsx>{`
              .premium-calendar-btn {
                width: 100%;
                background: linear-gradient(135deg, var(--primary), #ffa500);
                border: none;
                padding: 12px;
                border-radius: 12px;
                color: #000;
                font-weight: 800;
                font-size: 0.9rem;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 4px 15px rgba(255, 165, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .premium-calendar-btn:hover {
                transform: scale(1.02) translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 165, 0, 0.5);
              }
              .premium-calendar-btn:active {
                transform: scale(0.98);
              }
              .btn-content {
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1;
              }
              .btn-content i { font-size: 1.2rem; }
              .glow-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
                opacity: 0;
                transition: 0.4s;
                pointer-events: none;
              }
              .premium-calendar-btn:hover .glow-effect {
                opacity: 1;
                transform: translate(10%, 10%);
              }
            `}</style>
          </div>
        )}

        {showFullCalendar && <BanglaCalendarView onClose={() => setShowFullCalendar(false)} />}
      </div>

      {/* Weather Widget */}
      <div className="glass-card util-card">
        <div className="card-title">
          <i className="ri-cloud-windy-line"></i> আবহাওয়া তথ্য (Dhaka Weather)
        </div>
        <div className="weather-flex" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <i className="ri-sun-cloudy-line weather-icon" style={{ fontSize: "2.5rem", color: "var(--primary)" }}></i>
              <div>
                <span style={{ fontSize: "2rem", fontWeight: "800", color: "#fff" }}>{weather.temp}</span>
                <div style={{ fontSize: "0.75rem", color: "#aaa" }}>অনুভূত: <b style={{ color: "#fff" }}>{weather.feelsLike}</b></div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--secondary)", fontWeight: "bold", background: "rgba(189,0,255,0.1)", padding: "4px 10px", borderRadius: "10px" }}>
                {weather.desc}
              </span>
              <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px" }}>ঢাকা, বাংলাদেশ</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "5px" }}>
            <div className="glass-card-sm" style={{ padding: "8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>আর্দ্রতা</div>
              <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff", marginTop: "2px" }}>
                {weather.humidity !== undefined ? `${weather.humidity}%` : "--%"}
              </div>
            </div>
            <div className="glass-card-sm" style={{ padding: "8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>বৃষ্টির সম্ভাবনা</div>
              <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff", marginTop: "2px" }}>
                {weather.rainProb !== undefined ? `${weather.rainProb}%` : "--%"}
              </div>
            </div>
            <div className="glass-card-sm" style={{ padding: "8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>বাতাস</div>
              <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff", marginTop: "2px" }}>
                {weather.wind} km/h
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Holidays List */}
      <div className="glass-card util-card">
        <div className="card-title">
          <i className="ri-calendar-event-line"></i> আসন্ন সরকারি ছুটিসমূহ (Upcoming Holidays)
        </div>
        <div className="holiday-list" style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {getUpcomingHolidays().map((h, i) => (
            <div key={i} className="glass-card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: "bold", fontSize: "0.9rem" }}>{h.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#aaa" }}>{h.dateStr} (2026)</div>
              </div>
              <span style={{ 
                background: h.diff === 0 ? "rgba(220,53,69,0.15)" : "rgba(0,243,255,0.08)",
                color: h.diff === 0 ? "#ff4444" : "var(--primary)",
                border: h.diff === 0 ? "1px solid #ff4444" : "1px solid rgba(0,243,255,0.2)",
                padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold"
              }}>
                {h.diff === 0 ? "আজ" : `${h.diff} দিন বাকি`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ramadan Timings Countdown */}
      <div className="glass-card util-card" style={{
        background: "linear-gradient(135deg, rgba(15, 9, 38, 0.6) 0%, rgba(33, 18, 79, 0.4) 100%)",
        border: "1px solid rgba(112, 0, 255, 0.2)"
      }}>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><i className="ri-moon-clear-line"></i> রমজান ও উৎসব কেন্দ্র (Ramadan & Eid)</span>
          <span style={{ fontSize: "0.75rem", color: "#aaa" }}>২০২৬-২০২৭</span>
        </div>
        <div style={{ marginTop: "10px" }}>
          <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#ffaa00", fontSize: "0.85rem", fontWeight: "bold" }}>রমজান ২০২৬ (১৪৪৭ হিজরি)</span>
              <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "8px", color: "#ccc" }}>সম্পন্ন</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "3px" }}>১৮ ফেব্রুয়ারি ২০২৬ থেকে শুরু হয়ে ১৯ মার্চ ২০২৬ এ সমাপ্ত হয়েছে।</p>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold" }}>রমজান ২০২৭ (১৪৪৮ হিজরি)</span>
              <span style={{ 
                fontSize: "0.7rem", 
                background: "rgba(0, 243, 255, 0.1)", 
                padding: "2px 8px", 
                borderRadius: "8px", 
                color: "var(--primary)",
                fontWeight: "bold" 
              }}>
                আসন্ন
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "3px" }}>
              সম্ভাবনা তারিখ: <b>৭ ফেব্রুয়ারি ২০২৭</b> (চাঁদ দেখার ওপর নির্ভরশীল)
            </p>
            <div className="countdown-ramadan" style={{ 
              marginTop: "8px", 
              padding: "8px 12px", 
              background: "rgba(0,0,0,0.3)", 
              borderRadius: "8px", 
              textAlign: "center",
              border: "1px solid rgba(0, 243, 255, 0.05)"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#fff" }}>
                পবিত্র রমজান শুরু হতে আর মাত্র <b style={{ color: "var(--primary)", fontSize: "0.95rem" }}>{getRamadanCountdown()}</b> দিন বাকি
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Month Overtime Trend SVG Bar Chart */}
      <div className="glass-card util-card">
        <div className="card-title">
          <i className="ri-bar-chart-box-line"></i> ৬ মাসের ওভারটাইম ট্রেন্ড (OT Trend Chart)
        </div>
        <div className="ot-chart-container" style={{ marginTop: "15px", padding: "10px 0" }}>
          <svg viewBox="0 0 400 180" width="100%" height="100%">
            {/* Background grid lines */}
            <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="40" y1="60" x2="380" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="40" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="40" y1="140" x2="380" y2="140" stroke="rgba(255,255,255,0.1)" />

            {/* Y Axis Labels */}
            <text x="30" y="25" fill="#aaa" fontSize="10" textAnchor="end">{Math.round(maxOT)}h</text>
            <text x="30" y="85" fill="#aaa" fontSize="10" textAnchor="end">{Math.round(maxOT / 2)}h</text>
            <text x="30" y="145" fill="#aaa" fontSize="10" textAnchor="end">0h</text>

            {/* Bars */}
            {otData.map((d, index) => {
              const x = 55 + index * 55;
              const barHeight = (d.value / maxOT) * 120;
              const y = 140 - barHeight;
              
              return (
                <g key={index} className="chart-bar-group">
                  <text 
                    x={x + 15} 
                    y={y - 8} 
                    fill="var(--primary)" 
                    fontSize="10" 
                    fontWeight="bold"
                    textAnchor="middle"
                    className="bar-value-text"
                    style={{ opacity: d.value > 0 ? 0.9 : 0 }}
                  >
                    {d.value.toFixed(1)}h
                  </text>
                  
                  <rect
                    x={x}
                    y={y}
                    width="30"
                    height={Math.max(barHeight, 2)}
                    rx="4"
                    fill={d.value > 0 ? "url(#barGradient)" : "rgba(255,255,255,0.05)"}
                    className="chart-rect"
                  />
                  
                  <text x={x + 15} y="158" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="600">{d.label}</text>
                  <text x={x + 15} y="170" fill="#666" fontSize="8" textAnchor="middle">{d.year}</text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#bd00ff" />
              </linearGradient>
            </defs>
          </svg>
          <style jsx>{`
            .chart-rect {
              transition: all 0.3s ease;
            }
            .chart-bar-group:hover .chart-rect {
              fill: #ffd500;
              filter: drop-shadow(0 0 6px #ffd500);
            }
            .chart-bar-group:hover .bar-value-text {
              opacity: 1 !important;
              fill: #ffd500;
            }
          `}</style>
        </div>
      </div>

      {/* Helpline Grid */}
      <div className="glass-card util-card">
        <div className="card-title">
          <i className="ri-heart-pulse-line"></i> শ্রমিক সেবা ও জরুরি তথ্য
        </div>
        <div className="helpline-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
          <a href="tel:999" className="h-card glass-card-sm" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: "5px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#ff4444" }}>৯৯৯</span>
            <span style={{ fontSize: "0.7rem", color: "#aaa" }}>জাতীয় জরুরি সেবা</span>
          </a>
          <a href="tel:16108" className="h-card glass-card-sm" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: "5px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary)" }}>১৬১০৮</span>
            <span style={{ fontSize: "0.7rem", color: "#aaa" }}>BGMEA হেল্পলাইন</span>
          </a>
          <a href="tel:109" className="h-card glass-card-sm" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: "5px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#bd00ff" }}>১০৯</span>
            <span style={{ fontSize: "0.7rem", color: "#aaa" }}>নারী ও শিশু সহায়তা</span>
          </a>
          <a href="tel:333" className="h-card glass-card-sm" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: "5px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#ffd500" }}>৩৩৩</span>
            <span style={{ fontSize: "0.7rem", color: "#aaa" }}>সরকারি তথ্য সেবা</span>
          </a>
        </div>
      </div>

      {/* Lifetime History */}
      <div className="glass-card util-card" style={{ marginTop: "20px" }}>
        <div className="card-title">
          <i className="ri-history-line"></i> Lifetime History
        </div>
        <div className="history-list">
          {lifetimeHistory.length === 0 ? (
            <div style={{ textAlign: "center", color: "#666", padding: "10px" }}>No history available yet.</div>
          ) : (
            lifetimeHistory.map((group, idx) => {
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              let totalHrs = 0;
              group.entries.forEach(e => {
                  if(e.type === 'work' || !e.type) {
                      totalHrs += parseFloat(e.ot) || 0;
                  }
              });

              return (
                <div key={idx} className="glass-card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "15px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ color: "var(--primary)", fontSize: "1.1rem", fontWeight: "bold" }}>
                      {monthNames[group.monthIndex]} {group.year}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#888" }}>
                      OT: <span style={{ color: "#fff" }}>{totalHrs} hrs</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button 
                      className="btn-sm" 
                      onClick={() => {
                        const html = generatePaySlipHTML(group, entries, settings);
                        const win = window.open("", "_blank");
                        win.document.write(html);
                        win.document.close();
                      }}
                      style={{ marginTop: "5px", fontSize: "0.7rem", padding: "4px 12px", background: "rgba(255,213,0,0.1)", border: "1px solid #ffd500", color: "#ffd500", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <i className="ri-file-text-line"></i> PAY SLIP
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button className="btn-sm" onClick={onBack}>
          BACK TO HOME
        </button>
      </div>
    </section>
  );
}
