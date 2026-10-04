"use client";

export default function CustomDialog({ isOpen, title, message, type, onConfirm, onCancel }) {
  if (!isOpen) return null;

  let iconClass = "ri-information-line";
  let iconColor = "var(--primary)";

  if (type === "confirm") {
    iconClass = "ri-question-line";
    iconColor = "var(--accent)";
  } else if (type === "danger") {
    iconClass = "ri-error-warning-line";
    iconColor = "#ff3838";
  } else if (type === "success") {
    iconClass = "ri-checkbox-circle-line";
    iconColor = "var(--secondary)";
  }

  return (
    <div className="modal-overlay" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 10000, animation: "fadeIn 0.2s ease-out"
    }}>
      <div className="glass-card animate-pop" style={{
        width: "90%", maxWidth: "400px", padding: "35px 25px",
        textAlign: "center", border: `1px solid ${iconColor}44`,
        boxShadow: `0 0 30px ${iconColor}11`
      }}>
        <div style={{ fontSize: "4rem", color: iconColor, marginBottom: "20px" }}>
          <i className={iconClass}></i>
        </div>
        <h2 style={{ color: iconColor, marginBottom: "10px", fontSize: "1.5rem", fontWeight: "800" }}>
          {title || "Notification"}
        </h2>
        <p style={{ color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "30px" }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px" }}>
          {(type === "confirm" || type === "danger") && (
            <button 
              className="btn-outline" 
              onClick={onCancel}
              style={{ padding: "12px 25px", borderRadius: "10px", border: "1px solid #333", color: "#888", background: "none", cursor: "pointer" }}
            >
              CANCEL
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={onConfirm}
            style={{ 
              padding: "12px 30px", borderRadius: "10px", border: "none", 
              background: type === "danger" ? "#ff3838" : "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "#fff", fontWeight: "bold", cursor: "pointer", width: "auto"
            }}
          >
            {type === "confirm" || type === "danger" ? "CONFIRM" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
