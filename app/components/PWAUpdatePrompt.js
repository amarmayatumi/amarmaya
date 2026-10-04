"use client";

import { useEffect, useState } from "react";

export default function PWAUpdatePrompt() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleUpdate = (registration) => {
        if (registration.waiting || registration.installing) {
          setWaitingWorker(registration.waiting || registration.installing);
          setShow(true);
        }

        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          newWorker.onstatechange = () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShow(true);
            }
          };
        };
      };

      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) handleUpdate(reg);
      });
    }
  }, []);

  const onUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShow(false);
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="pwa-update-banner">
      <div className="pwa-update-content">
        <i className="ri-refresh-line"></i>
        <span>New version available! Refresh to fix Address Bar.</span>
      </div>
      <button onClick={onUpdate}>Update Now</button>
      <style jsx>{`
        .pwa-update-banner {
          position: fixed;
          top: env(safe-area-inset-top, 10px);
          left: 10px;
          right: 10px;
          background: #00e5ff;
          color: #000;
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0, 229, 255, 0.3);
          animation: slideIn 0.5s ease;
        }
        .pwa-update-content {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 14px;
        }
        button {
          background: #000;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }
        @keyframes slideIn {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
