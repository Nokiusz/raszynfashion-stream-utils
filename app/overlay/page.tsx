"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultOverlayConfig,
  fetchRemoteOverlayConfig,
  loadOverlayConfig,
  normalizeOverlayConfig,
  saveOverlayConfig,
  OverlayConfig,
  OVERLAY_CHANNEL,
  STORAGE_KEY,
} from "../../lib/overlayConfig";

const REMOTE_POLL_INTERVAL_MS = 5000;

export default function OverlayPage() {
  const [config, setConfig] = useState<OverlayConfig>(defaultOverlayConfig);

  const configJsonRef = useRef<string>(JSON.stringify(defaultOverlayConfig));
  const lastRemoteUpdatedAtRef = useRef<number>(0);

  useEffect(() => {
    const stored = loadOverlayConfig();
    if (stored) {
      const json = JSON.stringify(stored);
      setConfig(stored);
      configJsonRef.current = json;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const updated = loadOverlayConfig();
        if (updated) {
          setConfig(updated);
          configJsonRef.current = JSON.stringify(updated);
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(OVERLAY_CHANNEL);
      channel.addEventListener("message", (event) => {
        if (event.data?.type === "config-update") {
          const merged = normalizeOverlayConfig(event.data.config as Partial<OverlayConfig>);
          setConfig(merged);
          configJsonRef.current = JSON.stringify(merged);
        }
      });
    }

    let cancelled = false;
    const pollRemote = async () => {
      const remote = await fetchRemoteOverlayConfig();
      if (cancelled || !remote) return;
      if (remote.updatedAt <= lastRemoteUpdatedAtRef.current) return;
      lastRemoteUpdatedAtRef.current = remote.updatedAt;
      setConfig(remote.config);
      configJsonRef.current = JSON.stringify(remote.config);
      saveOverlayConfig(remote.config);
    };

    pollRemote();
    const interval = window.setInterval(pollRemote, REMOTE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
      channel?.close();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const previousHtml = document.documentElement.style.background;
    const previousBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    return () => {
      document.documentElement.style.background = previousHtml;
      document.body.style.background = previousBody;
    };
  }, []);

  const accentGradient = useMemo(
    () => `linear-gradient(90deg, ${config.themeAccent}, ${config.themeAccent2})`,
    [config.themeAccent, config.themeAccent2],
  );

  const getFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode}.png`;

  const previewBackground =
    typeof window !== "undefined" && window.location.search.includes("preview");

  return (
    <div className={"overlay-only" + (previewBackground ? " preview-bg" : "")}>
      {config.overlayVisible ? (
        <div className="top-overlay">
          <div className="player-block left">
            <div className="player-pill">
              <div className="player-info">
                <img
                  className="flag-badge"
                  src={getFlagUrl(config.leftFlagCode)}
                  alt={config.leftFlagCode}
                />
                <div className="player-nickname">
                  {config.leftSponsor ? <strong>{config.leftSponsor}</strong> : null}
                  {config.leftSponsor ? <span className="nickname-separator">|</span> : null}
                  <span>{config.leftName}</span>
                </div>
              </div>
            </div>
            <div className="round-counter" style={{ background: accentGradient }}>
              <span>{config.leftScore}</span>
            </div>
          </div>

          <div className="center-block" />

          <div className="player-block right">
            <div className="round-counter" style={{ background: accentGradient }}>
              <span>{config.rightScore}</span>
            </div>
            <div className="player-pill right-align">
              <div className="player-info right-align">
                <img
                  className="flag-badge"
                  src={getFlagUrl(config.rightFlagCode)}
                  alt={config.rightFlagCode}
                />
                <div className="player-nickname">
                  {config.rightSponsor ? <strong>{config.rightSponsor}</strong> : null}
                  {config.rightSponsor ? <span className="nickname-separator">|</span> : null}
                  <span>{config.rightName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
