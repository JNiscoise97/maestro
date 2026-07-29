import { EVENT_DATE, EVENT_NAME } from "@/lib/constants"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export type EventType = "fiancailles" | "mariage" | "pacs" | "anniversaire" | "autre"

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  fiancailles: "Fiançailles",
  mariage: "Mariage",
  pacs: "PACS",
  anniversaire: "Anniversaire",
  autre: "Autre",
}

export interface AppSettings {
  eventName: string
  eventDate: string        // date début Jour J (yyyy-MM-dd)
  eventType: EventType
  mainEnd?: string         // date fin Jour J (si > 1 jour)
  mainTime?: string        // heure début Jour J (HH:mm)
  mainEndTime?: string     // heure fin Jour J (HH:mm)
  setupStart?: string      // date début installation (override, sinon J-1 calculé)
  setupEnd?: string        // date fin installation (si > 1 jour)
  setupTime?: string       // heure début installation (HH:mm)
  setupEndTime?: string    // heure fin installation (HH:mm)
  cleanupStart?: string    // date début désinstallation (override, sinon J+1 calculé)
  cleanupEnd?: string      // date fin désinstallation (si > 1 jour)
  cleanupTime?: string     // heure début désinstallation (HH:mm)
  cleanupEndTime?: string  // heure fin désinstallation (HH:mm)
}

export interface SettingsService {
  get(): Promise<AppSettings>
  update(patch: Partial<AppSettings>): Promise<AppSettings>
}

export const SETTINGS_DEFAULTS: AppSettings = {
  eventName: EVENT_NAME,
  eventDate: EVENT_DATE,
  eventType: "fiancailles",
}

// ── Mock (localStorage) ───────────────────────────────────────────────────────

const STORAGE_KEY = mockKey("app-settings")

function readFromStorage(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) return { ...SETTINGS_DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  return { ...SETTINGS_DEFAULTS }
}

function writeToStorage(settings: AppSettings): AppSettings {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  return settings
}

const settingsMockService: SettingsService = {
  async get() { return readFromStorage() },
  async update(patch) { return writeToStorage({ ...readFromStorage(), ...patch }) },
}

// ── Export selon l'environnement ──────────────────────────────────────────────

// Import dynamique pour éviter d'instancier le client Supabase quand USE_SUPABASE est faux.
// Le dynamic import est résolu à la compilation (Vite tree-shake le mock quand Supabase est actif).
import { settingsSupabaseService } from "@/services/supabase/settings"

export const settingsService: SettingsService = USE_SUPABASE
  ? settingsSupabaseService
  : settingsMockService
