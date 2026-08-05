"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultOverlayConfig,
  loadOverlayConfig,
  normalizeOverlayConfig,
  OverlayConfig,
  OVERLAY_CHANNEL,
  STORAGE_KEY,
} from "../../lib/overlayConfig";

export default function OverlayPage() {
  const [config, setConfig] = useState<OverlayConfig>(defaultOverlayConfig);

  const configJsonRef = useRef<string>(JSON.stringify(defaultOverlayConfig));

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

    const interval = window.setInterval(() => {
      const updated = loadOverlayConfig();
      if (!updated) return;
      const updatedJson = JSON.stringify(updated);
      if (updatedJson !== configJsonRef.current) {
        setConfig(updated);
        configJsonRef.current = updatedJson;
      }
    }, 500);

    return () => {
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
