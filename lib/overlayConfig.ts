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
};

export const STORAGE_KEY = "tekken-overlay-config";

export const defaultOverlayConfig: OverlayConfig = {
  leftFlagCode: "pl",
  leftSponsor: "Yomi",
  leftName: "NARUU",
  leftScore: 1,
  rightFlagCode: "pl",
  rightSponsor: "Yomi",
  rightName: "PEACE",
  rightScore: 1,
  themeAccent: "#d476ff",
  themeAccent2: "#56a2ff",
};

export const loadOverlayConfig = (): OverlayConfig | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OverlayConfig>;
    return {
      ...defaultOverlayConfig,
      ...parsed,
      leftScore:
        typeof parsed.leftScore === "number"
          ? parsed.leftScore
          : defaultOverlayConfig.leftScore,
      rightScore:
        typeof parsed.rightScore === "number"
          ? parsed.rightScore
          : defaultOverlayConfig.rightScore,
    };
  } catch (error) {
    console.warn("Failed to load overlay config", error);
    return null;
  }
};

export const saveOverlayConfig = (config: OverlayConfig) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearOverlayConfig = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
