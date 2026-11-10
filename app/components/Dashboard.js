"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { getLocalDateKey } from "@/utils/localDate";

export default function Dashboard({ setActiveTab, setShareModal }) {
  const { settings, entries, uid, addEntry, showDialog } = useAppContext();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState({ 
    temp: "--°C", 
    wind: "--", 
    humidity: undefined, 
    feelsLike: "--°C", 
    rainProb: undefined, 
    desc: "Updating..." 
  });
  const [prayers, setPrayers] = useState({ Fajr: "--:--", Dhuhr: "--:--", Asr: "--:--", Maghrib: "--:--", Isha: "--:--" });
  const [customCountdown, setCustomCountdown] = useState(null);
  
  // Savings Goal Tracker State
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [actualSavings, setActualSavings] = useState(0);

  // Shift Planner State
  const [shifts, setShifts] = useState({});

  // Collapsible settings & campaign banner states
  const [showSavingsAndShift, setShowSavingsAndShift] = useState(false);
  const [campaignNotice, setCampaignNotice] = useState("");
  const [quickAddCooldown, setQuickAddCooldown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSavings = localStorage.getItem(`my_ot_actual_savings_${currentYear}_${currentMonth}`);
      if (savedSavings) {
        setActualSavings(parseFloat(savedSavings) || 0);
      }
      
      const savedShifts = localStorage.getItem("my_ot_weekly_shifts");
      if (savedShifts) {
        try {
          setShifts(JSON.parse(savedShifts));
        } catch (e) {}
      }

      // Clear any stale cooldown on mount
      localStorage.removeItem("last_quick_add");
      setQuickAddCooldown(false);
    }
  }, [currentYear, currentMonth]);

  // hasEntryToday controls quick button visibility — no separate cooldown needed

  const handleSavingsChange = (val) => {
    setActualSavings(val);
    localStorage.setItem(`my_ot_actual_savings_${currentYear}_${currentMonth}`, val);
  };

  const toggleShift = (dateStr) => {
    const current = shifts[dateStr] || "Day";
    const nextMap = { Day: "Night", Night: "Off", Off: "Day" };
    const nextVal = nextMap[current];
    const newShifts = { ...shifts, [dateStr]: nextVal };
    setShifts(newShifts);
    localStorage.setItem("my_ot_weekly_shifts", JSON.stringify(newShifts));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      );
    }, 1000);

    // Fetch Weather (Dhaka coords, with extended variables)
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=precipitation_probability&timezone=Asia/Dhaka&forecast_days=1"
    )
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
            desc: d.current.precipitation > 0 ? "Rainy" : rainProb > 30 ? "Cloudy" : "Clear",
          });
        }
      })
      .catch((e) => {});

    // Fetch Prayer Times
    fetch("https://api.aladhan.com/v1/timingsByCity?city=Dhaka&country=Bangladesh&method=2")
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 200 && d.data) {
          const timings = d.data.timings;
          const map = { Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" };
          const formattedP = {};
          for (let key in map) {
            const val = timings[map[key]];
            if (val) {
              const [h, m] = val.split(":");
              const hh = parseInt(h);
              const period = hh >= 12 ? "PM" : "AM";
              const displayH = hh % 12 || 12;
              formattedP[key] = `${displayH}:${m} ${period}`;
            }
          }
          setPrayers(formattedP);
        }
      })
      .catch((e) => {});

    // Fetch Custom Countdown
    fetch(`/api/user?action=get_countdown`)
      .then(res => res.json())
      .then(d => {
        if (d.status === "success" && d.data?.enabled) {
          setCustomCountdown(d.data);
        }
      })
      .catch((e) => {});

    // Fetch Global Announcement (Campaign)
    fetch(`/api/user?action=get_campaign`)
      .then(res => res.json())
      .then(d => {
        if (d.status === "success" && d.data) {
          const now = Date.now();
          if (d.data.message && now >= (d.data.start || 0) && now <= (d.data.end || Infinity)) {
            setCampaignNotice(d.data.message);
          }
        }
      })
      .catch((e) => {});

    return () => clearInterval(timer);
  }, []);

  let totalHrs = 0;
  let tiffinCount = 0;
  let nightCount = 0;
  let tiffinAmount = 0;
  let nightAmount = 0;
  let otEarnings = 0;
  let otherEarnings = 0;

  // Public Holidays 2026 for multiplier calculations
  const holidays2026 = {
    "0-1": "New Year", "1-21": "Shaheed Day", "2-17": "Bangabandhu B-day", 
    "2-19": "Eid-ul-Fitr", "2-20": "Eid-ul-Fitr", "2-21": "Eid-ul-Fitr", "2-22": "Eid-ul-Fitr", "2-23": "Eid-ul-Fitr",
    "2-26": "Independence Day", "3-14": "Pohela Boishakh", "4-1": "May Day", 
    "4-28": "Eid-ul-Azha", "4-29": "Eid-ul-Azha", "4-30": "Eid-ul-Azha",
    "5-26": "Ashura", "7-5": "July Mass Uprising Day", "7-26": "Eid-e-Miladunnabi", "9-21": "Durga Puja",
    "11-16": "Victory Day", "11-25": "Christmas"
  };

  entries.forEach((e) => {
    if (!e.date) return;
    if (e.type && e.type !== "work") {
      const [entryYear, entryMonth] = e.date.split("-").map(Number);
      if (entryMonth - 1 === currentMonth && entryYear === currentYear) {
        otherEarnings += parseFloat(e.amount) || 0;
      }
      return;
    }
    const [y, m, d] = e.date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
      const ot = parseFloat(e.ot) || 0;
      totalHrs += ot;
      
      const holKey = `${dateObj.getMonth()}-${dateObj.getDate()}`;
      const isFridayOrHoliday = dateObj.getFullYear() === 2026 && !!holidays2026[holKey];
      const hourlyRate = parseFloat(settings.hourlyRate) || 0;
      const holidayMultiplier = parseFloat(settings.holidayMultiplier) || 2.0;
      
      const currentRate = isFridayOrHoliday ? (hourlyRate * holidayMultiplier) : hourlyRate;
      otEarnings += ot * currentRate;

      if (e.friday) otEarnings += parseFloat(e.friday);

      if (e.tiffin) {
        tiffinCount++;
        tiffinAmount += settings.tiffinRate || 30;
      }
      if (e.night) {
        nightCount++;
        nightAmount += settings.nightRate || 50;
      }
    }
  });

  const fixedMonthly = (parseFloat(settings.gross) || 0) + (parseFloat(settings.bonus) || 0);
  const grandTotal = fixedMonthly + otEarnings + tiffinAmount + nightAmount + otherEarnings;
  const currentDateStr = getLocalDateKey();
  const hasEntryToday = entries.some((e) => e.date === currentDateStr);

  const handleQuickAdd = async (hours) => {
    if (hasEntryToday) {
      await showDialog({ title: "Already Added", message: "আপনি আজকের এন্ট্রি অলরেডি যোগ করেছেন!", type: "info" });
      return;
    }
    const todayObj = new Date();
    const holKey = `${todayObj.getMonth()}-${todayObj.getDate()}`;
    const isFridayOrHoliday = todayObj.getFullYear() === 2026 && !!holidays2026[holKey];

    const newEntry = {
      id: Date.now().toString(),
      date: currentDateStr,
      type: "work",
      ot: hours,
      tiffin: hours >= 4,
      night: hours >= 7,
      friday: isFridayOrHoliday ? (settings.hourlyRate * (settings.holidayMultiplier || 2.0)) : 0,
    };
    addEntry(newEntry);
    
    await showDialog({ title: "Success", message: `${hours} ঘণ্টার ওভারটাইম যোগ করা হয়েছে!`, type: "success" });
  };

  // Automatic Next Holiday Logic
  const getNextHoliday = () => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const holidays = [
      { name: "শহীদ দিবস", month: 1, day: 21 },
      { name: "বঙ্গবন্ধুর জন্মদিন", month: 2, day: 17 },
      { name: "ঈদুল ফিতর", month: 2, day: 20 },
      { name: "স্বাধীনতা দিবস", month: 2, day: 26 },
      { name: "পহেলা বৈশাখ", month: 3, day: 14 },
      { name: "মে দিবস", month: 4, day: 1 },
      { name: "ঈদুল আজহা", month: 4, day: 28 }, // May 28, 2026 (Confirmed Date for Bangladesh)
      { name: "আশুরা", month: 5, day: 26 },
      { name: "গণ-অভ্যুত্থান দিবস", month: 7, day: 5 },
      { name: "ঈদে মিলাদুন্নবী", month: 7, day: 26 },
      { name: "দুর্গাপূজা", month: 9, day: 21 },
      { name: "বিজয় দিবস", month: 11, day: 16 },
      { name: "বড় দিন", month: 11, day: 25 },
    ];

    for (let h of holidays) {
      const hDate = new Date(currentYear, h.month, h.day);
      if (hDate >= todayMidnight) {
        const diff = Math.ceil((hDate - todayMidnight) / (1000 * 60 * 60 * 24));
        return { name: h.name, diff };
      }
    }
    const nextYearFirst = new Date(currentYear + 1, holidays[0].month, holidays[0].day);
    return { name: holidays[0].name, diff: Math.ceil((nextYearFirst - todayMidnight) / (1000 * 60 * 60 * 24)) };
  };

  const getSalaryCountdown = () => {
    const now = new Date();
    const salaryDate = new Date(now.getFullYear(), now.getMonth(), 7);
    if (now.getDate() > 7) salaryDate.setMonth(salaryDate.getMonth() + 1);
    return Math.ceil((salaryDate - now) / (1000 * 60 * 60 * 24));
  };

  const nextH = getNextHoliday();
  const diffSalary = getSalaryCountdown();

  let countdownText = "";
  if (customCountdown && customCountdown.date) {
    const cdDate = new Date(customCountdown.date);
    const cdDateMidnight = new Date(cdDate.getFullYear(), cdDate.getMonth(), cdDate.getDate());
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.ceil((cdDateMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
    
    let holidayDiffText = "";
    if (diff === 0) {
      holidayDiffText = ` • আজ <b>${customCountdown.name}</b>!`;
    } else if (diff > 0) {
      holidayDiffText = ` • ${customCountdown.name} আর মাত্র <b>${diff} দিন</b> বাকি`;
    }
    countdownText = `বেতন আর মাত্র <b>${diffSalary} দিন</b> বাকি${holidayDiffText} • আজকের কাজ সেভ করতে ভুলবেন না!`;
  } else {
    let holidayDiffText = "";
    if (nextH.diff === 0) {
      holidayDiffText = ` • আজ <b>${nextH.name}</b>!`;
    } else if (nextH.diff > 0) {
      holidayDiffText = ` • ${nextH.name} আর মাত্র <b>${nextH.diff} দিন</b> পরে`;
    }
    countdownText = `বেতন আর মাত্র <b>${diffSalary} দিন</b> বাকি${holidayDiffText} • আজকের কাজ সেভ করতে ভুলবেন না!`;
  }

  // Eid-ul-Azha Banner Logic (May 22 to May 31, 2026)
  const isEidAzhaSeason = () => {
    const today = new Date();
    const start = new Date(2026, 4, 22); // May 22 (Month index 4)
    const end = new Date(2026, 4, 31);   // May 31
    return today >= start && today <= end;
  };

  // Savings Calculations
  const targetSavings = Math.round(grandTotal * ((settings.savingsGoal || 10) / 100));
  const savingsPercent = targetSavings > 0 ? Math.min(100, Math.round((actualSavings / targetSavings) * 100)) : 0;

  // Shift Dates (Saturday to Friday)
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const offset = (dayOfWeek + 1) % 7; 
    const sat = new Date(today);
    sat.setDate(today.getDate() - offset);

    const weekDays = [];
    const dayNames = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];
    const engDayNames = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sat);
      d.setDate(sat.getDate() + i);
      weekDays.push({
        name: dayNames[i],
        engName: engDayNames[i],
        dateStr: getLocalDateKey(d),
        displayDate: d.getDate(),
      });
    }
    return weekDays;
  };

  const weekDays = getCurrentWeekDates();

  return (
    <section className="view active animate-fade-in" style={{ paddingBottom: "100px" }}>
      <header className="glass-header" style={{ margin: "-20px -20px 20px -20px" }}>
        <div className="logo">
          <i className="ri-timer-flash-line" style={{ color: "var(--primary)" }}></i>
          <span>My Overtime</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <div className="user-greeting" style={{ 
            fontSize: "0.85rem", opacity: 0.9, maxWidth: "150px", 
            padding: "6px 10px", borderRadius: "10px", background: "rgba(0, 243, 255, 0.05)",
            border: "1px solid rgba(0, 243, 255, 0.2)", color: "var(--primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            Hi, <span>{settings.name}</span>
          </div>
          <button 
            onClick={() => setShareModal(true)}
            style={{ 
              background: "linear-gradient(135deg, rgba(0,243,255,0.2), rgba(189,0,255,0.2))", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "#fff", width: "36px", height: "36px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "0 0 15px rgba(0,243,255,0.3)", transition: "0.3s"
            }}
            className="share-btn-hover"
          >
            <i className="ri-qr-code-line" style={{ fontSize: "1.2rem" }}></i>
          </button>
        </div>
      </header>

      {/* Campaign Notice Banner */}
      {campaignNotice && (
        <div className="glass-card campaign-banner" style={{
          background: "linear-gradient(90deg, rgba(255, 75, 75, 0.15), rgba(189, 0, 255, 0.15))",
          border: "1px solid rgba(255, 75, 75, 0.4)",
          borderRadius: "12px",
          padding: "12px 15px",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 0 15px rgba(255, 75, 75, 0.2)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#ff4b4b",
            boxShadow: "0 0 10px #ff4b4b",
            animation: "pulse-glow 1.5s infinite alternate"
          }}></div>
          <div style={{ flex: 1, fontSize: "0.85rem", color: "#fff", fontWeight: "600", lineHeight: "1.4" }}>
            <span style={{ color: "#ff4b4b", fontWeight: "800", marginRight: "6px" }}>[ঘোষণা]</span>
            {campaignNotice}
          </div>
          <button 
            onClick={() => setCampaignNotice("")} 
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "0 5px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Eid-ul-Azha Greeting Banner */}
      {isEidAzhaSeason() && (
        <div className="glass-card" style={{
          background: "linear-gradient(135deg, #0f0926 0%, #21124f 50%, #0d0822 100%)",
          border: "2px solid #ffd700",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "15px",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
          boxShadow: "0 0 25px rgba(255, 215, 0, 0.2)"
        }}>
          <div style={{ position: "absolute", top: "10px", right: "20px", opacity: 0.85 }} className="crescent-glow">
            <span style={{ fontSize: "1.8rem", color: "#ffd700", textShadow: "0 0 10px #ffd700" }}>🌙</span>
            <span style={{ fontSize: "0.65rem", color: "#fff", position: "absolute", top: "5px", left: "-5px" }} className="star-blink">⭐</span>
          </div>
          <div style={{ position: "absolute", top: "40px", left: "15px", opacity: 0.5 }}>
            <span style={{ fontSize: "0.8rem", color: "#fff" }} className="star-blink-slow">⭐</span>
          </div>

          <h3 style={{ color: "#ffd700", fontSize: "1.3rem", fontWeight: "800", marginBottom: "5px", letterSpacing: "1px" }}>
            ঈদ মোবারক!
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#fff", lineHeight: "1.5" }}>
            পবিত্র ঈদ-উল-আযহা আপনার জীবনে বয়ে আনুক আনন্দ ও সমৃদ্ধি। 
          </p>
          <div style={{ fontSize: "0.75rem", color: "#ccc", marginTop: "8px" }}>
            ঈদ ছুটির দিনগুলোর ওভারটাইম <b>{parseFloat(settings.holidayMultiplier || 2.0).toFixed(1)}x</b> রেটে হিসাব হবে।
          </div>


        </div>
      )}

      {/* Countdown Ticker (Dynamic) */}
      <div className="countdown-ticker animate-pulse" style={{ 
        background: "linear-gradient(90deg, rgba(0,243,255,0.1), rgba(189,0,255,0.1))",
        padding: "10px 15px", borderRadius: "12px", marginBottom: "15px", 
        border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "10px"
      }}>
        <i className="ri-notification-3-line" style={{ color: "#ffd500" }}></i>
        <marquee style={{ fontSize: "0.85rem", color: "#eee", fontWeight: "500" }} dangerouslySetInnerHTML={{ __html: countdownText }}></marquee>
      </div>

      <div className="clock-card glass-card" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
        <div className="time-display" style={{ textShadow: "0 0 20px rgba(0,243,255,0.5)" }}>{time || "00:00:00"}</div>
        <div className="date-display" style={{ color: "var(--secondary)", fontWeight: "500" }}>{date || "Loading..."}</div>
      </div>

      {/* Weather Widget */}
      <div className="glass-card animate-slide-up" style={{ 
        background: "rgba(255,255,255,0.02)", 
        border: "1px solid rgba(255,255,255,0.05)", padding: "15px", marginBottom: "15px"
      }}>
        <div className="card-title" style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "bold", marginBottom: "10px" }}>
          <i className="ri-sun-cloudy-line"></i> আবহাওয়া তথ্য (Dhaka Weather)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "2rem", fontWeight: "800", color: "#fff" }}>{weather.temp}</span>
            <div style={{ fontSize: "0.75rem", color: "#ccc" }}>
              <div>অনুভূত: <b>{weather.feelsLike}</b></div>
              <div style={{ color: "var(--secondary)", fontWeight: "600" }}>{weather.desc}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.75rem", color: "#aaa" }}>
            <div className="glass-card-sm" style={{ padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "center", background: "rgba(255,255,255,0.02)" }}>
              <span>আর্দ্রতা</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>{weather.humidity !== undefined ? `${weather.humidity}%` : "--%"}</span>
            </div>
            <div className="glass-card-sm" style={{ padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "center", background: "rgba(255,255,255,0.02)" }}>
              <span>বৃষ্টির সম্ভাবনা</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>{weather.rainProb !== undefined ? `${weather.rainProb}%` : "--%"}</span>
            </div>
            <div className="glass-card-sm" style={{ padding: "6px 8px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gridColumn: "span 2", background: "rgba(255,255,255,0.02)" }}>
              <span>বাতাস গতিবেগ:</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>{weather.wind} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid: 1-7 Hours */}
      {!hasEntryToday && (
        <div className="glass-card animate-slide-up" style={{ 
          background: "linear-gradient(135deg, rgba(0,243,255,0.05), rgba(0,0,0,0.6))", 
          border: "1px solid rgba(255,255,255,0.08)", padding: "15px", marginBottom: "15px"
        }}>
          <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "bold", marginBottom: "12px", textAlign: "center" }}>
            <i className="ri-flashlight-line"></i> দ্রুত আজকের ওভারটাইম যোগ করুন (০১ - ০৭ ঘণ্টা)
          </div>
          <div className="quick-add-grid" style={{ 
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" 
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map((h) => (
              <button 
                key={h}
                onClick={() => handleQuickAdd(h)}
                className="btn-quick"
                style={{ 
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", 
                  padding: "8px 4px", borderRadius: "8px", color: "#fff", fontWeight: "bold", 
                  fontSize: "0.85rem", transition: "0.3s"
                }}
              >
                +{h}h
              </button>
            ))}
            <button 
              onClick={() => setActiveTab("add")}
              style={{ 
                background: "rgba(189,0,255,0.1)", border: "1px solid rgba(189,0,255,0.3)", 
                padding: "8px 4px", borderRadius: "8px", color: "var(--secondary)", fontWeight: "bold", 
                fontSize: "0.8rem"
              }}
            >
              More
            </button>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card glass-card primary" style={{ background: "rgba(0,243,255,0.05)", border: "1px solid rgba(0,243,255,0.2)" }}>
          <div className="label" style={{ letterSpacing: "1px" }}>TOTAL EARNINGS</div>
          <div className="value" style={{ color: "#fff" }}>৳{Math.round(grandTotal)}</div>
        </div>
        <div className="stat-card glass-card secondary" style={{ background: "rgba(189,0,255,0.05)", border: "1px solid rgba(189,0,255,0.2)" }}>
          <div className="label" style={{ letterSpacing: "1px" }}>OT HOURS</div>
          <div className="value" style={{ color: "#fff" }}>{totalHrs.toFixed(1)}h</div>
        </div>
      </div>

      {/* Premium Toggle Button for Savings & Shift Planner */}
      <div style={{ margin: "15px 0", display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setShowSavingsAndShift(!showSavingsAndShift)}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, rgba(0, 243, 255, 0.1), rgba(189, 0, 255, 0.1))",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: showSavingsAndShift 
              ? "0 0 20px rgba(189, 0, 255, 0.3), inset 0 0 10px rgba(0, 243, 255, 0.2)" 
              : "0 0 15px rgba(0, 243, 255, 0.15)",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: "14px",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(12px)",
            letterSpacing: "0.5px"
          }}
          className="toggle-savings-btn"
        >
          <i className={showSavingsAndShift ? "ri-eye-off-line" : "ri-eye-line"} style={{ 
            color: showSavingsAndShift ? "var(--secondary)" : "var(--primary)",
            fontSize: "1.2rem",
            textShadow: showSavingsAndShift ? "0 0 8px var(--secondary)" : "0 0 8px var(--primary)"
          }}></i>
          <span>{showSavingsAndShift ? "সেভিংস ও শিফট প্ল্যানার হাইড করুন" : "সেভিংস ও শিফট প্ল্যানার দেখুন"}</span>
          <i className={showSavingsAndShift ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} style={{ opacity: 0.7 }}></i>
        </button>
      </div>

      {showSavingsAndShift && (
        <>
          {/* Savings Tracker Card */}
          <div className="glass-card mt-3" style={{ marginTop: "15px" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><i className="ri-hand-heart-line"></i> Savings Goal Tracker (সেভিংস ট্র্যাকার)</span>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "bold" }}>লক্ষ্য: {settings.savingsGoal || 10}%</span>
            </div>
            <div style={{ padding: "5px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "8px" }}>
                <span>টার্গেট সেভিংস: <b>৳{targetSavings}</b></span>
                <span>বর্তমান সেভিংস: <b>৳{actualSavings}</b></span>
              </div>
              
              <div style={{ width: "100%", height: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "15px" }}>
                <div style={{ width: `${savingsPercent}%`, height: "100%", background: "linear-gradient(90deg, #00f3ff, #bd00ff)", borderRadius: "6px", transition: "width 0.4s ease" }}></div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: savingsPercent >= 100 ? "var(--success)" : "#aaa", fontWeight: "600" }}>
                  {savingsPercent >= 100 ? "🎉 লক্ষ্য অর্জিত হয়েছে!" : `${savingsPercent}% অর্জিত হয়েছে`}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#ccc" }}>সেভ করেছেন:</span>
                  <input 
                    type="number" 
                    value={actualSavings || ""} 
                    onChange={(e) => handleSavingsChange(parseFloat(e.target.value) || 0)} 
                    placeholder="0"
                    style={{ width: "80px", padding: "4px 8px", background: "#000", border: "1px solid #333", borderRadius: "5px", color: "#fff", fontSize: "0.8rem", textAlign: "center" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Shift Planner Card */}
          <div className="glass-card mt-3" style={{ marginTop: "15px" }}>
            <div className="card-title">
              <i className="ri-calendar-todo-line"></i> Weekly Shift Planner (সাপ্তাহিক শিফট প্ল্যানার)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginTop: "10px" }}>
              {weekDays.map((wd) => {
                const shiftVal = shifts[wd.dateStr] || "Day";
                const shiftStyle = {
                  Day: { bg: "rgba(255, 170, 0, 0.08)", border: "rgba(255, 170, 0, 0.25)", color: "#ffaa00", icon: "☀️", label: "Day" },
                  Night: { bg: "rgba(112, 0, 255, 0.08)", border: "rgba(112, 0, 255, 0.25)", color: "#9d4dff", icon: "🌙", label: "Night" },
                  Off: { bg: "rgba(255, 50, 50, 0.08)", border: "rgba(255, 50, 50, 0.25)", color: "#ff3333", icon: "🚫", label: "Off" }
                }[shiftVal];

                const isToday = wd.dateStr === currentDateStr;

                return (
                  <div 
                    key={wd.dateStr} 
                    onClick={() => toggleShift(wd.dateStr)}
                    style={{
                      background: shiftStyle.bg,
                      border: `1px solid ${isToday ? "var(--primary)" : shiftStyle.border}`,
                      borderRadius: "8px",
                      padding: "8px 2px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isToday ? "0 0 8px rgba(0, 243, 255, 0.3)" : "none"
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: isToday ? "var(--primary)" : "#aaa", fontWeight: "bold" }}>{wd.name}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#fff", margin: "4px 0" }}>{wd.displayDate}</div>
                    <div style={{ fontSize: "1.1rem" }}>{shiftStyle.icon}</div>
                    <div style={{ fontSize: "0.6rem", color: shiftStyle.color, fontWeight: "bold" }}>{shiftStyle.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#888", marginTop: "8px", textAlign: "center" }}>
              * বক্সে ক্লিক করে শিফট পরিবর্তন করুন (Day ☀️ {"->"} Night 🌙 {"->"} Off 🚫)
            </div>
          </div>
        </>
      )}

      <div className="glass-card mt-3" style={{ marginTop: "15px" }}>
        <div className="card-title">
          <i className="ri-wallet-3-line"></i> Monthly Bills
        </div>
        <div className="bill-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="b-stat glass-card-sm" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
              Tiffin (<span>{tiffinCount}</span>)
            </span>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#ffd500" }}>৳{tiffinAmount}</span>
          </div>
          <div className="b-stat glass-card-sm" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
              Night (<span>{nightCount}</span>)
            </span>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#7000ff" }}>৳{nightAmount}</span>
          </div>
          <div className="b-total glass-card-sm" style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.9rem" }}>Total Extra</span>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>৳{tiffinAmount + nightAmount}</span>
          </div>
        </div>
      </div>

      <div className="prayer-section glass-card">
        <div className="card-title">
          <i className="ri-moon-foggy-line"></i> Prayer Times
        </div>
        <div className="prayer-grid">
          {Object.entries(prayers).map(([name, time]) => (
            <div key={name} className="prayer-item">
              <span>{name}</span>
              <span>{time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="game-teaser glass-card" onClick={() => setActiveTab("utilities")}>
        <div className="teaser-content">
          <i className="ri-calendar-event-line"></i>
          <div>
            <h3>Today</h3>
            <p>Bangla Date & Weather</p>
          </div>
        </div>
        <button className="btn-sm" onClick={() => setActiveTab("utilities")}>
          VIEW
        </button>
      </div>

      <style jsx>{`
        .crescent-glow {
          animation: floatMoon 4s ease-in-out infinite alternate;
        }
        .star-blink {
          animation: blinkStar 1.5s infinite alternate;
        }
        .star-blink-slow {
          animation: blinkStar 3s infinite alternate;
        }
        @keyframes floatMoon {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-5px) rotate(10deg); }
        }
        @keyframes blinkStar {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }

        .btn-quick { cursor: pointer; }
        .btn-quick:hover {
          background: var(--primary) !important;
          color: #000 !important;
          transform: scale(1.05);
        }
        .share-btn-hover:hover {
          transform: rotate(15deg) scale(1.1);
          box-shadow: 0 0 20px var(--primary);
        }

        @keyframes pulse-glow {
          0% { opacity: 0.5; box-shadow: 0 0 5px #ff4b4b; }
          100% { opacity: 1; box-shadow: 0 0 15px #ff4b4b; }
        }
        .toggle-savings-btn:hover {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.25), rgba(189, 0, 255, 0.25)) !important;
          border-color: rgba(0, 243, 255, 0.5) !important;
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0, 243, 255, 0.25), 0 0 15px rgba(189, 0, 255, 0.25) !important;
        }
        .toggle-savings-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
