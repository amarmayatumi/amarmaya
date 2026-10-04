"use client";

import { useState } from "react";
import { useAppContext } from "../AppContext";

  const getTodayDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

export default function AddEntry({ setActiveTab }) {
  const { entries, addEntry, settings, showDialog } = useAppContext();
  const [type, setType] = useState("work");
  const [date, setDate] = useState(getTodayDate());
  const [ot, setOt] = useState("");
  const [tiffin, setTiffin] = useState(false);
  const [night, setNight] = useState(false);
  const [friday, setFriday] = useState("");
  const [amount, setAmount] = useState("");

  const handleOtChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setOt(e.target.value);
    setTiffin(val >= 4);
    setNight(val >= 7);
  };

  const handleSave = async () => {
    if (!date) {
      await showDialog({ title: "Required", message: "Please select a date", type: "info" });
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      type,
      date,
      ot: type === "work" ? parseFloat(ot) || 0 : 0,
      tiffin: type === "work" ? tiffin : false,
      night: type === "work" ? night : false,
      friday: type === "work" ? parseFloat(friday) || 0 : 0,
      amount: type !== "work" ? parseFloat(amount) || 0 : 0,
    };

    // Check for existing entry on same date
    const existing = entries.find((e) => e.date === date && e.type === type);
    if (existing) {
      const confirmed = await showDialog({ 
        title: "Duplicate", 
        message: "An entry for this date already exists. Save anyway?", 
        type: "confirm" 
      });
      if (!confirmed) return;
    }

    addEntry(newEntry);
    
    await showDialog({ 
      title: "Saved!", 
      message: "Your record has been saved successfully.", 
      type: "success" 
    });

    // Reset form
    setDate(getTodayDate());
    setType("work");
    setOt("");
    setFriday("");
    setAmount("");
    setTiffin(false);
    setNight(false);
    
    if (setActiveTab) setActiveTab("dashboard");
  };

  return (
    <section className="view active animate-fade-in pb-24">
      <div className="page-title">New Entry</div>
      <form className="glass-form" onSubmit={(e) => e.preventDefault()}>
        <div className="glass-card form-card">
          <div className="form-group">
            <label>Entry Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: "8px",
              }}
            >
              <option value="work">Overtime / Work</option>
              <option value="friday-off">Friday Off (No Work)</option>
              <option value="leave">Leave (Chuti)</option>
              <option value="eid-bonus">Eid Bonus</option>
              <option value="earned-leave">Yearly Earned Leave</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {type === "work" && (
            <div id="group-work">
              <div className="form-group">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Overtime (Hours)
                  <button 
                    type="button"
                    onClick={() => {
                      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                      recognition.lang = "bn-BD";
                      recognition.start();
                      
                      recognition.onresult = (event) => {
                        const speech = event.results[0][0].transcript;
                        const numMap = { 
                          "শূন্য": 0, "এক": 1, "দুই": 2, "তিন": 3, "চার": 4, 
                          "পাঁচ": 5, "ছয়": 6, "সাত": 7, "আট": 8, "নয়": 9, "দশ": 10,
                          "আধা": 0.5, "দেড়": 1.5, "আড়াই": 2.5
                        };
                        
                        // Try to find digits or matching words
                        let foundNum = null;
                        const digits = speech.match(/\d+(\.\d+)?/);
                        if (digits) {
                          foundNum = parseFloat(digits[0]);
                        } else {
                          for (const key in numMap) {
                            if (speech.includes(key)) {
                              foundNum = numMap[key];
                              break;
                            }
                          }
                        }
                        
                        if (foundNum !== null) {
                          handleOtChange({ target: { value: foundNum.toString() } });
                          showDialog({ title: "Voice Entry", message: `আমি বুঝেছি: "${speech}" (${foundNum} ঘণ্টা)`, type: "success" });
                        } else {
                          showDialog({ title: "No Number Found", message: `আপনি বলেছেন: "${speech}", কিন্তু কোনো সংখ্যা খুঁজে পাইনি।`, type: "info" });
                        }
                      };
                    }}
                    style={{ background: "rgba(0,243,255,0.1)", border: "1px solid var(--primary)", color: "var(--primary)", padding: "4px 10px", borderRadius: "15px", fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    <i className="ri-mic-line"></i> মুখে বলুন
                  </button>
                </label>
                <div className="input-with-icon" style={{ position: "relative" }}>
                  <i className="ri-time-line" style={{ position: "absolute", left: "15px", top: "15px", color: "#888" }}></i>
                  <input
                    type="number"
                    value={ot}
                    onChange={handleOtChange}
                    placeholder="0"
                    step="0.5"
                    style={{ paddingLeft: "45px" }}
                  />
                  <small style={{ color: "#aaa", display: "block", marginTop: "5px" }}>* 4hr = Auto Tiffin, 7hr = Auto Night</small>
                </div>
              </div>

              <div className="form-row">
                <div className="checkbox-card" onClick={() => setTiffin(!tiffin)}>
                  <input type="checkbox" checked={tiffin} readOnly />
                  <label>
                    <i className="ri-restaurant-line"></i>
                    Tiffin (+{settings.tiffinRate || 30})
                  </label>
                </div>
                <div className="checkbox-card" onClick={() => setNight(!night)}>
                  <input type="checkbox" checked={night} readOnly />
                  <label>
                    <i className="ri-moon-clear-line"></i>
                    Night (+{settings.nightRate || 50})
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "15px" }}>
                <label>Friday Bill (if applicable)</label>
                <div className="input-with-icon" style={{ position: "relative" }}>
                  <i className="ri-money-dollar-circle-line" style={{ position: "absolute", left: "15px", top: "15px", color: "#888" }}></i>
                  <input
                    type="number"
                    value={friday}
                    onChange={(e) => setFriday(e.target.value)}
                    placeholder="0"
                    style={{ paddingLeft: "45px" }}
                  />
                </div>
              </div>
            </div>
          )}

          {type !== "work" && (
            <div id="group-amount">
              <div className="form-group">
                <label>Amount (৳)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}

          <button type="button" className="btn-primary" onClick={handleSave}>
            <i className="ri-save-3-line"></i> Save Record
          </button>

        </div>
      </form>
    </section>
  );
}
