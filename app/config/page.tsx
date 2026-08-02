"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultOverlayConfig,
  loadOverlayConfig,
  saveOverlayConfig,
  OverlayConfig,
} from "../../lib/overlayConfig";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const FLAG_OPTIONS = [
  { code: "pl", label: "🇵🇱 Poland" },
  { code: "us", label: "🇺🇸 United States" },
  { code: "jp", label: "🇯🇵 Japan" },
  { code: "kr", label: "🇰🇷 South Korea" },
  { code: "cn", label: "🇨🇳 China" },
  { code: "gb", label: "🇬🇧 United Kingdom" },
  { code: "br", label: "🇧🇷 Brazil" },
  { code: "de", label: "🇩🇪 Germany" },
  { code: "fr", label: "🇫🇷 France" },
  { code: "es", label: "🇪🇸 Spain" },
  { code: "au", label: "🇦🇺 Australia" },
  { code: "ca", label: "🇨🇦 Canada" },
  { code: "mx", label: "🇲🇽 Mexico" },
  { code: "nl", label: "🇳🇱 Netherlands" },
  { code: "se", label: "🇸🇪 Sweden" },
  { code: "no", label: "🇳🇴 Norway" },
  { code: "fi", label: "🇫🇮 Finland" },
  { code: "ru", label: "🇷🇺 Russia" },
  { code: "it", label: "🇮🇹 Italy" },
  { code: "ph", label: "🇵🇭 Philippines" },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<OverlayConfig>(defaultOverlayConfig);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = loadOverlayConfig();
    if (stored) {
      setConfig(stored);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveOverlayConfig(config);

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("overlay-config");
        channel.postMessage({ type: "config-update", config });
        channel.close();
      }
    }
  }, [config, loaded]);

  const update = <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tekken-overlay-config.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<OverlayConfig>;
        setConfig({ ...defaultOverlayConfig, ...parsed });
      } catch (error) {
        console.error("Failed to import config", error);
        alert("Failed to import config. Please use a valid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="overlay-shell">
      <div className="page-grid">
        <div className="header-row">
          <div>
            <h1 className="page-title">Overlay Config</h1>
            <p className="page-subtitle">Save your settings to local storage, download a JSON file, or import one.</p>
          </div>
          <div className="button-row">
            <a className="button secondary" href="/overlay" target="_blank" rel="noreferrer">
              Open Overlay
            </a>
            <button className="button" onClick={downloadConfig}>
              Download JSON
            </button>
            <button
              className="button secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={importConfig}
            />
          </div>
        </div>

        <div className="split-columns">
          <section className="panel panel-padding">
            <div className="controls-grid">
              <div className="setting-group">
                <label>Left player</label>
                <div className="player-config-row">
                  <div className="flag-name-row">
                    <select
                      className="flag-select"
                      value={config.leftFlagCode}
                      onChange={(event) => update("leftFlagCode", event.target.value)}
                    >
                      {FLAG_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Team / Sponsor"
                      value={config.leftSponsor}
                      onChange={(event) => update("leftSponsor", event.target.value)}
                    />
                    <input
                      className="name-input"
                      placeholder="Player name"
                      value={config.leftName}
                      onChange={(event) => update("leftName", event.target.value)}
                    />
                  </div>
                  <input
                    className="score-input"
                    type="number"
                    min={0}
                    value={config.leftScore}
                    onChange={(event) => update("leftScore", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>Right player</label>
                <div className="player-config-row">
                  <div className="flag-name-row">
                    <select
                      className="flag-select"
                      value={config.rightFlagCode}
                      onChange={(event) => update("rightFlagCode", event.target.value)}
                    >
                      {FLAG_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Team / Sponsor"
                      value={config.rightSponsor}
                      onChange={(event) => update("rightSponsor", event.target.value)}
                    />
                    <input
                      className="name-input"
                      placeholder="Player name"
                      value={config.rightName}
                      onChange={(event) => update("rightName", event.target.value)}
                    />
                  </div>
                  <input
                    className="score-input"
                    type="number"
                    min={0}
                    value={config.rightScore}
                    onChange={(event) => update("rightScore", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>Theme accents</label>
                <div className="color-row">
                  <label>
                    Accent 1
                    <input
                      type="color"
                      value={config.themeAccent}
                      onChange={(event) => update("themeAccent", event.target.value)}
                    />
                  </label>
                  <label>
                    Accent 2
                    <input
                      type="color"
                      value={config.themeAccent2}
                      onChange={(event) => update("themeAccent2", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="panel panel-padding">
            <div className="overlay-preview config-preview">
              <div className="overlay-scene">
                <div className="top-overlay">
                  <div className="player-block left">
                    <div className="player-pill">
                      <div className="player-info">
                        <img
                          className="flag-badge"
                          src={`https://flagcdn.com/w40/${config.leftFlagCode}.png`}
                          alt={config.leftFlagCode}
                        />
                        <div className="player-nickname">
                          {config.leftSponsor ? <strong>{config.leftSponsor}</strong> : null}
                          {config.leftSponsor ? " | " : ""}
                          <span>{config.leftName}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="round-counter"
                      suppressHydrationWarning
                      style={{
                        "--accent-from": config.themeAccent,
                        "--accent-to": config.themeAccent2,
                      } as React.CSSProperties}
                    >
                      <span>{config.leftScore}</span>
                    </div>
                  </div>

                  <div className="center-block" />

                  <div className="player-block right">
                    <div
                      className="round-counter"
                      suppressHydrationWarning
                      style={{
                        "--accent-from": config.themeAccent,
                        "--accent-to": config.themeAccent2,
                      } as React.CSSProperties}
                    >
                      <span>{config.rightScore}</span>
                    </div>
                    <div className="player-pill right-align">
                      <div className="player-info right-align">
                        <img
                          className="flag-badge"
                          src={`https://flagcdn.com/w40/${config.rightFlagCode}.png`}
                          alt={config.rightFlagCode}
                        />
                        <div className="player-nickname">
                          {config.rightSponsor ? <strong>{config.rightSponsor}</strong> : null}
                          {config.rightSponsor ? " | " : ""}
                          <span>{config.rightName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="preview-mask" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
