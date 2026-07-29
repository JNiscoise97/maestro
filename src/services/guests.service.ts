import type { Guest, GuestGroup } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { guestDefaults, guestGroupsSeed, guestsSeed } from "@/services/mock/data/guests"
import { guestsSupabaseService } from "@/services/supabase/guests"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface CreateGuestInput {
  firstName: string
  lastName: string
  groupId?: string | null
}

export interface CreateGuestGroupInput {
  familyName: string
  notes?: string | null
  sortOrder: number
}

export interface GuestsService {
  listGroups(): Promise<GuestGroup[]>
  createGroup(input: CreateGuestGroupInput): Promise<GuestGroup>
  updateGroup(id: string, patch: Partial<GuestGroup>): Promise<GuestGroup>
  /** Les invités de ce groupe ne sont pas supprimés, juste détachés (groupId -> null). */
  deleteGroup(id: string): Promise<void>
  listGuests(): Promise<Guest[]>
  createGuest(input: CreateGuestInput): Promise<Guest>
  updateGuest(id: string, patch: Partial<Guest>): Promise<Guest>
  deleteGuest(id: string): Promise<void>
  /** Pour l'identité composée (voir identity.service.ts) : tout invité actif avec un code valide peut se connecter. */
  resolveByAccessCode(code: string): Promise<Guest | null>
  getById(id: string): Promise<Guest | null>
  /** Repasse `introductionSeen` à false pour tous les invités — voir ParametresPage. */
  resetIntroductionSeenForAll(): Promise<void>
  /** Repasse `checkedInAt` à null pour tous les invités — voir ParametresPage. */
  resetCheckInsForAll(): Promise<void>
}

const guestGroupsTable = createMockTable<GuestGroup>(mockKey("guest-groups"), guestGroupsSeed)
const guestsTable = createMockTable<Guest>(mockKey("guests"), guestsSeed)

const guestsMockService: GuestsService = {
  async listGroups() {
    return guestGroupsTable.getAll()
  },
  async createGroup({ familyName, notes, sortOrder }) {
    return guestGroupsTable.insert({ id: crypto.randomUUID(), familyName, notes: notes ?? null, sortOrder })
  },
  async updateGroup(id, patch) {
    return guestGroupsTable.update(id, patch)
  },
  async deleteGroup(id) {
    const guests = await guestsTable.getAll()
    await Promise.all(
      guests.filter((g) => g.groupId === id).map((g) => guestsTable.update(g.id, { groupId: null }))
    )
    await guestGroupsTable.remove(id)
  },
  async listGuests() {
    return guestsTable.getAll()
  },
  async createGuest({ firstName, lastName, groupId }) {
    return guestsTable.insert({
      id: crypto.randomUUID(),
      groupId: groupId ?? null,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      rsvpStatus: "pending",
      isActive: true,
      ...guestDefaults,
    })
  },
  async updateGuest(id, patch) {
    return guestsTable.update(id, patch)
  },
  async deleteGuest(id) {
    return guestsTable.remove(id)
  },
  async resolveByAccessCode(code) {
    const guests = await guestsTable.getAll()
    const normalized = code.trim().toUpperCase()
    return (
      guests.find((g) => g.isActive && g.accessCode && g.accessCode.toUpperCase() === normalized) ?? null
    )
  },
  async getById(id) {
    return guestsTable.getById(id)
  },
  async resetIntroductionSeenForAll() {
    const guests = await guestsTable.getAll()
    await Promise.all(guests.map((g) => guestsTable.update(g.id, { introductionSeen: false })))
  },
  async resetCheckInsForAll() {
    const guests = await guestsTable.getAll()
    await Promise.all(guests.map((g) => guestsTable.update(g.id, { checkedInAt: null })))
  },
}

export const guestsService: GuestsService = USE_SUPABASE ? guestsSupabaseService : guestsMockService
