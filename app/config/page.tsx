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

function FlagDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selected =
    FLAG_OPTIONS.find((option) => option.code === value) ??
    FLAG_OPTIONS[0];

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="flag-dropdown"
    >
      <button
        type="button"
        className="flag-button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <span className="flag-arrow">▾</span>
      </button>

      {open && (
        <div className="flag-menu">
          {FLAG_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              className="flag-option"
              onClick={() => {
                onChange(option.code);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

          <div className="controls-grid">
            <div className="setting-group">
              <label>Left player</label>
              <div className="player-config-row">
                <div className="player-top-row">
       <FlagDropdown
  value={config.leftFlagCode}
  onChange={(value) => update("leftFlagCode", value)}
/>
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
                <div className="player-top-row">
   <FlagDropdown
  value={config.leftFlagCode}
  onChange={(value) => update("leftFlagCode", value)}
/>
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
        
      </div>
    </div>
  );
}
