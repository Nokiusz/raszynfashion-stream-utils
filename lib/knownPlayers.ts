import { FlagCode } from "./flags";
import { KnownTeam } from "./knownTeams";

// Allows autocomplete for known values while still accepting any typed-in string.
type LiteralUnion<T extends string> = T | (string & {});

export type KnownPlayer = {
  name: string;
  sponsor: LiteralUnion<KnownTeam>;
  flagCode: LiteralUnion<FlagCode>;
};

export const KNOWN_PLAYERS_STORAGE_KEY = "overlay-known-players";
const MAX_KNOWN_PLAYERS = 50;
const MAX_SUGGESTIONS = 6;

const SEED_PLAYERS: KnownPlayer[] = [
  { name: "REDX", sponsor: "", flagCode: "pl" },
  { name: "NOKIUSZ", sponsor: "TKND", flagCode: "pl" },
  { name: "SkrybaTV", sponsor: "TTV", flagCode: "pl" },
  { name: "YORAREMUKE_TK", sponsor: "", flagCode: "pl" },
  { name: "ubi95", sponsor: "", flagCode: "pl" },
  { name: "brzegu", sponsor: "", flagCode: "pl" },
  { name: "szumi", sponsor: "", flagCode: "pl" },
  { name: "łoziak", sponsor: "", flagCode: "pl" },
  { name: "newix", sponsor: "", flagCode: "pl" },
  { name: "rafalnoco", sponsor: "", flagCode: "pl" },
  { name: "SEIBEIZEHN", sponsor: "GON", flagCode: "pl" },
  { name: "RASZYNFASHION", sponsor: "", flagCode: "pl" },
  { name: "Maryush", sponsor: "TKND", flagCode: "pl" },
  { name: "BaHoxooO", sponsor: "TTV", flagCode: "pl" },
  { name: "Vergil714", sponsor: "TKND", flagCode: "pl" },
  { name: "SopelLanez", sponsor: "", flagCode: "pl" },
  { name: "Setsicos", sponsor: "", flagCode: "pl" },
  { name: "Rywciu", sponsor: "", flagCode: "pl" },
  { name: "TROYARD", sponsor: "SIA", flagCode: "pl" },
  { name: "KACPER", sponsor: "SIA", flagCode: "pl" },
  { name: "SajmonKellis", sponsor: "SIA", flagCode: "pl" },
  { name: "Charlie", sponsor: "FGE", flagCode: "pl" },
  { name: "Turles_PL", sponsor: "FGE", flagCode: "pl" },
  { name: "C-Hush", sponsor: "", flagCode: "jp" },
  { name: "Puszek", sponsor: "", flagCode: "pl" },
  { name: "H3niu", sponsor: "DBL", flagCode: "pl" },
  { name: "skarpeta", sponsor: "zupa", flagCode: "pl" },
  { name: "YamiSzymi", sponsor: "", flagCode: "pl" },
  { name: "Koyot", sponsor: "TKND", flagCode: "pl" },
  { name: "Supra", sponsor: "GMŃ", flagCode: "pl" },
  { name: "Belrog", sponsor: "TKND", flagCode: "pl" },
  { name: "Abuser", sponsor: "", flagCode: "pl" },
  { name: "Alex", sponsor: "", flagCode: "pl" },
  { name: "Marvizer", sponsor: "", flagCode: "pl" },
  { name: "Scoia", sponsor: "GMŃ", flagCode: "pl" },
  { name: "menrir", sponsor: "", flagCode: "pl" },
  { name: "Allure", sponsor: "TTV", flagCode: "pl" },
];

type LearnedPlayer = KnownPlayer & { lastUsedAt: number };

const isLearnedPlayer = (value: unknown): value is LearnedPlayer => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    typeof entry.sponsor === "string" &&
    typeof entry.flagCode === "string" &&
    typeof entry.lastUsedAt === "number"
  );
};

const readLearnedPlayers = (): LearnedPlayer[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_PLAYERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLearnedPlayer);
  } catch (error) {
    console.warn("Failed to load known players", error);
    return [];
  }
};

const writeLearnedPlayers = (players: LearnedPlayer[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KNOWN_PLAYERS_STORAGE_KEY,
      JSON.stringify(players),
    );
  } catch (error) {
    console.warn("Failed to save known players", error);
  }
};

export const loadKnownPlayers = (): KnownPlayer[] => {
  const merged = new Map<string, KnownPlayer>();

  for (const seed of SEED_PLAYERS) {
    merged.set(seed.name.toLowerCase(), seed);
  }

  // Learned entries are read oldest-first here so the most recently used
  // record for a given name wins the merge.
  const learned = [...readLearnedPlayers()].sort(
    (a, b) => a.lastUsedAt - b.lastUsedAt,
  );
  for (const entry of learned) {
    merged.set(entry.name.toLowerCase(), {
      name: entry.name,
      sponsor: entry.sponsor,
      flagCode: entry.flagCode,
    });
  }

  return Array.from(merged.values());
};

export const rememberKnownPlayer = (player: KnownPlayer) => {
  if (!player.name.trim()) return;

  const key = player.name.toLowerCase();

  // Don't let a blank sponsor field silently erase a sponsor we already know about.
  const sponsor = player.sponsor.trim()
    ? player.sponsor
    : (loadKnownPlayers().find((known) => known.name.toLowerCase() === key)
        ?.sponsor ?? player.sponsor);

  const learned = readLearnedPlayers().filter(
    (entry) => entry.name.toLowerCase() !== key,
  );
  const updated = [{ ...player, sponsor, lastUsedAt: Date.now() }, ...learned]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_KNOWN_PLAYERS);

  writeLearnedPlayers(updated);
};

export const suggestPlayers = (
  query: string,
  players: KnownPlayer[],
): KnownPlayer[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return players
    .map((player) => {
      const name = player.name.toLowerCase();
      let rank: number | null = null;
      if (name.startsWith(trimmed)) rank = 0;
      else if (name.includes(trimmed)) rank = 1;
      return rank === null ? null : { player, rank };
    })
    .filter(
      (entry): entry is { player: KnownPlayer; rank: number } => entry !== null,
    )
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.player);
};
