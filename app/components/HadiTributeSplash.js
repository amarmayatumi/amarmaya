"use client";

import { useState, useEffect } from "react";

export default function HadiTributeSplash({ onComplete }) {
  const [visible, setVisible] = useState(true);

  const dismissSplash = () => {
    setVisible(false);
    setTimeout(onComplete, 300); // Wait for fade out animation
  };

  useEffect(() => {
    // Show splash screen for 1.5 seconds
    const timer = setTimeout(dismissSplash, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div 
      onClick={dismissSplash}
      style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "radial-gradient(circle at center, #2a0808 0%, #050000 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "fadeOut 0.3s ease-out 1.5s forwards",
      overflow: "hidden", cursor: "pointer"
    }}>
      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; pointer-events: none; } }
        @keyframes scaleIn { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Background blood red accent */}
      <div style={{
        position: "absolute", top: "-20%", right: "-20%", width: "60vw", height: "60vw",
        background: "radial-gradient(circle, rgba(255,0,0,0.15) 0%, transparent 60%)",
        filter: "blur(40px)"
      }}></div>

      {/* Tribute Image */}
      <div style={{
        width: "220px", height: "220px", borderRadius: "20px",
        overflow: "hidden", marginBottom: "30px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,56,56,0.2)",
        animation: "scaleIn 1s cubic-bezier(0.1, 0.9, 0.2, 1) forwards",
        background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <img 
          src="/hadi.jpg" 
          alt="Shahid Sharif Osman Hadi" 
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            // Fallback if hadi.jpg is not found yet
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div style={{ display: "none", color: "var(--primary)", fontSize: "40px", animation: "pulse 2s infinite" }}>
          ⚡
        </div>
      </div>

      {/* Text & Hashtag */}
      <div style={{ textAlign: "center", animation: "slideUp 1s cubic-bezier(0.1, 0.9, 0.2, 1) 0.3s both" }}>
        <h1 style={{ 
          color: "#fff", fontSize: "1.8rem", fontWeight: 800, marginBottom: "8px",
          letterSpacing: "1px", textShadow: "0 2px 10px rgba(0,0,0,0.5)" 
        }}>
          শহীদ শরীফ ওসমান হাদি
        </h1>
        <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "25px", fontWeight: 300 }}>
          সীমানাগুলো পৃথিবীর, কিন্তু তুমি তো আসমানের!
        </p>
        
        <div style={{ 
          background: "linear-gradient(90deg, transparent, rgba(255,56,56,0.15), transparent)",
          padding: "10px 40px", display: "inline-block", position: "relative"
        }}>
          <div style={{ 
            color: "#ff3838", fontSize: "1.4rem", fontWeight: 800, 
            letterSpacing: "3px", textShadow: "0 0 20px rgba(255,56,56,0.5)"
          }}>
            #JUSTICEFORHADI
          </div>
        </div>
      </div>
    </div>
  );
}
