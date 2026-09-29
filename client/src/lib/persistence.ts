const STORAGE_PREFIX = "kasbokar:demo:";

export const STORAGE_KEYS = {
  profile: `${STORAGE_PREFIX}user-profile`,
  draft: `${STORAGE_PREFIX}project-draft`,
  answers: `${STORAGE_PREFIX}validation-answers`,
  activeQuestion: `${STORAGE_PREFIX}active-question`,
  location: `${STORAGE_PREFIX}location-insights`,
  finance: `${STORAGE_PREFIX}finance-inputs`,
  recentProjects: `${STORAGE_PREFIX}recent-projects`,
} as const;

let storageScope = "";

export function setStorageScope(email: string | null | undefined): void {
  storageScope = email?.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_") || "";
}

function scopedKey(key: string): string {
  return storageScope ? `${key}:account:${storageScope}` : key;
}

export type UserProfile = {
  name: string;
  role: string;
};

export type RecentProject = {
  id: string;
  name: string;
  description: string;
  presenceType?: "حضوری" | "آنلاین" | "ترکیبی" | "";
  businessType: string;
  updatedAt: string;
};

export type StoredProjectDraft = {
  name: string;
  description: string;
  stage: string;
  businessType: string;
  market: string;
  customerType: string;
  presenceType?: "حضوری" | "آنلاین" | "ترکیبی" | "";
  goal: string;
};

export type StoredMapPosition = { lat: number; lng: number };

export type StoredCompetitor = {
  name: string;
  kind: "مستقیم" | "غیرمستقیم";
  address: string;
  distance: string;
  color: "red" | "violet";
  position?: StoredMapPosition;
};

export type StoredLocationInsights = {
  center: StoredMapPosition;
  businessPosition?: StoredMapPosition;
  source: string;
  footfall: { peoplePerDay: string; carsPerDay: string; confidence: string };
  competitors: StoredCompetitor[];
  virtualCompetitors?: VirtualCompetitor[];
  samplingPlan?: SamplingEntry[];
  googleMapsReference?: { peoplePerDay: string; carsPerDay: string };
};

export type SamplingEntry = {
  id: string;
  day: "روز کاری اول" | "روز کاری دوم" | "روز تعطیل";
  time: "صبح" | "ظهر" | "عصر";
  people: string;
  cars: string;
};

export type VirtualCompetitor = {
  name: string;
  channel: string;
  url: string;
  followers: string;
  monthlyReach: string;
  engagementRate: string;
  leads: string;
  conversions: string;
  monthlyAdCost: string;
};

export type FinanceInputs = {
  monthlyUnits: string;
  pricePerUnit: string;
  variableCostPerUnit: string;
  monthlyFixedCosts: string;
  initialInvestment: string;
};

export type DemoBackup = {
  formatVersion: 1;
  exportedAt: string;
  project: StoredProjectDraft;
  profile?: UserProfile;
  answers: Record<string, string>;
  activeQuestion: number;
  location?: StoredLocationInsights | null;
  finance?: FinanceInputs;
};

export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(scopedKey(key));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing or when quota is exceeded.
  }
}

export function clearStoredData(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      window.localStorage.removeItem(scopedKey(key));
    } catch {
      // Ignore storage access errors so the demo remains usable.
    }
  });
}

export function clearCurrentProjectData(): void {
  if (typeof window === "undefined") return;
  [STORAGE_KEYS.draft, STORAGE_KEYS.answers, STORAGE_KEYS.activeQuestion, STORAGE_KEYS.location, STORAGE_KEYS.finance, STORAGE_KEYS.recentProjects].forEach((key) => {
    try { window.localStorage.removeItem(scopedKey(key)); } catch { /* ignore storage errors */ }
  });
}

export function parseBackup(value: unknown): DemoBackup | null {
  if (!isRecord(value) || value.formatVersion !== 1) return null;
  if (typeof value.exportedAt !== "string" || !isProjectDraft(value.project)) return null;
  if (!isStringRecord(value.answers)) return null;
  if (!Number.isInteger(value.activeQuestion) || value.activeQuestion < 0) return null;

  return {
    formatVersion: 1,
    exportedAt: value.exportedAt,
    project: value.project,
    answers: value.answers,
    activeQuestion: value.activeQuestion,
    location: isRecord(value.location) ? (value.location as StoredLocationInsights) : null,
    finance: isRecord(value.finance) ? (value.finance as FinanceInputs) : undefined,
  };
}

export async function readBackupFile(file: File): Promise<DemoBackup> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("حجم فایل پشتیبان نباید بیشتر از ۲ مگابایت باشد.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error("فایل انتخاب‌شده JSON معتبر نیست.");
  }

  const backup = parseBackup(parsed);
  if (!backup) {
    throw new Error("ساختار فایل پشتیبان با نسخه Demo سازگار نیست.");
  }

  return backup;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isProjectDraft(value: unknown): value is StoredProjectDraft {
  if (!isRecord(value)) return false;
  return ["name", "description", "stage", "businessType", "market", "customerType", "goal"]
    .every((key) => typeof value[key] === "string") && (value.presenceType === undefined || typeof value.presenceType === "string");
}
