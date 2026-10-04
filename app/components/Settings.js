"use client";

import { useState } from "react";
import { useAppContext } from "../AppContext";

export default function Settings() {
  const { settings, setSettings, uid, restoreFromCloud, clearData, showDialog } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: settings.name || "",
    floor: settings.floor || "",
    gross: settings.gross || 0,
    bonus: settings.bonus || 0,
    tiffinRate: settings.tiffinRate || 30,
    nightRate: settings.nightRate || 50,
    savingsGoal: settings.savingsGoal || 10,
    holidayMultiplier: settings.holidayMultiplier || 2.0,
  });

  const [restoreId, setRestoreId] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateBreakdown = () => {
    const gross = parseFloat(formData.gross) || 0;
    const fixed = 750 + 450 + 1250;
    let core = gross - fixed;
    if (core < 0) core = 0;
    
    const basic = Math.ceil(core / 1.5);
    const house = Math.round(core - basic);
    const rate = (basic / 208) * 2;
    
    return { basic, house, rate, medical: 750, transport: 450, food: 1250 };
  };

  const currentVars = calculateBreakdown();

  const handleSave = async () => {
    setSettings((prev) => ({
      ...prev,
      name: formData.name,
      floor: formData.floor,
      gross: parseFloat(formData.gross) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      tiffinRate: parseFloat(formData.tiffinRate) || 30,
      nightRate: parseFloat(formData.nightRate) || 50,
      savingsGoal: parseFloat(formData.savingsGoal) || 10,
      holidayMultiplier: parseFloat(formData.holidayMultiplier) || 2.0,
      basic: currentVars.basic,
      house: currentVars.house,
      hourlyRate: parseFloat(currentVars.rate.toFixed(2))
    }));
    await showDialog({ title: "Saved!", message: "Settings have been saved and synced.", type: "success" });
  };

  const handleRestore = async () => {
    if(!restoreId) return;
    const res = await restoreFromCloud(restoreId);
    if(res.success) {
      await showDialog({ title: "Restored!", message: "Your data has been synced from cloud.", type: "success" });
    } else {
      await showDialog({ title: "Failed", message: `Restore failed: ${res.message}`, type: "danger" });
    }
  };

  const handleCopyUid = async () => {
    navigator.clipboard.writeText(uid);
    await showDialog({ title: "Copied!", message: "Your Unique ID has been copied to clipboard.", type: "success" });
  };

  return (
    <section className="view active animate-fade-in pb-24">
      <div className="page-title">Settings</div>
      
      <form className="glass-form" onSubmit={e => e.preventDefault()}>
        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>Auto Salary Calculator (Gazette 2023)</div>
        
        <div className="glass-card p-3" style={{ background: "rgba(30, 30, 30, 0.9)", border: "1px solid #444", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label><i className="ri-money-dollar-circle-line"></i> Total Gross Salary (৳)</label>
            <input 
              type="number" 
              name="gross"
              value={formData.gross} 
              onChange={handleChange}
              style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff", width: "100%", padding: "10px", background: "#111", border: "1px solid #333", borderRadius: "8px" }}
            />
          </div>
          <div className="form-group">
            <label><i className="ri-hand-coin-line"></i> Attendance Bonus (৳)</label>
            <input 
              type="number" 
              name="bonus"
              value={formData.bonus}
              onChange={handleChange}
              style={{ padding: "10px", width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
            />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Bill Rates</div>
        <div className="form-row" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Tiffin (৳)</label>
            <input type="number" name="tiffinRate" value={formData.tiffinRate} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Night (৳)</label>
            <input type="number" name="nightRate" value={formData.nightRate} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>সেভিংস ও ছুটির রেট (Savings & Holidays)</div>
        <div className="form-row" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Savings Target (%)</label>
            <input type="number" name="savingsGoal" value={formData.savingsGoal} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Holiday Multiplier</label>
            <input type="number" step="0.1" name="holidayMultiplier" value={formData.holidayMultiplier} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Full Breakdown</div>
        <div className="breakdown-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Basic Salary</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.basic}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>House Rent</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.house}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Medical</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.medical}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Transport</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.transport}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(0,150,255,0.1)", border: "1px solid rgba(0,150,255,0.3)", borderRadius: "12px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#4a9eff", fontWeight: "700", textTransform: "uppercase" }}>Food Allowance</span>
            <span style={{ fontWeight: "900", color: "#fff", fontSize: "1.2rem" }}>৳{currentVars.food}</span>
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: "center", border: "1px solid #444", background: "rgba(30, 30, 30, 0.9)", padding: "20px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ color: "var(--secondary)", marginBottom: "5px", fontSize: "0.9rem", fontWeight: "bold" }}>YOUR OT RATE (HOURLY)</div>
          <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#fff", fontFamily: "'Courier New', monospace" }}>
            {currentVars.rate.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>(Basic / 208) × 2</div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Profile Info</div>
        <div className="form-group" style={{ marginBottom: "15px" }}>
          <label>Your Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} style={{ width: "100%", padding: "10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
        </div>
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label>Floor / Unit</label>
          <input type="text" name="floor" value={formData.floor} onChange={handleChange} style={{ width: "100%", padding: "10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
        </div>

        {/* Cloud Sync section matched to HTML */}
        <div className="glass-card p-3" style={{ background: "rgba(0, 70, 255, 0.1)", border: "1px solid rgba(0, 100, 255, 0.3)", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ color: "#4a9eff", marginBottom: "10px", fontWeight: "bold" }}><i className="ri-cloud-line"></i> Cloud Sync (Auto)</div>
          <p style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "15px" }}>Your data is synced automatically. Use your Unique ID to restore.</p>
          
          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label style={{ color: "#4a9eff", display: "block", marginBottom: "5px", fontSize: "0.8rem" }}>Your Unique ID (KEEP SAFE)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" readOnly value={uid || "Loading..."} style={{ background: "#000", color: "#fff", fontFamily: "monospace", flex: 1, textAlign: "center", border: "1px solid #333", padding: "8px", borderRadius: "5px" }} />
              <button type="button" onClick={handleCopyUid} style={{ background: "#333", border: "none", color: "#fff", padding: "8px 15px", borderRadius: "5px", cursor: "pointer" }}><i className="ri-file-copy-line"></i></button>
            </div>
          </div>

          <div className="form-group" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "0.8rem" }}>Restore Data</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" value={restoreId} onChange={e => setRestoreId(e.target.value)} placeholder="Enter Old UID" style={{ flex: 1, padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
              <button type="button" onClick={handleRestore} style={{ background: "#4a9eff", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>RESTORE</button>
            </div>
          </div>
        </div>

        {/* Developer Support Section */}
        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Developer Support</div>
        <div className="glass-card" style={{ padding: "18px", background: "rgba(0,0,0,0.5)", border: "1px solid #333", borderRadius: "10px", marginBottom: "30px" }}>
          <p style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "15px", lineHeight: "1.6" }}>
            অ্যাপটি নিয়ে আপনাদের যেকোনো পরামর্শ বা মতামত থাকলে, অথবা কোনো সমস্যা হলে আমাদের ইমেইল করে জানান।
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ri-information-line" style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
            <span style={{ color: "#fff", fontWeight: "bold" }}>নতুন deployment-এর support contact পরে সেট করা হবে।</span>
          </div>
        </div>

        <button type="button" className="btn-primary" onClick={handleSave} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#fff", border: "none", cursor: "pointer", borderRadius: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
          Save Configuration
        </button>
        
        <div style={{ marginTop: "30px", textAlign: "center" }}>
           <button type="button" onClick={async () => {
             const ok = await showDialog({ title: "Reset Data", message: "This will clear all local data. Are you sure?", type: "danger" });
             if(ok) clearData();
           }} style={{ background: "transparent", border: "1px solid #ff3838", color: "#ff3838", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", width: "100%", textTransform: "uppercase", fontWeight: "bold" }}>
             Reset Local Data
           </button>
        </div>

      </form>
    </section>
  );
}
