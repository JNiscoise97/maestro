import { PageHeader } from "@/components/shared/PageHeader"
import { TourTablesPage } from "@/pages/invites/TourTablesPage"

export function TourTablesIndexPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tour des tables"
        description="Vérifiez que chaque invité est bien assis et a pris le marque-place correspondant à son choix de plat."
      />
      <TourTablesPage />
    </div>
  )
}
