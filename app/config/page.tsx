"use client";

import { useEffect, useRef, useState } from "react";
import {
  broadcastOverlayConfig,
  defaultOverlayConfig,
  fetchRemoteOverlayConfig,
  loadOverlayConfig,
  pushRemoteOverlayConfig,
  saveOverlayConfig,
  OverlayConfig,
  TOKEN_STORAGE_KEY,
} from "../../lib/overlayConfig";
import {
  KnownPlayer,
  loadKnownPlayers,
  rememberKnownPlayer,
  suggestPlayers,
} from "../../lib/knownPlayers";
import { loadKnownTeams, rememberKnownTeam, suggestTeams } from "../../lib/knownTeams";
import { FLAG_OPTIONS } from "../../lib/flags";

const PUSH_DEBOUNCE_MS = 400;

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

function PlayerSuggestInput({
  id,
  value,
  placeholder,
  className,
  players,
  onChange,
  onPick,
  onCommit,
}: Readonly<{
  id: string;
  value: string;
  placeholder: string;
  className?: string;
  players: KnownPlayer[];
  onChange: (value: string) => void;
  onPick: (player: KnownPlayer) => void;
  onCommit: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const suggestions = open ? (value.trim() ? suggestPlayers(value, players) : players.slice(0, 6)) : [];

  useEffect(() => {
    setHighlighted(0);
  }, [value, open]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const pick = (player: KnownPlayer) => {
    onPick(player);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (suggestions.length === 0) return;
      setHighlighted((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open || suggestions.length === 0) return;
      setHighlighted((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter") {
      if (open && suggestions[highlighted]) {
        event.preventDefault();
        pick(suggestions[highlighted]);
        return;
      }
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="player-suggest">
      <input
        id={id}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onCommit();
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="player-suggest-menu">
          {suggestions.map((player, index) => (
            <button
              key={`${player.name}-${player.sponsor}`}
              type="button"
              className={
                "player-suggest-option" + (index === highlighted ? " is-highlighted" : "")
              }
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(player)}
            >
              <span className="player-suggest-name">
                {player.sponsor ? <strong>{player.sponsor}</strong> : null}
                {player.sponsor ? <span className="nickname-separator">|</span> : null}
                <span>{player.name}</span>
              </span>
              <span className="player-suggest-flag">{player.flagCode.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamSuggestInput({
  id,
  value,
  placeholder,
  teams,
  onChange,
  onCommit,
}: Readonly<{
  id: string;
  value: string;
  placeholder: string;
  teams: string[];
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const suggestions = open ? (value.trim() ? suggestTeams(value, teams) : teams.slice(0, 6)) : [];

  useEffect(() => {
    setHighlighted(0);
  }, [value, open]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const pick = (team: string) => {
    onChange(team);
    onCommit(team);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (suggestions.length === 0) return;
      setHighlighted((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open || suggestions.length === 0) return;
      setHighlighted((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter") {
      if (open && suggestions[highlighted]) {
        event.preventDefault();
        pick(suggestions[highlighted]);
        return;
      }
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="player-suggest">
      <input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onCommit(value);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="player-suggest-menu">
          {suggestions.map((team, index) => (
            <button
              key={team}
              type="button"
              className={
                "player-suggest-option" + (index === highlighted ? " is-highlighted" : "")
              }
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(team)}
            >
              <span className="player-suggest-name">{team}</span>
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
  const [token, setToken] = useState("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [knownPlayers, setKnownPlayers] = useState<KnownPlayer[]>([]);
  const [knownTeams, setKnownTeams] = useState<string[]>([]);

  const pushTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) setToken(storedToken);

    setKnownPlayers(loadKnownPlayers());
    setKnownTeams(loadKnownTeams());

    (async () => {
      const remote = await fetchRemoteOverlayConfig();
      if (remote) {
        setConfig(remote.config);
      } else {
        const stored = loadOverlayConfig();
        if (stored) setConfig(stored);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    saveOverlayConfig(config);
    broadcastOverlayConfig(config);

    if (!token) {
      setSyncStatus("idle");
      return;
    }

    if (pushTimeoutRef.current) window.clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = window.setTimeout(async () => {
      const ok = await pushRemoteOverlayConfig(config, token);
      if (ok) {
        setSyncStatus("synced");
        setLastSyncedAt(Date.now());
      } else {
        setSyncStatus("error");
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimeoutRef.current) window.clearTimeout(pushTimeoutRef.current);
    };
  }, [config, loaded, token]);

  useEffect(() => {
    setAccent1Draft(config.themeAccent);
    setAccent2Draft(config.themeAccent2);
  }, [config.themeAccent, config.themeAccent2]);

  const updateToken = (value: string) => {
    setToken(value);
    if (value) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const update = <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const applyKnownPlayer = (side: "left" | "right", player: KnownPlayer) => {
    const flagCode = FLAG_OPTIONS.some((option) => option.code === player.flagCode)
      ? player.flagCode
      : "pl";

    setConfig((current) =>
      side === "left"
        ? {
            ...current,
            leftFlagCode: flagCode,
            leftSponsor: player.sponsor,
            leftName: player.name,
          }
        : {
            ...current,
            rightFlagCode: flagCode,
            rightSponsor: player.sponsor,
            rightName: player.name,
          },
    );

    rememberKnownPlayer({ ...player, flagCode });
    setKnownPlayers(loadKnownPlayers());
  };

  const rememberFromField = (side: "left" | "right") => {
    const name = side === "left" ? config.leftName : config.rightName;
    if (!name.trim()) return;

    const sponsor = side === "left" ? config.leftSponsor : config.rightSponsor;
    const flagCode = side === "left" ? config.leftFlagCode : config.rightFlagCode;

    rememberKnownPlayer({ name, sponsor, flagCode });
    setKnownPlayers(loadKnownPlayers());
  };

  const rememberTeam = (team: string) => {
    if (!team.trim()) return;
    rememberKnownTeam(team);
    setKnownTeams(loadKnownTeams());
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
          <div className="setting-group sync-panel">
            <button
              type="button"
              className="sync-panel-toggle"
              onClick={() => setSyncPanelOpen((current) => !current)}
              aria-expanded={syncPanelOpen}
            >
              <span>Remote sync</span>
              <span className={"sync-status sync-status--" + syncStatus}>
                {!token
                  ? "Not synced — no token set"
                  : syncStatus === "error"
                    ? "Not synced — check token/connection"
                    : syncStatus === "synced" && lastSyncedAt
                      ? `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}`
                      : "Waiting to sync…"}
              </span>
              <span className="sync-panel-arrow">{syncPanelOpen ? "▾" : "▸"}</span>
            </button>
            {syncPanelOpen && (
              <div className="sync-panel-body">
                <label htmlFor="sync-token-input">Remote sync token</label>
                <input
                  id="sync-token-input"
                  type="password"
                  placeholder="Paste CONFIG_API_TOKEN"
                  value={token}
                  onChange={(event) => updateToken(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          <div className="setting-group quick-actions">
            <div className="quick-actions-row">
              <button type="button" className="quick-action-button" onClick={swapSides}>
                ⇄ Swap sides
              </button>
              <button type="button" className="quick-action-button" onClick={resetPlayers}>
                Reset players
              </button>
              <button
                type="button"
                className="quick-action-button"
                onClick={() => update("overlayVisible", !config.overlayVisible)}
              >
                {config.overlayVisible ? "Hide overlay" : "Show overlay"}
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
                  <TeamSuggestInput
                    id="left-sponsor-input"
                    placeholder="Team / Sponsor"
                    value={config.leftSponsor}
                    teams={knownTeams}
                    onChange={(value) => update("leftSponsor", value)}
                    onCommit={rememberTeam}
                  />
                </div>
                <PlayerSuggestInput
                  id="left-name-input"
                  className="name-input"
                  placeholder="Player name"
                  value={config.leftName}
                  players={knownPlayers}
                  onChange={(value) => update("leftName", value)}
                  onPick={(player) => applyKnownPlayer("left", player)}
                  onCommit={() => rememberFromField("left")}
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
                  <TeamSuggestInput
                    id="right-sponsor-input"
                    placeholder="Team / Sponsor"
                    value={config.rightSponsor}
                    teams={knownTeams}
                    onChange={(value) => update("rightSponsor", value)}
                    onCommit={rememberTeam}
                  />
                </div>
                <PlayerSuggestInput
                  id="right-name-input"
                  className="name-input"
                  placeholder="Player name"
                  value={config.rightName}
                  players={knownPlayers}
                  onChange={(value) => update("rightName", value)}
                  onPick={(player) => applyKnownPlayer("right", player)}
                  onCommit={() => rememberFromField("right")}
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

        </div>
      </div>
    </div>
  );
}
