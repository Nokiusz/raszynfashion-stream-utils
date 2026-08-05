const KNOWN_TEAMS_STORAGE_KEY = "overlay-known-teams";
const MAX_KNOWN_TEAMS = 50;
const MAX_SUGGESTIONS = 6;

const SEED_TEAMS = [
  "GON",
  "TTV",
  "GMŃ",
  "DBL",
  "TKND",
  "YOMI",
  "FGE",
  "FGC",
  "SIA",
  "zupa",
] as const;

// The known-team tags, kept for reuse where a typed reference to the seed set is useful.
export type KnownTeam = (typeof SEED_TEAMS)[number];

const readLearnedTeams = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_TEAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch (error) {
    console.warn("Failed to load known teams", error);
    return [];
  }
};

const writeLearnedTeams = (teams: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KNOWN_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch (error) {
    console.warn("Failed to save known teams", error);
  }
};

export const loadKnownTeams = (): string[] => {
  const merged = new Map<string, string>();

  for (const team of SEED_TEAMS) {
    merged.set(team.toLowerCase(), team);
  }

  // Learned teams are most-recent-first, so applying them after the seed
  // list lets a differently-cased recent entry win the merge.
  for (const team of [...readLearnedTeams()].reverse()) {
    merged.set(team.toLowerCase(), team);
  }

  return Array.from(merged.values());
};

export const rememberKnownTeam = (team: string) => {
  if (!team.trim()) return;

  const key = team.toLowerCase();
  const learned = readLearnedTeams().filter(
    (entry) => entry.toLowerCase() !== key,
  );
  const updated = [team, ...learned].slice(0, MAX_KNOWN_TEAMS);

  writeLearnedTeams(updated);
};

export const suggestTeams = (query: string, teams: string[]): string[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return teams
    .map((team) => {
      const lower = team.toLowerCase();
      let rank: number | null = null;
      if (lower.startsWith(trimmed)) rank = 0;
      else if (lower.includes(trimmed)) rank = 1;
      return rank === null ? null : { team, rank };
    })
    .filter((entry): entry is { team: string; rank: number } => entry !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.team);
};
