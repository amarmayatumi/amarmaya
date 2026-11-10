"use client";

import { useState, useEffect } from "react";

export default function BanglaCalendarView({ onClose }) {
  const [calendarData, setCalendarData] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); // Current viewing date

  useEffect(() => {
    // Bangla Month Details (Revised Bangla Academy Calendar)
    const bnMonths = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ন", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
    const bnDayNames = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];
    
    // Days in Bangla Months (Bangladesh Version)
    // Boishakh to Bhadra (0-4) = 31 days
    // Ashwin to Chaitra (5-11) = 30 days
    const daysInMonths = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30]; 
    
    const today = new Date();
    const currentEngDay = viewDate.getDate();
    const currentEngMonth = viewDate.getMonth(); 
    const currentEngYear = viewDate.getFullYear();
    
    // Phalguna Leap Year Check:
    // If the Gregorian year is leap, then Falgun (index 10) is 31 days.
    const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (isLeapYear(currentEngYear)) {
        daysInMonths[10] = 31;
    }

    // Bangla month start configuration (approximate Gregorian dates for 1st of each BN month)
    const bnMonthStartsMap = [
      { m: 3, d: 14 }, // Boishakh (April 14)
      { m: 4, d: 15 }, // Jyaistha (May 15)
      { m: 5, d: 15 }, // Ashadha (June 15)
      { m: 6, d: 16 }, // Shravana (July 16)
      { m: 7, d: 16 }, // Bhadra (August 16)
      { m: 8, d: 16 }, // Ashwin (Sept 16)
      { m: 9, d: 16 }, // Kartika (Oct 16)
      { m: 10, d: 15 }, // Agrahayana (Nov 15)
      { m: 11, d: 15 }, // Pousha (Dec 15)
      { m: 0, d: 14 }, // Magha (Jan 14)
      { m: 1, d: 13 }, // Phalguna (Feb 13)
      { m: 2, d: 15 }  // Chaitra (Mar 15)
    ];

    // Identify current Bangla Month
    let bnMonthIndex = -1;
    let startEngDate = null;

    // We want the Bangla month whose start date is the most recent one in the past (or today).
    let candidates = [];
    for (let i = 0; i < 12; i++) {
        const start = bnMonthStartsMap[i];
        // Try current year
        let date = new Date(currentEngYear, start.m, start.d);
        if (date <= viewDate) {
            candidates.push({ index: i, date: date });
        }
        // Try previous year
        let prevDate = new Date(currentEngYear - 1, start.m, start.d);
        if (prevDate <= viewDate) {
            candidates.push({ index: i, date: prevDate });
        }
    }

    // Sort candidates by date descending to find the most recent
    candidates.sort((a, b) => b.date - a.date);

    if (candidates.length > 0) {
        bnMonthIndex = candidates[0].index;
        startEngDate = candidates[0].date;
    }

    if (bnMonthIndex === -1) {
        // Fallback
        bnMonthIndex = 0;
        startEngDate = new Date(currentEngYear, 3, 14);
    }

    // Function to navigate months
    const navigateMonth = (direction) => {
        let newDate = new Date(startEngDate);
        if (direction === 'next') {
            // Go to a date well into the next Bangla month (e.g., 32 days after current start)
            newDate.setDate(newDate.getDate() + 32);
        } else {
            // Go to a date just before the current start date (e.g., 5 days before)
            newDate.setDate(newDate.getDate() - 5);
        }
        setViewDate(newDate);
    };


    const startWeekday = startEngDate.getDay(); 
    // JS Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    // Bangla Grid: Sat=0, Sun=1, Mon=2...
    const bnStartWeekdayIndex = (startWeekday + 1) % 7; 

    // Public Holidays 2026 (Simplified Map: Month starting from 0)
    const holidays2026 = {
        "0-1": "New Year", "1-21": "Shaheed Day", "2-17": "Bangabandhu B-day", 
        "2-19": "Eid-ul-Fitr", "2-20": "Eid-ul-Fitr", "2-21": "Eid-ul-Fitr", "2-22": "Eid-ul-Fitr", "2-23": "Eid-ul-Fitr",
        "2-26": "Independence Day", "3-14": "Pohela Boishakh", "4-1": "May Day", 
        "4-28": "Eid-ul-Azha", "4-29": "Eid-ul-Azha", "4-30": "Eid-ul-Azha",
        "5-26": "Ashura", "7-5": "July Mass Uprising Day", "7-26": "Eid-e-Miladunnabi", "9-21": "Durga Puja",
        "11-16": "Victory Day", "11-25": "Christmas"
    };

    const totalDays = daysInMonths[bnMonthIndex];
    const daysGrid = [];

    for (let i = 0; i < bnStartWeekdayIndex; i++) {
        daysGrid.push({ day: null });
    }

    for (let i = 1; i <= totalDays; i++) {
        const date = new Date(startEngDate);
        date.setDate(startEngDate.getDate() + (i - 1));
        const holKey = `${date.getMonth()}-${date.getDate()}`;
        
        daysGrid.push({
            day: i,
            isToday: date.toDateString() === today.toDateString(),
            isHoliday: date.getFullYear() === 2026 && !!holidays2026[holKey],
            engDate: date.getDate(),
            engMonth: date.toLocaleString('default', { month: 'short' })
        });
    }

    const toBnNum = (n) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

    // Year Logic: If current Gregorian date is before April 14, BN Year = Gregorian Year - 594
    // If it's starting from April 14, BN Year = Gregorian Year - 593
    const actualBnYear = (currentEngMonth > 3 || (currentEngMonth === 3 && currentEngDay >= 14)) 
                         ? currentEngYear - 593 : currentEngYear - 594;

    setCalendarData({
        monthName: bnMonths[bnMonthIndex],
        year: toBnNum(actualBnYear),
        dayNames: bnDayNames,
        daysGrid,
        toBnNum,
        navigateMonth
    });

  }, [viewDate]);

  if (!calendarData) return null;

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
        <div className="glass-card calendar-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="header-row">
                <button className="nav-btn" onClick={() => calendarData.navigateMonth('prev')}><i className="ri-arrow-left-s-line"></i></button>
                <h3>{calendarData.monthName} {calendarData.year}</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="nav-btn" onClick={() => calendarData.navigateMonth('next')}><i className="ri-arrow-right-s-line"></i></button>
                    <button className="icon-btn-close" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
            </div>
            <div className="calendar-grid">
                {calendarData.dayNames.map((d, i) => (
                    <div key={d} className={`day-label ${i === 6 ? 'holiday' : ''}`}>{d}</div>
                ))}
                {calendarData.daysGrid.map((cell, idx) => (
                    <div key={idx} className={`day-cell ${cell.isToday ? 'today' : ''} ${!cell.day ? 'empty' : ''} ${idx % 7 === 6 || cell.isHoliday ? 'holiday-cell' : ''}`}>
                        {cell.day && (
                            <>
                                <div className="bn-day">{calendarData.toBnNum(cell.day)}</div>
                                <div className="eng-day">{cell.engDate} {cell.engMonth}</div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <style jsx>{`
            .calendar-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 15px;
                backdrop-filter: blur(8px);
            }
            .calendar-card {
                width: 95%;
                max-width: 420px;
                padding: 22px 14px;
                border: 2px solid transparent;
                background: linear-gradient(#151515, #000) padding-box,
                            linear-gradient(135deg, #ffd500, #ff0055, #00d4ff) border-box;
                border-radius: 28px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(255,213,0,0.15);
                position: relative;
                overflow: hidden;
            }
            .calendar-card::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,213,0,0.05) 0%, transparent 70%);
                pointer-events: none;
            }
            .header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .header-row h3 { 
                background: linear-gradient(to right, #ffd500, #ffaa00);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 0; 
                font-size: 1.6rem; 
                text-shadow: 0 0 15px rgba(255,213,0,0.3);
                font-weight: 900;
            }
            .icon-btn-close {
                background: rgba(255,68,68,0.2);
                border: 1px solid rgba(255,68,68,0.3);
                color: #ff4444;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                transition: 0.2s;
                box-shadow: 0 0 10px rgba(255,68,68,0.2);
            }
            .icon-btn-close:hover { background: rgba(255,68,68,0.3); transform: scale(1.1); }
            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 5px;
                width: 100%;
            }
            .day-label {
                text-align: center;
                font-size: 0.75rem;
                color: #aaa;
                padding-bottom: 5px;
                font-weight: 700;
            }
            .day-label.holiday {
                color: #ff4444;
                text-shadow: 0 0 5px rgba(255,68,68,0.3);
            }
            .day-cell {
                aspect-ratio: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
                transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .day-cell.holiday-cell .bn-day {
                color: #ff6b6b;
            }
            .day-cell:not(.empty):hover {
                background: rgba(255,213,0,0.1);
                border-color: var(--primary);
                transform: scale(1.05);
                box-shadow: 0 5px 15px rgba(255,213,0,0.2);
            }
            .day-cell.today {
                background: linear-gradient(135deg, #ffd500 0%, #ffaa00 100%);
                box-shadow: 0 0 30px rgba(255,213,0,0.6), inset 0 0 10px rgba(255,255,255,0.5);
                border: 2px solid #fff;
                transform: scale(1.12);
                z-index: 2;
                animation: pulse-glow 2s infinite;
            }
            @keyframes pulse-glow {
                0% { box-shadow: 0 0 20px rgba(255,213,0,0.5); }
                50% { box-shadow: 0 0 40px rgba(255,213,0,0.8); }
                100% { box-shadow: 0 0 20px rgba(255,213,0,0.5); }
            }
            .day-cell.today .bn-day { 
                color: #000; 
                font-weight: 900; 
                font-size: 1.2rem;
                text-shadow: 0 1px 2px rgba(255,255,255,0.5);
            }
            .day-cell.today .eng-day { color: #222; font-weight: 700; }
            .bn-day { font-size: 1rem; font-weight: 600; }
            .eng-day { font-size: 0.5rem; color: #888; }
            .empty { background: transparent; border: none; box-shadow: none; }
            
            @keyframes slide-up {
                from { opacity: 0; transform: scale(0.9) translateY(30px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

            @media (max-width: 400px) {
                .calendar-card {
                    padding: 15px 8px;
                    border-radius: 20px;
                }
                .calendar-grid { gap: 3px; }
                .day-cell { border-radius: 6px; }
                .bn-day { font-size: 0.85rem; }
                .eng-day { font-size: 0.4rem; }
            }
            .nav-btn {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.1);
                color: #fff;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.2s;
            }
            .nav-btn:hover { background: rgba(255,255,255,0.2); }
        `}</style>
    </div>
  );
}
