"use client";

import { useEffect, useState } from "react";

export default function ShareModal({ isOpen, onClose }) {
  const [appUrl, setAppUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.origin + "/";
      setAppUrl(url);
    }
  }, []);

  useEffect(() => {
    if (isOpen) setLoading(true); // Reset loading when opened
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&ecc=L&bgcolor=ffffff`;

  return (
    <div className="modal-overlay" style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, padding: "20px", animation: "fade-in 0.3s ease"
    }}>
      <div className="share-card glass-card animate-slide-up" style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.8))",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px",
        padding: "30px", maxWidth: "400px", width: "100%", textAlign: "center",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
            <i className="ri-qr-code-fill"></i> Share App
          </h2>
          <button onClick={onClose} style={{ 
            background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", 
            width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer" 
          }}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="qr-container" style={{
          background: "#fff", padding: "15px", borderRadius: "16px", 
          display: "inline-block", marginBottom: "20px", boxShadow: "0 0 30px rgba(0,243,255,0.2)",
          position: "relative", minWidth: "230px", minHeight: "230px"
        }}>
          {loading && (
            <div className="animate-pulse" style={{
              position: "absolute", inset: "15px", background: "#f0f0f0", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#888"
            }}>
              <i className="ri-loader-4-line ri-spin" style={{ fontSize: "2rem" }}></i>
            </div>
          )}
          <img 
            src={qrUrl} 
            alt="QR Code" 
            onLoad={() => setLoading(false)}
            style={{ 
              width: "200px", height: "200px", display: "block",
              opacity: loading ? 0 : 1, transition: "0.3s"
            }} 
          />
        </div>

        <p style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "20px", lineHeight: "1.5" }}>
          Scan this QR code with your phone camera to <b>install the app</b> instantly!
        </p>

        <div className="link-box" style={{
          background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px",
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <span style={{ 
            fontSize: "0.8rem", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 
          }}>{appUrl}</span>
          <button onClick={handleCopy} style={{
            background: copied ? "var(--success)" : "var(--primary)",
            border: "none", color: "#000", padding: "6px 12px", borderRadius: "8px",
            fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", transition: "0.3s"
          }}>
            {copied ? <i className="ri-check-line"></i> : "Copy"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", opacity: 0.7, fontSize: "0.8rem" }}>
          <i className="ri-information-line"></i>
          <span>Scanned from any device</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
      `}</style>
    </div>
  );
}
