import type { DocumentItem } from "@/types/domain"
import type { DocumentsService } from "@/services/documents.service"
import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

interface DocumentWithAttachment {
  id: string
  title: string
  category: string | null
  visible_to_roles: DocumentItem["visibleToRoles"]
  attachment: { file_name: string; file_path: string } | null
}

function toDocument(row: DocumentWithAttachment): DocumentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    fileName: row.attachment?.file_name ?? "",
    filePath: row.attachment?.file_path ?? "",
    visibleToRoles: row.visible_to_roles,
  }
}

export const documentsSupabaseService: DocumentsService = {
  async list() {
    const { data, error } = await db
      .from(tbl("documents") as any)
      .select(`id, title, category, visible_to_roles, attachment:${tbl("attachments")}(file_name, file_path)`)
    if (error) throw error
    return ((data ?? []) as unknown as DocumentWithAttachment[]).map(toDocument)
  },
  async create(input) {
    const { data: attachment, error: attachmentError } = await db
      .from(tbl("attachments") as any)
      .insert({ file_name: input.fileName, file_path: input.filePath })
      .select("id")
      .single()
    if (attachmentError) throw attachmentError

    const { data, error } = await db
      .from(tbl("documents") as any)
      .insert({
        attachment_id: attachment.id,
        title: input.title,
        category: input.category ?? null,
        visible_to_roles: input.visibleToRoles,
      })
      .select(`id, title, category, visible_to_roles, attachment:${tbl("attachments")}(file_name, file_path)`)
      .single()
    if (error) throw error
    return toDocument(data as unknown as DocumentWithAttachment)
  },
}
