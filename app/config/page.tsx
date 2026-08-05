"use client";

import { useEffect, useRef, useState } from "react";
import {
  broadcastOverlayConfig,
  defaultOverlayConfig,
  loadOverlayConfig,
  saveOverlayConfig,
  OverlayConfig,
} from "../../lib/overlayConfig";

const FLAG_OPTIONS = [
  { code: "pl", label: "Poland" },
  { code: "us", label: "United States" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "cn", label: "China" },
  { code: "gb", label: "United Kingdom" },
  { code: "br", label: "Brazil" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "mx", label: "Mexico" },
  { code: "nl", label: "Netherlands" },
  { code: "se", label: "Sweden" },
  { code: "no", label: "Norway" },
  { code: "fi", label: "Finland" },
  { code: "ru", label: "Russia" },
  { code: "it", label: "Italy" },
  { code: "ph", label: "Philippines" },
];

const getFlagUrl = (code: string) => `https://flagcdn.com/w40/${code}.png`;

const ACCENT_SWATCHES = [
  "#d476ff",
  "#56a2ff",
  "#ff6b6b",
  "#ffc857",
  "#7ef29a",
  "#9b8cff",
  "#ff7ad9",
  "#74e0d6",
];

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

function normalizeHexColor(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_REGEX.test(prefixed)) return null;
  return prefixed.toUpperCase();
}

function FlagDropdown({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selected = FLAG_OPTIONS.find((option) => option.code === value) ?? FLAG_OPTIONS[0];

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={"flag-dropdown" + (open ? " is-open" : "")}>
      <button type="button" className="flag-button" onClick={() => setOpen((current) => !current)}>
        <span className="flag-selected-label">
          <img
            className="flag-icon"
            src={getFlagUrl(selected.code)}
            alt={selected.label}
            loading="lazy"
          />
          <span>{selected.code.toUpperCase()}</span>
        </span>
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
              <img
                className="flag-icon"
                src={getFlagUrl(option.code)}
                alt={option.label}
                loading="lazy"
              />
              <span>{option.code.toUpperCase()}</span>
              <span className="flag-option-label">{option.label}</span>
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
  const [accent1Draft, setAccent1Draft] = useState(defaultOverlayConfig.themeAccent);
  const [accent2Draft, setAccent2Draft] = useState(defaultOverlayConfig.themeAccent2);

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
      broadcastOverlayConfig(config);
    }
  }, [config, loaded]);

  useEffect(() => {
    setAccent1Draft(config.themeAccent);
    setAccent2Draft(config.themeAccent2);
  }, [config.themeAccent, config.themeAccent2]);

  const update = <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const swapSides = () => {
    setConfig((current) => ({
      ...current,
      leftFlagCode: current.rightFlagCode,
      leftSponsor: current.rightSponsor,
      leftName: current.rightName,
      leftScore: current.rightScore,
      rightFlagCode: current.leftFlagCode,
      rightSponsor: current.leftSponsor,
      rightName: current.leftName,
      rightScore: current.leftScore,
    }));
  };

  const resetPlayers = () => {
    setConfig((current) => ({
      ...current,
      leftFlagCode: "pl",
      leftSponsor: "",
      leftName: "",
      leftScore: 0,
      rightFlagCode: "pl",
      rightSponsor: "",
      rightName: "",
      rightScore: 0,
    }));
  };

  const adjustScore = (key: "leftScore" | "rightScore", delta: number) => {
    update(key, Math.max(0, config[key] + delta));
  };

  const applyAccent = (key: "themeAccent" | "themeAccent2", value: string) => {
    const normalized = normalizeHexColor(value);
    if (!normalized) return;
    update(key, normalized);
  };

  const blurOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const commitAccentInput = (key: "themeAccent" | "themeAccent2") => {
    if (key === "themeAccent") {
      const normalized = normalizeHexColor(accent1Draft);
      if (!normalized) {
        setAccent1Draft(config.themeAccent);
        return;
      }
      setAccent1Draft(normalized);
      update("themeAccent", normalized);
      return;
    }

    const normalized = normalizeHexColor(accent2Draft);
    if (!normalized) {
      setAccent2Draft(config.themeAccent2);
      return;
    }
    setAccent2Draft(normalized);
    update("themeAccent2", normalized);
  };

  return (
    <div className="overlay-shell config-shell">
      <div className="page-grid">
        <div className="controls-grid">
          <div className="setting-group quick-actions">
            <div className="quick-actions-row">
              <button type="button" className="quick-action-button" onClick={swapSides}>
                ⇄ Swap sides
              </button>
              <button type="button" className="quick-action-button" onClick={resetPlayers}>
                Reset players
              </button>
            </div>
          </div>

          <div className="setting-group">
            <div className="players-columns">
              <div className="player-column">
                <label htmlFor="left-sponsor-input">Left player</label>
                <div className="player-row player-row-primary">
                  <FlagDropdown
                    value={config.leftFlagCode}
                    onChange={(value) => update("leftFlagCode", value)}
                  />
                  <input
                    id="left-sponsor-input"
                    placeholder="Team / Sponsor"
                    value={config.leftSponsor}
                    onChange={(event) => update("leftSponsor", event.target.value)}
                  />
                </div>
                <input
                  className="name-input"
                  placeholder="Player name"
                  value={config.leftName}
                  onChange={(event) => update("leftName", event.target.value)}
                />
                <div className="score-block-stack">
                  <button
                    type="button"
                    className="score-block-button score-block-button--positive"
                    onClick={() => adjustScore("leftScore", 1)}
                    aria-label="Increase left score"
                  >
                    +1
                  </button>
                  <div className="score-block-display">{config.leftScore}</div>
                  <button
                    type="button"
                    className="score-block-button score-block-button--negative"
                    onClick={() => adjustScore("leftScore", -1)}
                    aria-label="Decrease left score"
                  >
                    -1
                  </button>
                </div>
              </div>

              <div className="player-column">
                <label htmlFor="right-sponsor-input">Right player</label>
                <div className="player-row player-row-primary">
                  <FlagDropdown
                    value={config.rightFlagCode}
                    onChange={(value) => update("rightFlagCode", value)}
                  />
                  <input
                    id="right-sponsor-input"
                    placeholder="Team / Sponsor"
                    value={config.rightSponsor}
                    onChange={(event) => update("rightSponsor", event.target.value)}
                  />
                </div>
                <input
                  className="name-input"
                  placeholder="Player name"
                  value={config.rightName}
                  onChange={(event) => update("rightName", event.target.value)}
                />
                <div className="score-block-stack">
                  <button
                    type="button"
                    className="score-block-button score-block-button--positive"
                    onClick={() => adjustScore("rightScore", 1)}
                    aria-label="Increase right score"
                  >
                    +1
                  </button>
                  <div className="score-block-display">{config.rightScore}</div>
                  <button
                    type="button"
                    className="score-block-button score-block-button--negative"
                    onClick={() => adjustScore("rightScore", -1)}
                    aria-label="Decrease right score"
                  >
                    -1
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="accent-1-input">Theme accents</label>
            <div className="color-row">
              <div className="color-field">
                <label htmlFor="accent-1-input">Accent 1</label>
                <div className="color-input-row">
                  <span
                    className="color-preview"
                    style={{ background: config.themeAccent }}
                    aria-hidden="true"
                    suppressHydrationWarning
                  />
                  <input
                    id="accent-1-input"
                    className="color-hex-input"
                    type="text"
                    value={accent1Draft}
                    onChange={(event) => setAccent1Draft(event.target.value)}
                    onBlur={() => commitAccentInput("themeAccent")}
                    onKeyDown={blurOnEnter}
                    placeholder="#D476FF"
                    inputMode="text"
                    spellCheck={false}
                  />
                </div>
                <div className="swatch-row">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={`accent1-${color}`}
                      type="button"
                      className="swatch-button"
                      style={{ background: color }}
                      onClick={() => {
                        setAccent1Draft(color);
                        applyAccent("themeAccent", color);
                      }}
                      aria-label={`Set accent 1 to ${color}`}
                      suppressHydrationWarning
                    />
                  ))}
                </div>
              </div>

              <div className="color-field">
                <label htmlFor="accent-2-input">Accent 2</label>
                <div className="color-input-row">
                  <span
                    className="color-preview"
                    style={{ background: config.themeAccent2 }}
                    aria-hidden="true"
                    suppressHydrationWarning
                  />
                  <input
                    id="accent-2-input"
                    className="color-hex-input"
                    type="text"
                    value={accent2Draft}
                    onChange={(event) => setAccent2Draft(event.target.value)}
                    onBlur={() => commitAccentInput("themeAccent2")}
                    onKeyDown={blurOnEnter}
                    placeholder="#56A2FF"
                    inputMode="text"
                    spellCheck={false}
                  />
                </div>
                <div className="swatch-row">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={`accent2-${color}`}
                      type="button"
                      className="swatch-button"
                      style={{ background: color }}
                      onClick={() => {
                        setAccent2Draft(color);
                        applyAccent("themeAccent2", color);
                      }}
                      aria-label={`Set accent 2 to ${color}`}
                      suppressHydrationWarning
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="overlay-visibility-button">Overlay visibility</label>
            <button
              id="overlay-visibility-button"
              type="button"
              className="visibility-button"
              onClick={() => update("overlayVisible", !config.overlayVisible)}
            >
              {config.overlayVisible ? "Hide overlay" : "Show overlay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
