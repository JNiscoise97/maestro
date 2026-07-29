import type { Person } from "@/types/domain"

export const peopleSeed: Person[] = [
  {
    id: "p-sarah",
    fullName: "Sarah",
    role: "admin",
    accessCode: "SARAH2026",
    isActive: true,
    phone: "+33600000001",
  },
  {
    id: "p-jordan",
    fullName: "Jordan",
    role: "admin",
    accessCode: "JORDAN2026",
    isActive: true,
    phone: "+33600000002",
  },
]
