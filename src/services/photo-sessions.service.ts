import type { PhotoSession } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { photoSessionsSeed } from "@/services/mock/data/photo-sessions"
import { photoSessionsSupabaseService } from "@/services/supabase/photo-sessions"
import { photoGroupsService } from "@/services/photo-groups.service"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface PhotoSessionsService {
  listSessions(): Promise<PhotoSession[]>
  createSession(input: Omit<PhotoSession, "id">): Promise<PhotoSession>
  updateSession(id: string, patch: Partial<PhotoSession>): Promise<PhotoSession>
  removeSession(id: string): Promise<void>
}

const photoSessionsTable = createMockTable<PhotoSession>(mockKey("photo-sessions"), photoSessionsSeed)

const photoSessionsMockService: PhotoSessionsService = {
  async listSessions() {
    return photoSessionsTable.getAll()
  },
  async createSession(input) {
    return photoSessionsTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async updateSession(id, patch) {
    return photoSessionsTable.update(id, patch)
  },
  async removeSession(id) {
    await photoSessionsTable.remove(id)
  },
}

const rawPhotoSessionsService: PhotoSessionsService = USE_SUPABASE
  ? photoSessionsSupabaseService
  : photoSessionsMockService

/** `removeSession` cascade explicitement sur les groupes de la séance (et leurs invités attendus, via removeGroup) — on ne compte pas sur le `on delete cascade` de la base, qui n'existe pas côté mock. */
export const photoSessionsService: PhotoSessionsService = {
  ...rawPhotoSessionsService,
  async removeSession(id) {
    const groups = await photoGroupsService.listGroups()
    await Promise.all(groups.filter((g) => g.sessionId === id).map((g) => photoGroupsService.removeGroup(g.id)))
    await rawPhotoSessionsService.removeSession(id)
  },
}
