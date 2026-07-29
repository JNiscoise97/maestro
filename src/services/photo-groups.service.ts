import type { PhotoGroup, PhotoGroupMember, PhotoSession } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { photoGroupsSeed, photoGroupMembersSeed } from "@/services/mock/data/photo-groups"
import { photoSessionsSeed } from "@/services/mock/data/photo-sessions"
import { photoGroupsSupabaseService } from "@/services/supabase/photo-groups"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface PhotoGroupsService {
  listGroups(): Promise<PhotoGroup[]>
  createGroup(input: Omit<PhotoGroup, "id">): Promise<PhotoGroup>
  updateGroup(id: string, patch: Partial<PhotoGroup>): Promise<PhotoGroup>
  removeGroup(id: string): Promise<void>
  resetGroups(): Promise<void>
  listAllMembers(): Promise<PhotoGroupMember[]>
  addMember(photoGroupId: string, guestId: string): Promise<PhotoGroupMember>
  removeMember(id: string): Promise<void>
  updateMember(id: string, patch: Partial<PhotoGroupMember>): Promise<PhotoGroupMember>
}

const photoGroupsTable = createMockTable<PhotoGroup>(mockKey("photo-groups"), photoGroupsSeed)
const photoGroupMembersTable = createMockTable<PhotoGroupMember>(mockKey("photo-group-members"), photoGroupMembersSeed)
const photoSessionsTable = createMockTable<PhotoSession>(mockKey("photo-sessions"), photoSessionsSeed)

/** Rattrapage local : les groupes créés en localStorage avant l'introduction des séances n'ont pas de sessionId — on les bascule dans une séance par défaut, créée à la volée si besoin. */
async function ensureGroupsHaveSession(groups: PhotoGroup[]): Promise<PhotoGroup[]> {
  const orphans = groups.filter((g) => !g.sessionId)
  if (orphans.length === 0) return groups
  const sessions = await photoSessionsTable.getAll()
  const defaultSession =
    sessions[0] ?? (await photoSessionsTable.insert({ id: crypto.randomUUID(), label: "Séance", sortOrder: 0 }))
  await Promise.all(orphans.map((g) => photoGroupsTable.update(g.id, { sessionId: defaultSession.id })))
  return photoGroupsTable.getAll()
}

const photoGroupsMockService: PhotoGroupsService = {
  async listGroups() {
    return ensureGroupsHaveSession(await photoGroupsTable.getAll())
  },
  async createGroup(input) {
    return photoGroupsTable.insert({ ...input, id: crypto.randomUUID() })
  },
  async updateGroup(id, patch) {
    return photoGroupsTable.update(id, patch)
  },
  async removeGroup(id) {
    const members = await photoGroupMembersTable.getAll()
    await Promise.all(members.filter((m) => m.photoGroupId === id).map((m) => photoGroupMembersTable.remove(m.id)))
    await photoGroupsTable.remove(id)
  },
  async resetGroups() {
    const groups = await photoGroupsTable.getAll()
    await Promise.all(groups.map((g) => photoGroupsTable.update(g.id, { status: "pending", notes: null })))
  },
  async listAllMembers() {
    return photoGroupMembersTable.getAll()
  },
  async addMember(photoGroupId, guestId) {
    return photoGroupMembersTable.insert({ id: crypto.randomUUID(), photoGroupId, guestId, isPresent: true })
  },
  async removeMember(id) {
    await photoGroupMembersTable.remove(id)
  },
  async updateMember(id, patch) {
    return photoGroupMembersTable.update(id, patch)
  },
}

export const photoGroupsService: PhotoGroupsService = USE_SUPABASE
  ? photoGroupsSupabaseService
  : photoGroupsMockService
