"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import "./admin-global.css";

/* ─── helpers ─────────────────────────────────────────── */
const avClass = (name) => `av${((name || "A").charCodeAt(0)) % 8}`;
const initials = (name) => {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function AdminPanel() {
  /* ── auth ── */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token,      setToken]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");

  /* ── navigation ── */
  const [view, setView] = useState("dashboard");

  /* ── data ── */
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalEntries: 0 });
  const [search, setSearch] = useState("");

  /* ── worker detail ── */
  const [userDetail,      setUserDetail]      = useState(null);
  const [detailTab,       setDetailTab]       = useState("profile");
  const [isEditingUser,   setIsEditingUser]   = useState(false);
  const [editForm,        setEditForm]        = useState({});
  const [selectedMonth,   setSelectedMonth]   = useState("");
  const [isEditingEntry,  setIsEditingEntry]  = useState(false);
  const [editingEntryObj, setEditingEntryObj] = useState(null);

  /* ── announcements ── */
  const [adMsg,         setAdMsg]         = useState("");
  const [currentNotice, setCurrentNotice] = useState("");
  const [adDuration,    setAdDuration]    = useState(24);
  const [cdName,        setCdName]        = useState("");
  const [cdDate,        setCdDate]        = useState("");
  const [cdEnabled,     setCdEnabled]     = useState(false);

  /* ── team ── */
  const [teamMonth,   setTeamMonth]   = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [teamData,    setTeamData]    = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoaded,  setTeamLoaded]  = useState(false);

  const [mounted, setMounted] = useState(false);

  /* ─── API helpers ───────────────────────────────────── */
  const calcStats = useCallback((list) => {
    const now = Date.now() / 1000;
    setStats({
      totalUsers:   list.length,
      activeUsers:  list.filter(u => now - u.last_modified < 86400 * 7).length,
      totalEntries: list.reduce((a, u) => a + (u.entries || 0), 0),
    });
  }, []);

  const fetchUsers = useCallback(async (authToken) => {
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list_users", token: authToken }) });
      const d = await r.json();
      if (d.status === "success") { setUsers(d.data); calcStats(d.data); }
      else if (d.message === "Unauthorized") {
        localStorage.removeItem("my_ot_admin_token");
        setIsLoggedIn(false); setToken(""); setView("dashboard");
      }
      else if (d.message?.includes("Database"))
        setError("ডাটাবেজ সংযোগ এখনো সেটআপ করা হয়নি।");
    } catch (e) { console.error(e); }
  }, [calcStats]);

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const resCampaign = await fetch("/api/user?action=get_campaign");
      const dCampaign = await resCampaign.json();
      if (dCampaign.status === "success" && dCampaign.data) {
        const campaign = dCampaign.data;
        const now = Date.now();
        if (campaign.message && now >= (campaign.start || 0) && now <= (campaign.end || Infinity)) {
          setCurrentNotice(campaign.message);
        } else {
          setCurrentNotice("");
        }
      }

      const resCountdown = await fetch("/api/user?action=get_countdown");
      const dCountdown = await resCountdown.json();
      if (dCountdown.status === "success" && dCountdown.data) {
        const cd = dCountdown.data;
        setCdEnabled(!!cd.enabled);
        setCdName(cd.name || "");
        setCdDate(cd.date || "");
      }
    } catch (e) {
      console.error("Error fetching global settings:", e);
    }
  }, []);

  /* ─── init ─────────────────────────────────────────── */
  useEffect(() => {
    setMounted(true);
    fetchGlobalSettings();
    const t = localStorage.getItem("my_ot_admin_token");
    if (t) { setToken(t); setIsLoggedIn(true); fetchUsers(t); }
  }, [fetchUsers, fetchGlobalSettings]);

  /* calcStats and fetchUsers defined above useEffect */

  const handleLogin = async (e) => {
    e.preventDefault(); setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_login", password }),
      });
      const d = await r.json();
      if (d.status === "success") {
        const tk = d.data.token;
        setToken(tk); setIsLoggedIn(true);
        localStorage.setItem("my_ot_admin_token", tk);
        fetchUsers(tk);
      } else setError(d.message === "Invalid Password" ? "পাসওয়ার্ড ভুল হয়েছে!" : d.message);
    } catch { setError("ইন্টারনেট কানেকশন সমস্যা"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("my_ot_admin_token");
    setIsLoggedIn(false); setToken(""); setView("dashboard");
  };

  const loadUserDetail = async (uid) => {
    setView("detail"); setUserDetail({ uid, loading: true });
    setIsEditingUser(false); setIsEditingEntry(false); setDetailTab("profile");
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_user_full", token, uid }) });
      const d = await r.json();
      if (d.status === "success") {
        const full = { uid, ...d.data, loading: false };
        setUserDetail(full); setEditForm(d.data.settings || {});
        if (d.data.entries?.length) {
          const months = [...new Set(d.data.entries.map(e => e.date?.substring(0, 7)))].filter(Boolean).sort().reverse();
          if (months.length) setSelectedMonth(months[0]);
        }
      }
    } catch (e) { console.error(e); }
  };

  const savePayload = async (payload, msg) => {
    try {
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", token, uid: userDetail.uid, data: payload }),
      });
      if (r.ok) { setUserDetail({ ...userDetail, ...payload }); fetchUsers(token); if (msg) alert(msg); }
      else alert("সার্ভার এরর। সেভ করা সম্ভব হয়নি।");
    } catch { alert("নেটওয়ার্ক সমস্যা।"); }
  };

  const saveProfile = () => {
    savePayload({ settings: editForm, entries: userDetail.entries || [] }, "প্রোফাইল আপডেট হয়েছে! ✅");
    setIsEditingUser(false);
  };

  const deleteUser = async (uid) => {
    if (!confirm("এই কর্মীর সম্পূর্ণ রেকর্ড স্থায়ীভাবে মুছবেন?")) return;
    try {
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_user", token, uid }),
      });
      if (r.ok) { alert("ডিলিট হয়েছে।"); setView("users"); fetchUsers(token); }
    } catch { alert("ডিলিট করতে সমস্যা হয়েছে"); }
  };

  const saveEntry = () => {
    if (!editingEntryObj) return;
    const orig = [...(userDetail.entries || [])];
    let updated;
    if (editingEntryObj.isNew) {
      delete editingEntryObj.isNew;
      if (!editingEntryObj.date || !editingEntryObj.amount) return alert("তারিখ ও পরিমাণ দেওয়া বাধ্যতামূলক।");
      updated = [...orig, editingEntryObj];
    } else {
      updated = orig.map(e => (e.date === editingEntryObj.originalDate && e.id === editingEntryObj.id) ? editingEntryObj : e);
    }
    delete editingEntryObj.originalDate;
    savePayload({ settings: userDetail.settings, entries: updated }, "রেকর্ড সেভ হয়েছে! ✅");
    setIsEditingEntry(false);
  };

  const deleteEntry = (entry) => {
    if (!confirm(`${entry.date} তারিখের রেকর্ড ডিলিট করবেন?`)) return;
    const updated = (userDetail.entries || []).filter(e => !(e.date === entry.date && e.id === entry.id));
    savePayload({ settings: userDetail.settings, entries: updated }, "রেকর্ড ডিলিট হয়েছে।");
  };

  const sendNotice = async (msg, durationHours = 87600) => {
    try {
      const start = Date.now();
      const end = msg ? (start + durationHours * 3600000) : start;
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_campaign", token, message: msg, start, end }),
      });
      if (r.ok) {
        if (msg) {
          alert("নোটিশ সফলভাবে প্রচার করা হয়েছে! 📢");
          setCurrentNotice(msg);
        } else {
          alert("নোটিশ মুছে ফেলা হয়েছে। ❌");
          setCurrentNotice("");
        }
        setAdMsg("");
      } else {
        alert("সার্ভার এরর। নোটিশ পাঠানো সম্ভব হয়নি।");
      }
    } catch {
      alert("নেটওয়ার্ক সমস্যা।");
    }
  };

  const saveCountdown = async () => {
    if (cdEnabled && (!cdName || !cdDate)) return alert("নাম ও তারিখ দিন।");
    try {
      const r = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_countdown", token, countdownEnabled: cdEnabled, countdownName: cdName, countdownDate: cdDate }),
      });
      if (r.ok) alert("কাউন্টডাউন সেভ হয়েছে! ✅");
    } catch { alert("সমস্যা হয়েছে"); }
  };

  const downloadCSV = () => {
    let csv = "\uFEFFName,Phone/ID,Floor,Hourly Rate,Gross Salary,Total Entries\n";
    users.forEach(u => {
      const s = u.settings || {};
      csv += `"${u.name||"Unknown"}","${u.uid||""}","${s.floor||"N/A"}","${s.hourlyRate||0}","${s.gross||0}","${u.entries||0}"\n`;
    });
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `Worker_Roster_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const loadTeamMonthData = async () => {
    if (!users.length) return alert("কোনো কর্মী পাওয়া যায়নি।");
    setTeamLoading(true); setTeamLoaded(false); setTeamData([]);
    try {
      const results = await Promise.all(
        users.map(u =>
          fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get_user_full", token, uid: u.uid }) })
            .then(r => r.json()).then(d => d.status === "success" ? { uid: u.uid, ...d.data } : null).catch(() => null)
        )
      );
      const computed = results.filter(Boolean).map(u => {
        const s = u.settings || {};
        const entries = (u.entries || []).filter(e => e.date?.startsWith(teamMonth) && (e.type === "work" || !e.type));
        const totalOT       = entries.reduce((a, e) => a + (parseFloat(e.ot) || 0), 0);
        const tiffinDays    = entries.filter(e => e.tiffin).length;
        const nightDays     = entries.filter(e => e.night).length;
        const hr            = parseFloat(s.hourlyRate) || 0;
        const otEarnings    = totalOT * hr;
        const tiffinEarnings = tiffinDays * (parseFloat(s.tiffinRate) || 30);
        const nightEarnings  = nightDays  * (parseFloat(s.nightRate)  || 50);
        const friEarnings    = entries.reduce((a, e) => a + (parseFloat(e.friday) || 0), 0);
        const gross = parseFloat(s.gross) || 0;
        const bonus = parseFloat(s.bonus) || 0;
        return {
          uid: u.uid, name: s.name || "অজানা", floor: s.floor || "N/A",
          gross, bonus, hourlyRate: hr, totalOT, tiffinDays, nightDays,
          otEarnings, tiffinEarnings, nightEarnings, friEarnings,
          totalEarnings: gross + bonus + otEarnings + tiffinEarnings + nightEarnings + friEarnings,
          entryCount: entries.length,
        };
      }).sort((a, b) => b.totalOT - a.totalOT);
      setTeamData(computed); setTeamLoaded(true);
    } catch { alert("ডেটা লোড করতে সমস্যা হয়েছে"); }
    setTeamLoading(false);
  };

  const downloadDetailedExcel = () => {
    if (!teamData.length) return alert("আগে মাসিক ডেটা লোড করুন।");
    const label = new Date(teamMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
    let xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="OT Report"><Table><Row><Cell ss:MergeAcross="11"><Data ss:Type="String">টিম ওভারটাইম রিপোর্ট - ${label}</Data></Cell></Row><Row><Cell><Data ss:Type="String">ক্রম</Data></Cell><Cell><Data ss:Type="String">নাম</Data></Cell><Cell><Data ss:Type="String">ফ্লোর</Data></Cell><Cell><Data ss:Type="String">গ্রস (৳)</Data></Cell><Cell><Data ss:Type="String">OT ঘণ্টা</Data></Cell><Cell><Data ss:Type="String">OT আয় (৳)</Data></Cell><Cell><Data ss:Type="String">টিফিন দিন</Data></Cell><Cell><Data ss:Type="String">টিফিন (৳)</Data></Cell><Cell><Data ss:Type="String">নাইট দিন</Data></Cell><Cell><Data ss:Type="String">নাইট (৳)</Data></Cell><Cell><Data ss:Type="String">মোট আয় (৳)</Data></Cell><Cell><Data ss:Type="String">কাজের দিন</Data></Cell></Row>`;
    teamData.forEach((w, i) => {
      xml += `<Row><Cell><Data ss:Type="Number">${i+1}</Data></Cell><Cell><Data ss:Type="String">${w.name}</Data></Cell><Cell><Data ss:Type="String">${w.floor}</Data></Cell><Cell><Data ss:Type="Number">${w.gross}</Data></Cell><Cell><Data ss:Type="Number">${w.totalOT.toFixed(1)}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(w.otEarnings)}</Data></Cell><Cell><Data ss:Type="Number">${w.tiffinDays}</Data></Cell><Cell><Data ss:Type="Number">${w.tiffinEarnings}</Data></Cell><Cell><Data ss:Type="Number">${w.nightDays}</Data></Cell><Cell><Data ss:Type="Number">${w.nightEarnings}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(w.totalEarnings)}</Data></Cell><Cell><Data ss:Type="Number">${w.entryCount}</Data></Cell></Row>`;
    });
    const t = teamData.reduce((a, w) => ({ ot: a.ot + w.totalOT, oe: a.oe + w.otEarnings, te: a.te + w.totalEarnings }), { ot: 0, oe: 0, te: 0 });
    xml += `<Row><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String">মোট সমষ্টি</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="Number">${t.ot.toFixed(1)}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(t.oe)}</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="Number">${Math.round(t.te)}</Data></Cell><Cell><Data ss:Type="String"></Data></Cell></Row></Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Team_OT_${teamMonth}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  /* ─── derived ───────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    const t = search.toLowerCase();
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(t) ||
      (u.uid  || "").toLowerCase().includes(t) ||
      (u.settings?.floor || "").toLowerCase().includes(t)
    );
  }, [users, search]);

  const monthlyGroups = useMemo(() => {
    if (!userDetail?.entries) return {};
    const g = {};
    userDetail.entries.forEach((e, idx) => {
      if (!e.date) return;
      const m = e.date.substring(0, 7);
      if (!g[m]) g[m] = { otHours: 0, earnings: 0, items: [] };
      if (e.type === "work" || !e.type) g[m].otHours += parseFloat(e.ot) || 0;
      g[m].earnings += parseFloat(e.amount) || 0;
      g[m].items.push({ ...e, id: e.id || `tmp-${idx}`, originalDate: e.date });
    });
    Object.keys(g).forEach(k => g[k].items.sort((a, b) => b.date.localeCompare(a.date)));
    return g;
  }, [userDetail]);

  if (!mounted) return null;

  /* ════════════════════════════════════════════════════
     LOGIN SCREEN
  ════════════════════════════════════════════════════ */
  if (!isLoggedIn) return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo"><i className="ri-shield-keyhole-fill"></i></div>
        <div className="login-title">মাস্টার কন্ট্রোল</div>
        <div className="login-sub">শুধুমাত্র অ্যাডমিনদের জন্য</div>
        <form onSubmit={handleLogin}>
          <input
            className="login-input" type="password"
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" autoFocus
          />
          <button type="submit" className="login-btn">
            <i className="ri-login-circle-fill"></i> প্রবেশ করুন
          </button>
        </form>
        {error && <div className="login-err"><i className="ri-error-warning-fill"></i>{error}</div>}
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════
     MAIN APP
  ════════════════════════════════════════════════════ */
  return (
    <div className="admin-app">
      <main className="main-content">

        {/* ══ DASHBOARD ═══════════════════════════════════ */}
        {view === "dashboard" && (
          <div className="view">
            {/* Hero */}
            <div className="hero-banner">
              <div className="hero-greeting"><i className="ri-base-station-line"></i> সার্ভার সচল</div>
              <div className="hero-title">হেডকোয়ার্টার 🏢</div>
              <span className="hero-chip">● অ্যাডমিন প্যানেল • {new Date().toLocaleDateString("bn-BD")}</span>
            </div>

            {error && <div className="err-banner"><i className="ri-error-warning-fill" style={{fontSize:"1.3rem",flexShrink:0}}></i>{error}</div>}

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-box c1">
                <i className="ri-team-fill s-icon"></i>
                <div className="s-val">{stats.totalUsers}</div>
                <div className="s-lbl">মোট কর্মী</div>
              </div>
              <div className="stat-box c2">
                <i className="ri-pulse-line s-icon"></i>
                <div className="s-val">{stats.activeUsers}</div>
                <div className="s-lbl">সক্রিয় (৭দিন)</div>
              </div>
              <div className="stat-box c3">
                <i className="ri-file-list-3-fill s-icon"></i>
                <div className="s-val">{stats.totalEntries}</div>
                <div className="s-lbl">মোট রেকর্ড</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-label">দ্রুত অ্যাকশন</div>
            <div className="quick-grid">
              <button className="quick-btn qw" onClick={() => setView("users")}>
                <i className="ri-shield-user-fill"></i>
                <div className="q-lbl">কর্মী তালিকা</div>
                <div className="q-sub">{stats.totalUsers} জন নিবন্ধিত</div>
              </button>
              <button className="quick-btn qt" onClick={() => setView("team")}>
                <i className="ri-bar-chart-grouped-fill"></i>
                <div className="q-lbl">টিম রিপোর্ট</div>
                <div className="q-sub">মাসিক OT তুলনা</div>
              </button>
              <button className="quick-btn qn" onClick={() => setView("announcements")}>
                <i className="ri-broadcast-fill"></i>
                <div className="q-lbl">নোটিশ পাঠান</div>
                <div className="q-sub">সকল কর্মীকে</div>
              </button>
              <button className="quick-btn qe" onClick={downloadCSV}>
                <i className="ri-download-cloud-fill"></i>
                <div className="q-lbl">CSV এক্সপোর্ট</div>
                <div className="q-sub">কর্মী তালিকা</div>
              </button>
            </div>

            {/* Top Earners (live from users) */}
            {users.length > 0 && (() => {
              const sorted = [...users]
                .filter(u => u.settings?.hourlyRate)
                .sort((a, b) => (parseFloat(b.settings?.hourlyRate || 0) * (b.entries || 0)) - (parseFloat(a.settings?.hourlyRate || 0) * (a.entries || 0)))
                .slice(0, 4);
              if (sorted.length === 0) return null;
              const medals = ["🥇", "🥈", "🥉", "🎖️"];
              return (
                <>
                  <div className="section-label">শীর্ষ উপার্জনকারী কর্মী</div>
                  <div className="top-earner-grid">
                    {sorted.map((u, i) => (
                      <div key={u.uid} className="top-earner-card" onClick={() => loadUserDetail(u.uid)}>
                        <div className="te-rank">{medals[i]}</div>
                        <div className="te-name">{u.name || "অজানা"}</div>
                        <div className="te-floor"><i className="ri-building-4-line"></i> {u.settings?.floor || "N/A"}</div>
                        <div className="te-ot">৳{parseFloat(u.settings?.hourlyRate || 0)}/ঘণ্টা</div>
                        <div className="te-earn">{u.entries} টি এন্ট্রি রেকর্ড</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Server Status */}
            <div className="server-status">
              <div className="sdot"></div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.85rem"}}>সিস্টেম সচল আছে</div>
                <div style={{fontSize:"0.7rem",opacity:0.7,marginTop:"2px"}}>ডেটা সিঙ্ক চালু • নেটওয়ার্ক স্বাভাবিক</div>
              </div>
              <div style={{marginLeft:"auto",fontSize:"0.68rem",color:"var(--text-muted)",textAlign:"right"}}>
                <div>{new Date().toLocaleDateString("bn-BD")}</div>
                <div style={{color:"var(--success)",fontWeight:700}}>LIVE</div>
              </div>
            </div>
          </div>
        )}

        {/* ══ WORKER LIST ═════════════════════════════════ */}
        {view === "users" && (
          <div className="view">
            <div className="page-header">
              <button className="back-btn" onClick={() => setView("dashboard")}><i className="ri-arrow-left-s-line"></i></button>
              <h1>কর্মী তালিকা</h1>
              <div className="ph-spacer"></div>
              <button className="btn btn-ghost btn-sm" onClick={downloadCSV}><i className="ri-download-line"></i> CSV</button>
            </div>

            {error && <div className="err-banner"><i className="ri-error-warning-fill" style={{flexShrink:0}}></i>{error}</div>}

            <div className="search-bar">
              <i className="ri-search-line"></i>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="নাম, আইডি বা ফ্লোর দিয়ে খুঁজুন…" />
            </div>

            <div style={{fontSize:"0.72rem",color:"var(--text-muted)",marginBottom:"12px"}}>
              {filteredUsers.length} জন কর্মী পাওয়া গেছে
            </div>

            {filteredUsers.length === 0
              ? <div className="empty-state"><i className="ri-user-search-line"></i>কোনো কর্মী পাওয়া যায়নি</div>
              : filteredUsers.map(u => (
                <div key={u.uid} className="worker-card" onClick={() => loadUserDetail(u.uid)}>
                  <div className={`w-avatar ${avClass(u.name || u.uid)}`}>{initials(u.name || u.uid)}</div>
                  <div className="w-info">
                    <div className="w-name">{u.name || "অজানা নাম"}</div>
                    <div className="w-meta"><i className="ri-building-4-line"></i>{u.settings?.floor || "ফ্লোর দেওয়া নেই"}</div>
                    <div className="w-meta" style={{fontFamily:"monospace",fontSize:"0.62rem",opacity:0.65}}>{u.uid}</div>
                  </div>
                  <div className="w-badge">{u.entries} এন্ট্রি</div>
                </div>
              ))
            }
          </div>
        )}

        {/* ══ WORKER DETAIL ═══════════════════════════════ */}
        {view === "detail" && userDetail && (
          <div className="view">
            <div className="page-header">
              <button className="back-btn" onClick={() => setView("users")}><i className="ri-arrow-left-s-line"></i></button>
              <h1>কর্মী বিবরণ</h1>
            </div>

            {userDetail.loading ? (
              <div className="empty-state" style={{paddingTop:"80px"}}>
                <i className="ri-loader-4-line ri-spin" style={{opacity:1,color:"var(--primary)",fontSize:"3rem"}}></i>
                <div style={{marginTop:"12px"}}>ডেটা লোড হচ্ছে…</div>
              </div>
            ) : (
              <>
                {/* Profile card top */}
                <div className="card glow-p" style={{textAlign:"center",paddingTop:"28px",paddingBottom:"22px"}}>
                  <div className={`profile-av-lg ${avClass(userDetail.settings?.name || userDetail.uid)}`}>
                    {initials(userDetail.settings?.name || userDetail.uid)}
                  </div>
                  <div className="p-name">{userDetail.settings?.name || "অজানা নাম"}</div>
                  <div className="p-floor"><i className="ri-building-4-line"></i> {userDetail.settings?.floor || "ফ্লোর সেট নেই"}</div>
                  <div className="p-uid">{userDetail.uid}</div>
                </div>

                {/* Tabs */}
                <div className="detail-tabs">
                  {[
                    { id:"profile",  icon:"ri-user-settings-line", label:"প্রোফাইল" },
                    { id:"entries",  icon:"ri-time-line",           label:"রেকর্ড"   },
                    { id:"action",   icon:"ri-settings-3-line",     label:"অ্যাকশন"  },
                  ].map(t => (
                    <button key={t.id} className={`tab-btn ${detailTab === t.id ? "active" : ""}`} onClick={() => setDetailTab(t.id)}>
                      <i className={t.icon}></i>{t.label}
                    </button>
                  ))}
                </div>

                {/* ── TAB: PROFILE ── */}
                {detailTab === "profile" && (
                  <div>
                    {isEditingUser ? (
                      <div className="card">
                        <div style={{color:"var(--primary)",fontWeight:800,marginBottom:"16px",display:"flex",alignItems:"center",gap:"8px"}}>
                          <i className="ri-edit-circle-line"></i> প্রোফাইল এডিট
                        </div>
                        <div className="form-group">
                          <label className="f-label p">পুরো নাম</label>
                          <input className="f-input" value={editForm.name||""} onChange={e => setEditForm({...editForm,name:e.target.value})} placeholder="কর্মীর নাম" />
                        </div>
                        <div className="form-group">
                          <label className="f-label p">ফ্লোর / সেকশন</label>
                          <input className="f-input" value={editForm.floor||""} onChange={e => setEditForm({...editForm,floor:e.target.value})} placeholder="ফ্লোরের নাম" />
                        </div>
                        <div className="form-row form-group">
                          <div>
                            <label className="f-label p">গ্রস স্যালারি (৳)</label>
                            <input className="f-input" type="number" value={editForm.gross||""} onChange={e => setEditForm({...editForm,gross:Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="f-label s">OT রেট/ঘণ্টা</label>
                            <input className="f-input" type="number" value={editForm.hourlyRate||""} onChange={e => setEditForm({...editForm,hourlyRate:Number(e.target.value)})} />
                          </div>
                        </div>
                        <div className="form-row form-group">
                          <div>
                            <label className="f-label p">হাজিরা বোনাস (৳)</label>
                            <input className="f-input" type="number" value={editForm.bonus||""} onChange={e => setEditForm({...editForm,bonus:Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="f-label s">টিফিন রেট (৳)</label>
                            <input className="f-input" type="number" value={editForm.tiffinRate||""} onChange={e => setEditForm({...editForm,tiffinRate:Number(e.target.value)})} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="f-label s">নাইট রেট (৳)</label>
                          <input className="f-input" type="number" value={editForm.nightRate||""} onChange={e => setEditForm({...editForm,nightRate:Number(e.target.value)})} />
                        </div>
                        <div className="form-row" style={{gap:"10px",marginTop:"6px"}}>
                          <button className="btn btn-p" style={{flex:2}} onClick={saveProfile}><i className="ri-save-line"></i>সেভ করুন</button>
                          <button className="btn btn-ghost" style={{flex:1}} onClick={() => { setIsEditingUser(false); setEditForm(userDetail.settings||{}); }}>বাতিল</button>
                        </div>
                      </div>
                    ) : (
                      <div className="card">
                        <div className="salary-grid">
                          <div className="salary-chip">
                            <div className="sc-lbl">গ্রস স্যালারি</div>
                            <div className="sc-val" style={{color:"var(--primary)"}}>৳{userDetail.settings?.gross||0}</div>
                          </div>
                          <div className="salary-chip">
                            <div className="sc-lbl">OT রেট/ঘণ্টা</div>
                            <div className="sc-val" style={{color:"var(--secondary)"}}>৳{userDetail.settings?.hourlyRate||0}</div>
                          </div>
                          <div className="salary-chip">
                            <div className="sc-lbl">হাজিরা বোনাস</div>
                            <div className="sc-val" style={{color:"var(--accent)"}}>৳{userDetail.settings?.bonus||0}</div>
                          </div>
                          <div className="salary-chip">
                            <div className="sc-lbl">টিফিন রেট</div>
                            <div className="sc-val">৳{userDetail.settings?.tiffinRate||0}</div>
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-full" onClick={() => setIsEditingUser(true)}>
                          <i className="ri-edit-2-line"></i> প্রোফাইল এডিট করুন
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB: ENTRIES ── */}
                {detailTab === "entries" && (
                  <div>
                    <div className="card glow-s">
                      <div style={{color:"var(--secondary)",fontWeight:800,marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}>
                        <i className="ri-database-2-fill"></i> শিফট ও ডিউটি রেকর্ড
                      </div>

                      {/* Month Pills */}
                      {Object.keys(monthlyGroups).length > 0 ? (
                        <div className="m-pills">
                          {Object.keys(monthlyGroups).sort().reverse().map(m => (
                            <div key={m} className={`m-pill ${selectedMonth===m?"active":""}`} onClick={() => setSelectedMonth(m)}>
                              {new Date(m+"-01").toLocaleString("default",{month:"short",year:"numeric"})}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state" style={{padding:"20px 0"}}>
                          <i className="ri-folder-open-line"></i>কোনো রেকর্ড নেই
                        </div>
                      )}

                      {/* Add Entry Button */}
                      <button className="btn btn-ghost btn-full" style={{marginBottom:"16px",color:"var(--primary)",borderColor:"rgba(0,243,255,0.3)"}}
                        onClick={() => { setIsEditingEntry(true); setEditingEntryObj({isNew:true,date:new Date().toISOString().substring(0,10),ot:"0",amount:"0",type:"work"}); }}>
                        <i className="ri-add-box-line"></i> নতুন শিফট যোগ করুন
                      </button>

                      {/* Entry List */}
                      {selectedMonth && monthlyGroups[selectedMonth] && !isEditingEntry && (
                        <>
                          <div style={{display:"flex",justifyContent:"space-between",background:"rgba(0,0,0,0.4)",padding:"10px 14px",borderRadius:"10px",marginBottom:"14px",border:"1px solid var(--border)"}}>
                            <span style={{fontSize:"0.78rem",color:"var(--text-muted)"}}>এই মাসে মোট আয়</span>
                            <span style={{fontWeight:800,color:"var(--accent)"}}>৳{Math.round(monthlyGroups[selectedMonth].earnings)}</span>
                          </div>
                          {monthlyGroups[selectedMonth].items.map(entry => (
                            <div key={entry.id} className={`entry-item t-${entry.type||"work"}`}>
                              <div className="e-date">
                                <div className="e-day">{parseInt(entry.date.split("-")[2])}</div>
                                <div className="e-mon">{new Date(entry.date).toLocaleString("default",{month:"short"})}</div>
                              </div>
                              <div className="e-info">
                                <div className="e-val">৳{entry.amount}</div>
                                <div className="e-lbl">
                                  {entry.type==="leave"?"ছুটি":entry.type==="bonus"?"বোনাস":`${entry.ot||0} ঘণ্টা OT`}
                                </div>
                              </div>
                              <div style={{display:"flex",gap:"6px"}}>
                                <button className="btn-icon" onClick={() => { setIsEditingEntry(true); setEditingEntryObj({...entry}); }}><i className="ri-pencil-fill"></i></button>
                                <button className="btn-icon del" onClick={() => deleteEntry(entry)}><i className="ri-delete-bin-fill"></i></button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Entry Editor */}
                      {isEditingEntry && editingEntryObj && (
                        <div style={{background:"rgba(189,0,255,0.06)",border:"1px solid rgba(189,0,255,0.3)",borderRadius:"14px",padding:"16px",marginTop:"10px",animation:"fadeUp 0.3s"}}>
                          <div style={{color:"var(--secondary)",fontWeight:800,marginBottom:"14px",fontSize:"0.9rem"}}>
                            {editingEntryObj.isNew ? "🆕 নতুন রেকর্ড" : "✏️ রেকর্ড এডিট"}
                          </div>
                          <div className="form-group">
                            <label className="f-label p">তারিখ</label>
                            <input className="f-input" type="date" value={editingEntryObj.date||""} onChange={e => setEditingEntryObj({...editingEntryObj,date:e.target.value})} />
                          </div>
                          <div className="form-row form-group">
                            <div>
                              <label className="f-label p">OT (ঘণ্টা)</label>
                              <input className="f-input" type="number" step="0.5" value={editingEntryObj.ot||""} onChange={e => setEditingEntryObj({...editingEntryObj,ot:e.target.value})} />
                            </div>
                            <div>
                              <label className="f-label s">পরিমাণ (৳)</label>
                              <input className="f-input" type="number" value={editingEntryObj.amount||""} onChange={e => setEditingEntryObj({...editingEntryObj,amount:e.target.value})} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="f-label p">কাজের ধরন</label>
                            <select className="f-input" value={editingEntryObj.type||"work"} onChange={e => setEditingEntryObj({...editingEntryObj,type:e.target.value})}>
                              <option value="work">রেগুলার কাজ (ডিউটি + OT)</option>
                              <option value="leave">ছুটি / অনুপস্থিতি</option>
                              <option value="bonus">বোনাস / অন্যান্য ভাতা</option>
                            </select>
                          </div>
                          <div className="form-row" style={{gap:"10px",marginTop:"6px"}}>
                            <button className="btn btn-s" style={{flex:2}} onClick={saveEntry}><i className="ri-save-line"></i>সেভ করুন</button>
                            <button className="btn btn-ghost" style={{flex:1}} onClick={() => setIsEditingEntry(false)}>বাতিল</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: ACTIONS ── */}
                {detailTab === "action" && (
                  <div>
                    <div className="card glow-d">
                      <div style={{color:"var(--danger)",fontWeight:800,marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
                        <i className="ri-alarm-warning-fill"></i> বিপজ্জনক অ্যাকশন
                      </div>
                      <div style={{fontSize:"0.82rem",color:"var(--text-muted)",marginBottom:"20px",lineHeight:1.65}}>
                        নিচের বাটনে ক্লিক করলে এই কর্মীর সমস্ত তথ্য, রেকর্ড ও একাউন্ট স্থায়ীভাবে মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো সম্ভব নয়।
                      </div>
                      <button className="btn btn-d btn-full" onClick={() => deleteUser(userDetail.uid)}>
                        <i className="ri-close-circle-fill"></i> সম্পূর্ণ রেকর্ড মুছে ফেলুন
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ ANNOUNCEMENTS ═══════════════════════════════ */}
        {view === "announcements" && (
          <div className="view">
            <div className="page-header">
              <button className="back-btn" onClick={() => setView("dashboard")}><i className="ri-arrow-left-s-line"></i></button>
              <h1>নোটিশ ব্রডকাস্ট</h1>
            </div>

            <div className="card glow-p">
              <div style={{color:"var(--primary)",fontWeight:800,marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}>
                <i className="ri-broadcast-fill"></i> গ্লোবাল নোটিশ (Global Notice Alert)
              </div>

              {/* Active Notice Status */}
              <div style={{
                background: currentNotice ? "rgba(0, 243, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
                border: currentNotice ? "1px solid rgba(0, 243, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "16px",
                boxShadow: currentNotice ? "0 0 15px rgba(0, 243, 255, 0.1)" : "none"
              }}>
                <div style={{fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px"}}>
                  {currentNotice ? "🟢 সক্রিয় নোটিশ (Currently Active Notice):" : "⚪ কোনো নোটিশ সক্রিয় নেই (No Active Notice):"}
                </div>
                {currentNotice ? (
                  <div>
                    <div dangerouslySetInnerHTML={{__html: currentNotice}} style={{fontSize:"0.9rem", color:"#fff", lineHeight: "1.4", marginBottom: "12px"}} />
                    <button className="btn btn-d" style={{padding: "6px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "5px"}} onClick={() => sendNotice("", 0)}>
                      <i className="ri-close-circle-line"></i> নোটিশটি মুছে ফেলুন (Delete Notice)
                    </button>
                  </div>
                ) : (
                  <div style={{color:"var(--text-muted)", fontStyle:"italic", fontSize:"0.84rem"}}>ড্যাশবোর্ডে বর্তমানে কোনো নোটিশ দেখাচ্ছে না।</div>
                )}
              </div>

              {/* Quick Template Grid */}
              <div style={{color:"var(--secondary)",fontWeight:700,fontSize:"0.85rem",marginBottom:"10px"}}>কুইক টেমপ্লেট (সিলেক্ট করতে ক্লিক করুন):</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
                <button className="btn btn-ghost" style={{justifyContent:"center",textAlign:"center",padding: "8px 4px",fontSize:"0.75rem",borderColor:"rgba(0,243,255,0.2)"}}
                  onClick={() => setAdMsg("✅ <b>জরুরি নোটিশ:</b> সবাই দয়া করে নিজেদের ওভারটাইম রেকর্ড প্রতিদিন অ্যাপে সংরক্ষণ করুন।")}>
                  📢 ওটি রেকর্ড নোটিশ
                </button>
                <button className="btn btn-ghost" style={{justifyContent:"center",textAlign:"center",padding: "8px 4px",fontSize:"0.75rem",borderColor:"rgba(189,0,255,0.2)"}}
                  onClick={() => setAdMsg("💰 <b>অ্যালার্ট:</b> এই সপ্তাহের বোনাস ডাটাবেজে আপডেট করা হয়েছে।")}>
                  💰 বোনাস নোটিশ
                </button>
                <button className="btn btn-ghost" style={{justifyContent:"center",textAlign:"center",padding: "8px 4px",fontSize:"0.75rem",borderColor:"rgba(255,0,85,0.2)"}}
                  onClick={() => setAdMsg("💳 <b>নোটিশ:</b> এই মাসের বেতন ও ওভারটাইম শীট প্রস্তুত করা হয়েছে।")}>
                  💳 বেতন নোটিশ
                </button>
                <button className="btn btn-ghost" style={{justifyContent:"center",textAlign:"center",padding: "8px 4px",fontSize:"0.75rem",borderColor:"rgba(255,213,0,0.2)"}}
                  onClick={() => setAdMsg("🎉 <b>ঈদ মোবারক:</b> সবাইকে পবিত্র ঈদ-উল-আযহার অগ্রিম শুভেচ্ছা!")}>
                  🌙 ঈদের শুভেচ্ছা
                </button>
              </div>

              {/* Custom Notice Text Area */}
              <div className="form-group" style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:"12px"}}>
                <label className="f-label p" style={{marginBottom:"6px", fontSize: "0.8rem"}}>নোটিশের বার্তা লিখুন (Preview matches typing)</label>
                <textarea className="f-input" value={adMsg} onChange={e => setAdMsg(e.target.value)} rows={3} placeholder="এখানে নোটিশের মেসেজটি লিখুন..." style={{resize:"none", fontSize: "0.85rem"}}></textarea>
              </div>

              {/* Live Preview of Input */}
              {adMsg && (
                <div style={{background:"rgba(255, 255, 255, 0.02)", border:"1px dashed rgba(255,255,255,0.2)", borderRadius:"8px", padding:"10px", marginBottom:"12px"}}>
                  <div style={{fontSize: "0.7rem", color: "var(--secondary)", marginBottom: "4px"}}>টাইপিং প্রিভিউ (HTML সমর্থিত):</div>
                  <div dangerouslySetInnerHTML={{__html: adMsg}} style={{fontSize: "0.85rem", color: "#fff", wordBreak: "break-word"}} />
                </div>
              )}

              <button className="btn btn-p btn-full" onClick={() => {
                if (!adMsg.trim()) return alert("নোটিশের বার্তা ফাঁকা রাখা যাবে না।");
                sendNotice(adMsg, 87600); // Send long-running notice
              }} style={{padding: "12px"}}>
                <i className="ri-send-plane-fill"></i> 🚀 নোটিশ প্রচার করুন (Publish Notice)
              </button>
            </div>

            {/* Countdown */}
            <div className="card glow-a">
              <div style={{color:"var(--accent)",fontWeight:800,marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
                <i className="ri-timer-flash-fill"></i> কাউন্টডাউন সেটিং
              </div>
              <div style={{fontSize:"0.8rem",color:"var(--text-muted)",marginBottom:"16px"}}>
                সকল কর্মীর ড্যাশবোর্ডে ছুটি বা উৎসবের কাউন্টডাউন দেখান।
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"12px",background:"rgba(255,213,0,0.06)",border:"1px solid rgba(255,213,0,0.18)",borderRadius:"12px",padding:"14px",marginBottom:"16px"}}>
                <label style={{flex:1,fontWeight:700,color:"#fff",fontSize:"0.9rem"}}>কাউন্টডাউন চালু করুন</label>
                <input type="checkbox" checked={cdEnabled} onChange={e => setCdEnabled(e.target.checked)} />
              </div>
              {cdEnabled && (
                <div style={{animation:"fadeUp 0.3s"}}>
                  <div className="form-group">
                    <label className="f-label a">অনুষ্ঠানের নাম</label>
                    <input className="f-input" value={cdName} onChange={e => setCdName(e.target.value)} placeholder="যেমন: ঈদ-উল-আযহা" />
                  </div>
                  <div className="form-group">
                    <label className="f-label a">তারিখ</label>
                    <input className="f-input" type="date" value={cdDate} onChange={e => setCdDate(e.target.value)} />
                  </div>
                </div>
              )}
              <button className="btn btn-ghost btn-full" style={{color:"var(--accent)",borderColor:"rgba(255,213,0,0.3)"}} onClick={saveCountdown}>
                <i className="ri-save-fill"></i> সেটিং সেভ করুন
              </button>
            </div>
          </div>
        )}

        {/* ══ TEAM OVERVIEW ═══════════════════════════════ */}
        {view === "team" && (
          <div className="view">
            <div className="page-header">
              <button className="back-btn" onClick={() => setView("dashboard")}><i className="ri-arrow-left-s-line"></i></button>
              <h1>টিম ওভারভিউ</h1>
              <div className="ph-spacer"></div>
              {teamLoaded && (
                <button className="btn btn-g btn-sm" onClick={downloadDetailedExcel}>
                  <i className="ri-file-excel-2-line"></i> Excel
                </button>
              )}
            </div>

            {/* Month Picker */}
            <div className="card glow-p">
              <div style={{color:"var(--primary)",fontWeight:800,marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                <i className="ri-calendar-2-line"></i> মাস নির্বাচন করুন
              </div>
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                <input type="month" value={teamMonth} className="f-input" style={{flex:1}}
                  onChange={e => { setTeamMonth(e.target.value); setTeamLoaded(false); setTeamData([]); }} />
                <button className="btn btn-p" onClick={loadTeamMonthData} disabled={teamLoading} style={{whiteSpace:"nowrap"}}>
                  {teamLoading ? <><i className="ri-loader-4-line ri-spin"></i> লোড হচ্ছে</> : <><i className="ri-refresh-line"></i> লোড করুন</>}
                </button>
              </div>
              {teamLoaded && (
                <div style={{marginTop:"10px",fontSize:"0.78rem",color:"var(--success)",display:"flex",alignItems:"center",gap:"6px"}}>
                  <i className="ri-checkbox-circle-fill"></i> {teamData.length} জন কর্মীর ডেটা লোড হয়েছে
                </div>
              )}
            </div>

            {/* Top 3 Performers */}
            {teamLoaded && teamData.length > 0 && (
              <div className="card glow-a">
                <div style={{color:"var(--accent)",fontWeight:800,marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                  <i className="ri-trophy-fill"></i> শীর্ষ পারফর্মার
                </div>
                {teamData.slice(0, 3).map((w, i) => (
                  <div key={w.uid} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",borderRadius:"12px",marginBottom:"8px",background:i===0?"rgba(255,213,0,0.08)":i===1?"rgba(192,192,192,0.06)":"rgba(205,127,50,0.06)",border:`1px solid ${i===0?"rgba(255,213,0,0.25)":i===1?"rgba(192,192,192,0.15)":"rgba(205,127,50,0.15)"}`}}>
                    <span style={{fontSize:"1.8rem"}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#fff"}}>{w.name}</div>
                      <div style={{fontSize:"0.7rem",color:"var(--text-muted)"}}>{w.floor}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:800,color:i===0?"var(--accent)":"#fff",fontSize:"1.1rem"}}>{w.totalOT.toFixed(1)}h</div>
                      <div style={{fontSize:"0.7rem",color:"var(--text-muted)"}}>৳{Math.round(w.otEarnings)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Full Table */}
            {teamLoaded && teamData.length > 0 && (
              <div className="card">
                <div style={{fontWeight:800,marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                  <i className="ri-bar-chart-grouped-line"></i> সকল কর্মীর রিপোর্ট
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 6px",fontSize:"0.8rem"}}>
                    <thead>
                      <tr style={{color:"var(--text-muted)",fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"1px"}}>
                        <th style={{textAlign:"left",padding:"4px 8px"}}>#</th>
                        <th style={{textAlign:"left",padding:"4px 8px"}}>নাম</th>
                        <th style={{textAlign:"center",padding:"4px 8px"}}>OT</th>
                        <th style={{textAlign:"right",padding:"4px 8px"}}>মোট আয়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((w, i) => (
                        <tr key={w.uid} style={{background:"rgba(255,255,255,0.025)"}}>
                          <td style={{padding:"10px 8px",color:"#555",fontWeight:700}}>{i+1}</td>
                          <td style={{padding:"10px 8px"}}>
                            <div style={{fontWeight:700,color:"#fff"}}>{w.name}</div>
                            <div style={{fontSize:"0.62rem",color:"var(--text-muted)"}}>{w.floor}</div>
                          </td>
                          <td style={{padding:"10px 8px",textAlign:"center"}}>
                            <span style={{background:"rgba(0,243,255,0.1)",color:"var(--primary)",padding:"3px 10px",borderRadius:"20px",fontWeight:700}}>{w.totalOT.toFixed(1)}h</span>
                          </td>
                          <td style={{padding:"10px 8px",textAlign:"right",fontWeight:700,color:"#fff"}}>৳{Math.round(w.totalEarnings).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:"1px solid var(--border)"}}>
                        <td colSpan={2} style={{padding:"10px 8px",color:"var(--accent)",fontWeight:800}}>মোট</td>
                        <td style={{padding:"10px 8px",textAlign:"center",color:"var(--primary)",fontWeight:800}}>{teamData.reduce((s,w)=>s+w.totalOT,0).toFixed(1)}h</td>
                        <td style={{padding:"10px 8px",textAlign:"right",color:"var(--accent)",fontWeight:800}}>৳{Math.round(teamData.reduce((s,w)=>s+w.totalEarnings,0)).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Floor OT Bar Chart */}
            {teamLoaded && teamData.length > 0 && (() => {
              const fm = {};
              teamData.forEach(w => {
                if (!fm[w.floor]) fm[w.floor] = {count:0,totalOT:0,totalEarnings:0};
                fm[w.floor].count++; fm[w.floor].totalOT += w.totalOT; fm[w.floor].totalEarnings += w.totalEarnings;
              });
              const floorArr = Object.entries(fm).sort((a,b)=>b[1].totalOT-a[1].totalOT);
              const maxFloorOT = Math.max(...floorArr.map(([,d])=>d.totalOT), 1);
              return (
                <div className="card glow-s">
                  <div style={{color:"var(--secondary)",fontWeight:800,marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}>
                    <i className="ri-building-4-line"></i> ফ্লোরভিত্তিক OT চার্ট
                  </div>
                  <div className="floor-chart">
                    {floorArr.map(([floor, data]) => (
                      <div key={floor} className="floor-bar-row">
                        <div className="floor-bar-label" title={floor}>{floor}</div>
                        <div className="floor-bar-track">
                          <div
                            className="floor-bar-fill"
                            style={{ width: `${Math.round((data.totalOT / maxFloorOT) * 100)}%` }}
                          />
                        </div>
                        <div className="floor-bar-val">{data.totalOT.toFixed(1)}h</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:"12px",display:"flex",flexWrap:"wrap",gap:"8px"}}>
                    {floorArr.map(([floor, data]) => (
                      <div key={floor} style={{fontSize:"0.68rem",background:"rgba(189,0,255,0.08)",border:"1px solid rgba(189,0,255,0.15)",borderRadius:"8px",padding:"5px 10px"}}>
                        <span style={{color:"#fff",fontWeight:700}}>{floor}</span>
                        <span style={{color:"var(--text-muted)",marginLeft:"6px"}}>{data.count} জন</span>
                        <span style={{color:"var(--accent)",marginLeft:"6px",fontWeight:700}}>৳{Math.round(data.totalEarnings/1000)}k</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!teamLoaded && !teamLoading && (
              <div className="empty-state">
                <i className="ri-group-line"></i>
                মাস নির্বাচন করে "লোড করুন" বাটনে চাপুন।
              </div>
            )}
          </div>
        )}

      </main>

      {/* ══ BOTTOM NAVIGATION ═══════════════════════════ */}
      {view !== "detail" && (
        <nav className="bottom-nav">
          {[
            { id:"dashboard",     icon:"ri-dashboard-3-fill",       label:"ড্যাশবোর্ড" },
            { id:"users",         icon:"ri-shield-user-fill",        label:"কর্মীরা"     },
            { id:"team",          icon:"ri-bar-chart-grouped-fill",  label:"টিম"         },
            { id:"announcements", icon:"ri-broadcast-fill",          label:"নোটিশ"       },
          ].map(n => (
            <button key={n.id} className={`nav-btn ${view===n.id?"active":""}`} onClick={() => setView(n.id)}>
              <i className={n.icon}></i>
              <span>{n.label}</span>
            </button>
          ))}
          <button className="nav-btn nav-d" onClick={handleLogout}>
            <i className="ri-logout-circle-fill"></i>
            <span>লগআউট</span>
          </button>
        </nav>
      )}
    </div>
  );
}
