"use client";

import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceOS, setDeviceOS] = useState("android");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setDeviceOS("ios");

    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    setIsStandalone(!!standalone);
    if (standalone || localStorage.getItem("pwa_install_dismissed") === "1") return;

    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("pwa_installed", "1");
        setShow(false);
      }
      setDeferredPrompt(null);
      return;
    }

    alert(
      deviceOS === "ios"
        ? "Safari-এর Share (📤) বাটনে চাপুন → Add to Home Screen নির্বাচন করুন।"
        : "Chrome-এর ৩টি ডট (⋮) মেনুতে চাপুন → Install app বা Add to Home screen নির্বাচন করুন।"
    );
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_install_dismissed", "1");
  };

  if (!show || isStandalone) return null;

  return (
    <div style={{
      position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 40px)", maxWidth: "460px",
      background: "rgba(10,10,12,0.97)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(0,243,255,0.3)", borderRadius: "20px",
      padding: "20px", zIndex: 5000, boxShadow: "0 10px 40px rgba(0,243,255,0.15)"
    }}>
      <div style={{
        background: "rgba(0,243,255,0.08)", border: "1px solid rgba(0,243,255,0.18)",
        borderRadius: "10px", padding: "8px 12px", marginBottom: "12px",
        fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, textAlign: "center"
      }}>
        📱 ফোনে দ্রুত ব্যবহার করতে App ইন্সটল করুন
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
        <div style={{
          width: "55px", height: "55px", background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", flexShrink: 0
        }}>
          📲
        </div>
        <div>
          <div style={{ fontWeight: 800, color: "#fff", fontSize: "1rem" }}>My Overtime App ইন্সটল করুন</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "2px" }}>ফুল-স্ক্রিনে দ্রুত অ্যাপটি ব্যবহার করুন।</div>
        </div>
      </div>

      {!deferredPrompt && (
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "10px 12px",
          fontSize: "0.75rem", color: "#aaa", marginBottom: "15px", borderLeft: "3px solid var(--primary)", lineHeight: "1.4"
        }}>
          {deviceOS === "ios"
            ? "Safari-এর Share (📤) বাটনে চাপুন এবং Add to Home Screen নির্বাচন করুন।"
            : "Chrome-এর ৩টি ডট (⋮) মেনুতে চাপুন এবং Install app বা Add to Home screen নির্বাচন করুন।"}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "18px" }}>
        {[
          { icon: "ri-fullscreen-line", label: "Full Screen" },
          { icon: "ri-link-unlink-m", label: "No Address Bar" },
          { icon: "ri-shield-check-line", label: "Secure" },
        ].map((f) => (
          <div key={f.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
            <i className={f.icon} style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
            <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "4px" }}>{f.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleDismiss} style={{ flex: 1, padding: "12px", background: "none", border: "1px solid #333", borderRadius: "10px", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>পরে</button>
        <button onClick={handleInstall} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", border: "none", borderRadius: "10px", color: "#111", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>
          <i className="ri-download-2-line"></i> ইন্সটল করুন
        </button>
      </div>
    </div>
  );
}
