"use client";

import { useState } from "react";
import { AppProvider } from "./AppContext";
import Dashboard from "./components/Dashboard";
import AddEntry from "./components/AddEntry";
import History from "./components/History";
import Settings from "./components/Settings";
import Utilities from "./components/Utilities";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import HadiTributeSplash from "./components/HadiTributeSplash";
import ShareModal from "./components/ShareModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [historyMonth, setHistoryMonth] = useState(currentMonth);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <AppProvider>
      <div className="app-wrapper">
        {showSplash && <HadiTributeSplash onComplete={() => setShowSplash(false)} />}
        
        {/* Main Content Area */}
        <main>
          {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} setShareModal={setShowShareModal} />}
          {activeTab === "add" && <AddEntry setActiveTab={setActiveTab} />}
          {activeTab === "history" && <History initialMonth={historyMonth} />}
          {activeTab === "settings" && <Settings />}
          {activeTab === "utilities" && (
            <Utilities 
              onBack={() => setActiveTab("dashboard")} 
              onViewMonth={(m) => {
                setHistoryMonth(m);
                setActiveTab("history");
              }}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        {activeTab !== "utilities" && (
          <nav className="bottom-nav">
            <button className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
              <i className="ri-home-5-line"></i>
              <span>Home</span>
            </button>
            <button className={`nav-btn add-btn ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
              <i className="ri-add-line"></i>
            </button>
            <button className={`nav-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
              <i className="ri-file-list-3-line"></i>
              <span>History</span>
            </button>
            <button className={`nav-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
              <i className="ri-settings-4-line"></i>
              <span>Settings</span>
            </button>
          </nav>
        )}
        <PWAInstallPrompt />
        <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      </div>
    </AppProvider>
  );
}
