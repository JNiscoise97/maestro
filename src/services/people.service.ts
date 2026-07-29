import type { Person } from "@/types/domain"
import { createMockTable } from "@/services/mock/db"
import { peopleSeed } from "@/services/mock/data/people"
import { peopleSupabaseService } from "@/services/supabase/people"
import { USE_SUPABASE } from "@/supabase/client"
import { mockKey } from "@/lib/event"

export interface PeopleService {
  resolveByAccessCode(code: string): Promise<Person | null>
  getById(id: string): Promise<Person | null>
  list(): Promise<Person[]>
  create(person: Person): Promise<Person>
  update(id: string, patch: Partial<Person>): Promise<Person>
  remove(id: string): Promise<void>
}

const peopleTable = createMockTable<Person>(mockKey("people"), peopleSeed)

const peopleMockService: PeopleService = {
  async resolveByAccessCode(code) {
    const people = await peopleTable.getAll()
    const normalized = code.trim().toUpperCase()
    return (
      people.find((person) => person.isActive && person.accessCode.toUpperCase() === normalized) ?? null
    )
  },
  async getById(id) {
    return peopleTable.getById(id)
  },
  async list() {
    return peopleTable.getAll()
  },
  async create(person) {
    return peopleTable.insert(person)
  },
  async update(id, patch) {
    return peopleTable.update(id, patch)
  },
  async remove(id) {
    return peopleTable.remove(id)
  },
}

export const peopleService: PeopleService = USE_SUPABASE ? peopleSupabaseService : peopleMockService
