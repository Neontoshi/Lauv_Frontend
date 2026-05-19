import React, { useState, useEffect } from "react";
import { tauriCommands } from "../../services/tauriBridge";

const SettingsPage: React.FC = () => {
  const [listenbrainzToken, setListenbrainzToken] = useState("");
  const [listenbrainzUser, setListenbrainzUser] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    tauriCommands.getSetting("listenbrainz_token").then((token) => {
      if (token) setListenbrainzToken(token);
    });
    tauriCommands.getSetting("listenbrainz_user").then((user) => {
      if (user) setListenbrainzUser(user);
    });
  }, []);

  const handleSave = async () => {
    await tauriCommands.setSetting("listenbrainz_token", listenbrainzToken);
    await tauriCommands.setSetting("listenbrainz_user", listenbrainzUser);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="song-list-pane" style={{ padding: "24px" }}>
      <div className="section-title" style={{ marginBottom: "24px" }}>
        Settings
      </div>

      <div style={{ maxWidth: "500px" }}>
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text2)",
              fontSize: "14px",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            ListenBrainz Username
          </label>
          <input
            type="text"
            value={listenbrainzUser}
            onChange={(e) => setListenbrainzUser(e.target.value)}
            placeholder="Your ListenBrainz username"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text2)",
              fontSize: "14px",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            ListenBrainz Token
          </label>
          <input
            type="password"
            value={listenbrainzToken}
            onChange={(e) => setListenbrainzToken(e.target.value)}
            placeholder="Paste your ListenBrainz user token"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <div
            style={{
              marginTop: "6px",
              fontSize: "11px",
              color: "var(--text3)",
            }}
          >
            Find your token at{" "}
            <a
              href="https://listenbrainz.org/profile/"
              target="_blank"
              rel="noopener"
              style={{ color: "var(--accent)" }}
            >
              listenbrainz.org/profile
            </a>
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            padding: "10px 24px",
            background: saved ? "var(--accent2)" : "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {saved ? "✓ Saved" : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
