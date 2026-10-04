"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js?v=1", { scope: "/" });
        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        const updateTimer = setInterval(() => registration.update(), 5 * 60 * 1000);
        return () => clearInterval(updateTimer);
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    };

    const onLoad = () => registerSW();
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
