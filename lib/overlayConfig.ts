export type OverlayConfig = {
  leftFlagCode: string;
  leftSponsor: string;
  leftName: string;
  leftScore: number;
  rightFlagCode: string;
  rightSponsor: string;
  rightName: string;
  rightScore: number;
  themeAccent: string;
  themeAccent2: string;
  overlayVisible: boolean;
};

export const STORAGE_KEY = "tekken-overlay-config";
export const OVERLAY_CHANNEL = "overlay-config";

export const defaultOverlayConfig: OverlayConfig = {
  leftFlagCode: "pl",
  leftSponsor: "",
  leftName: "REDX",
  leftScore: 1,
  rightFlagCode: "pl",
  rightSponsor: "TKND",
  rightName: "NOKIUSZ",
  rightScore: 1,
  themeAccent: "#9B8CFF",
  themeAccent2: "#9B8CFF",
  overlayVisible: true,
};

const parseScore = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const normalizeOverlayConfig = (
  parsed: Partial<OverlayConfig> | null | undefined,
): OverlayConfig => {
  const source = parsed ?? {};
  return {
    ...defaultOverlayConfig,
    ...source,
    leftScore: parseScore(source.leftScore, defaultOverlayConfig.leftScore),
    rightScore: parseScore(source.rightScore, defaultOverlayConfig.rightScore),
    overlayVisible:
      typeof source.overlayVisible === "boolean"
        ? source.overlayVisible
        : defaultOverlayConfig.overlayVisible,
  };
};

export const loadOverlayConfig = (): OverlayConfig | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OverlayConfig>;
    return normalizeOverlayConfig(parsed);
  } catch (error) {
    console.warn("Failed to load overlay config", error);
    return null;
  }
};

export const saveOverlayConfig = (config: OverlayConfig) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const broadcastOverlayConfig = (config: OverlayConfig) => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return;
  }

  const channel = new BroadcastChannel(OVERLAY_CHANNEL);
  channel.postMessage({ type: "config-update", config });
  channel.close();
};

export const CONFIG_API_ROUTE = "/api/overlay-config";
export const TOKEN_STORAGE_KEY = "overlay-config-token";

export type RemoteOverlayConfig = { config: OverlayConfig; updatedAt: number };

export const fetchRemoteOverlayConfig =
  async (): Promise<RemoteOverlayConfig | null> => {
    try {
      const response = await fetch(CONFIG_API_ROUTE, { cache: "no-store" });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        config: unknown;
        updatedAt: number;
      };
      return {
        config: normalizeOverlayConfig(data.config as Partial<OverlayConfig>),
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      console.warn("Failed to fetch remote overlay config", error);
      return null;
    }
  };

export type PushOverlayConfigResult = { ok: boolean; updatedAt: number | null };

export const pushRemoteOverlayConfig = async (
  config: OverlayConfig,
  token: string,
): Promise<PushOverlayConfigResult> => {
  try {
    const response = await fetch(CONFIG_API_ROUTE, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) return { ok: false, updatedAt: null };
    const data = (await response.json()) as { updatedAt: number };
    return { ok: true, updatedAt: data.updatedAt };
  } catch (error) {
    console.warn("Failed to push remote overlay config", error);
    return { ok: false, updatedAt: null };
  }
};
