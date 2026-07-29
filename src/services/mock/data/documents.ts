import type { DocumentItem } from "@/types/domain"

export const documentsSeed: DocumentItem[] = [
  {
    id: "doc-planning",
    title: "Planning général",
    category: "Planning",
    fileName: "Planning général.pdf",
    filePath: "documents/planning.pdf",
    visibleToRoles: ["admin", "referent"],
  },
  {
    id: "doc-inventaire-boissons",
    title: "Inventaire boissons",
    category: "Boissons",
    fileName: "Inventaire boissons.pdf",
    filePath: "documents/inventaire-boissons.pdf",
    visibleToRoles: ["admin", "referent"],
  },
  {
    id: "doc-playlist-dj",
    title: "Playlist DJ",
    category: "DJ",
    fileName: "Playlist DJ.pdf",
    filePath: "documents/playlist-dj.pdf",
    visibleToRoles: ["admin", "referent"],
  },
]
