"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import CustomDialog from "./components/CustomDialog";

const AppContext = createContext();

const initialSettings = {
  name: "User",
  floor: "",
  gross: 14650,
  basic: 8133,
  house: 4067,
  medical: 750,
  transport: 450,
  food: 1250,
  bonus: 725,
  hourlyRate: 78.21,
  tiffinRate: 30,
  nightRate: 50,
  savingsGoal: 10,
  holidayMultiplier: 2.0,
};

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null, onCancel: null });
  const [syncToast, setSyncToast] = useState(null); // { status: 'syncing' | 'done' | 'error' }

  // Ref to always hold latest data for the online event handler
  const latestRef = useRef({ settings, entries, uid, isLoaded });
  // A local reset pauses cloud writes until the user explicitly changes or restores data.
  const cloudSyncPausedRef = useRef(false);
  // Serialize cloud writes so an older, slower request cannot overwrite newer data.
  const cloudSyncQueueRef = useRef(Promise.resolve());
  const cloudSyncVersionRef = useRef(0);
  useEffect(() => {
    latestRef.current = { settings, entries, uid, isLoaded };
  }, [settings, entries, uid, isLoaded]);

  const showDialog = (options) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title: options.title || "Notification",
        message: options.message || "",
        type: options.type || "info",
        onConfirm: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  // Core sync function — saves to localStorage + cloud
  const performSync = useCallback(async ({ settings: s, entries: e, uid: u } = {}) => {
    const { settings: cs, entries: ce, uid: cu, isLoaded: cl } = latestRef.current;
    const syncSettings = s ?? cs;
    const syncEntries = e ?? ce;
    const syncUid = u ?? cu;

    if (!syncUid || !cl || cloudSyncPausedRef.current) return false;

    const syncVersion = cloudSyncVersionRef.current;
    const saveToCloud = async () => {
      // Drop snapshots queued before a reset or explicit restore.
      if (syncVersion !== cloudSyncVersionRef.current || cloudSyncPausedRef.current) return false;
      try {
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", uid: syncUid, data: { settings: syncSettings, entries: syncEntries } }),
        });
        return res.ok;
      } catch (e) {
        console.error("API Sync error", e);
        return false;
      }
    };

    // Queue saves in order; each request uses the snapshot captured above.
    const queuedSave = cloudSyncQueueRef.current.then(saveToCloud, saveToCloud);
    cloudSyncQueueRef.current = queuedSave.then(() => undefined, () => undefined);
    return queuedSave;
  }, []);

  // Initialize UID and load local data / Auto-restore from migration
  useEffect(() => {
    const loadData = async () => {
      try {
        // নতুন app: শুধু নিজের localStorage data ব্যবহার করি।
        // Cloud restore শুধুমাত্র Settings থেকে UID দিয়ে explicitly করা যাবে।
        let savedUid = localStorage.getItem("my_ot_uid");
        if (!/^U[a-f0-9]{32}$/i.test(savedUid || "")) savedUid = null;

        if (!savedUid) {
          const randomId = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, "")
            : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
          savedUid = "U" + randomId;
        }
        localStorage.setItem("my_ot_uid", savedUid);
        setUid(savedUid);

        const s = localStorage.getItem("my_ot_settings");
        const e = localStorage.getItem("my_ot_entries");

        if (s) {
          try {
            const parsedS = JSON.parse(s);
            setSettings((prev) => ({ ...prev, ...parsedS }));
          } catch (err) {}
        }
        if (e) {
          try {
            setEntries(JSON.parse(e) || []);
          } catch (err) {}
        }
        setIsLoaded(true);
      } catch (e) {
        console.error("Local load error", e);
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Persist locally immediately; cloud sync remains debounced separately.
  // This protects recent edits if the tab closes before the cloud debounce fires.
  useEffect(() => {
    if (!isLoaded || !uid) return;
    try {
      localStorage.setItem("my_ot_settings", JSON.stringify(settings));
      localStorage.setItem("my_ot_entries", JSON.stringify(entries));
    } catch (error) {
      console.error("Local storage save error", error);
    }
  }, [settings, entries, isLoaded, uid]);

  // Sync to cloud when state changes
  useEffect(() => {
    if (!isLoaded || !uid) return;

    // Debounce DB sync slightly using timeout
    const delaySync = setTimeout(() => performSync(), 1500);
    return () => clearTimeout(delaySync);
  }, [settings, entries, isLoaded, uid, performSync]);

  // ✅ AUTO-SYNC ON CONNECTION — ইন্টারনেট ফিরে এলে সাথে সাথে ব্যাকআপ
  useEffect(() => {
    const handleOnline = async () => {
      const { isLoaded: cl, uid: cu } = latestRef.current;
      if (!cl || !cu) return;

      setSyncToast({ status: 'syncing' });

      const ok = await performSync();

      setSyncToast({ status: ok ? 'done' : 'error' });

      // ২ সেকেন্ড পর টোস্ট হাইড করা
      setTimeout(() => setSyncToast(null), 2500);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [performSync]);

  const restoreFromCloud = async (targetUid) => {
    if (typeof targetUid !== "string" || !/^U[a-f0-9]{32}$/i.test(targetUid)) return { success: false, message: "Invalid UID" };
    try {
      // Finish prior queued saves before fetching the requested cloud snapshot.
      await cloudSyncQueueRef.current;
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load", uid: targetUid }),
      });
      const result = await res.json();

      if (res.ok && result.status === "success" && result.data &&
          result.data.settings && typeof result.data.settings === "object" && !Array.isArray(result.data.settings) &&
          Array.isArray(result.data.entries)) {
        const { settings: newSettings, entries: newEntries } = result.data;
        
        // Final Safeguard: Merge with initial settings to ensure no missing properties
        const mergedSettings = { ...initialSettings, ...(newSettings || {}) };
        cloudSyncVersionRef.current += 1;
        cloudSyncPausedRef.current = false;
        setSettings(mergedSettings);
        setEntries(Array.isArray(newEntries) ? newEntries : []);
        setUid(targetUid);
        
        localStorage.setItem("my_ot_uid", targetUid);
        localStorage.setItem("my_ot_settings", JSON.stringify(mergedSettings));
        localStorage.setItem("my_ot_entries", JSON.stringify(newEntries || []));
        
        return { success: true, message: "Restored successfully" };
      }
      return { success: false, message: result.message || "ID not found" };
    } catch (e) {
      return { success: false, message: "Network error" };
    }
  };

  const updateSettings = (value) => {
    cloudSyncPausedRef.current = false;
    setSettings(value);
  };
  const addEntry = (entry) => {
    cloudSyncPausedRef.current = false;
    setEntries((prev) => [...prev, entry]);
  };
  const deleteEntry = (id) => {
    cloudSyncPausedRef.current = false;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };
  const restoreLocalBackup = (snapshot) => {
    if (!snapshot || typeof snapshot !== "object" || !snapshot.settings || typeof snapshot.settings !== "object" || Array.isArray(snapshot.settings) || !Array.isArray(snapshot.entries)) {
      return { success: false, message: "Backup file is invalid" };
    }
    try {
      const restoredSettings = { ...initialSettings, ...snapshot.settings };
      const restoredUid = typeof snapshot.uid === "string" && /^U[a-f0-9]{32}$/i.test(snapshot.uid)
        ? snapshot.uid
        : latestRef.current.uid;
      // Persist first; if storage is unavailable, leave in-memory state unchanged.
      localStorage.setItem("my_ot_settings", JSON.stringify(restoredSettings));
      localStorage.setItem("my_ot_entries", JSON.stringify(snapshot.entries));
      if (restoredUid) localStorage.setItem("my_ot_uid", restoredUid);
      // Do not overwrite a possibly newer cloud backup automatically.
      cloudSyncVersionRef.current += 1;
      cloudSyncPausedRef.current = true;
      setSettings(restoredSettings);
      setEntries(snapshot.entries);
      if (restoredUid) setUid(restoredUid);
      return { success: true };
    } catch (error) {
      console.error("Local backup restore failed", error);
      return { success: false, message: "Could not restore backup on this device" };
    }
  };

  const restorePreResetBackup = () => {
    try {
      const raw = localStorage.getItem("my_ot_pre_reset_backup");
      if (!raw) return { success: false, message: "No pre-reset backup found on this device" };
      const snapshot = JSON.parse(raw);
      return restoreLocalBackup(snapshot);
    } catch (error) {
      console.error("Pre-reset backup restore failed", error);
      return { success: false, message: "Could not read the pre-reset backup" };
    }
  };

  const clearData = () => {
    // Keep a recoverable snapshot before clearing anything on this device.
    // The existing cloud record is intentionally left untouched.
    try {
      const snapshot = {
        version: 1,
        savedAt: new Date().toISOString(),
        uid: latestRef.current.uid,
        settings: latestRef.current.settings,
        entries: latestRef.current.entries,
      };
      localStorage.setItem("my_ot_pre_reset_backup", JSON.stringify(snapshot));
    } catch (error) {
      console.error("Could not create pre-reset backup; reset cancelled", error);
      return false;
    }

    cloudSyncVersionRef.current += 1;
    cloudSyncPausedRef.current = true;
    setSettings(initialSettings);
    setEntries([]);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        setSettings: updateSettings,
        entries,
        uid,
        isLoaded,
        addEntry,
        deleteEntry,
        restoreFromCloud,
        restoreLocalBackup,
        restorePreResetBackup,
        clearData,
        showDialog
      }}
    >
      {children}
      <CustomDialog {...dialog} />

      {/* ✅ Auto-sync toast notification */}
      {syncToast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: syncToast.status === 'done'
            ? 'rgba(0, 200, 100, 0.92)'
            : syncToast.status === 'error'
            ? 'rgba(255, 80, 80, 0.92)'
            : 'rgba(30, 30, 40, 0.92)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${syncToast.status === 'done' ? 'rgba(0,200,100,0.4)' : syncToast.status === 'error' ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '30px',
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.35s ease',
          whiteSpace: 'nowrap',
        }}>
          {syncToast.status === 'syncing' && (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
              ব্যাকআপ হচ্ছে...
            </>
          )}
          {syncToast.status === 'done' && <>✅ ক্লাউডে সেভ হয়ে গেছে!</>}
          {syncToast.status === 'error' && <>⚠️ সংযোগ সমস্যা, পরে চেষ্টা হবে</>}
        </div>
      )}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
