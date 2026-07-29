import { Routes, Route, Navigate } from "react-router-dom"

import { AppShell } from "@/layouts/AppShell"
import { ProtectedLayout } from "@/layouts/ProtectedLayout"
import { RoleGuard } from "@/layouts/RoleGuard"
import { LoginPage } from "@/pages/auth"
import { IntroductionPage } from "@/pages/introduction"
import { IndexPage } from "@/pages/home"
import { MissionsPage } from "@/pages/missions"
import { ReferentsPage } from "@/pages/referents"
import { PlanningPage } from "@/pages/planning"
import { DeroulePage } from "@/pages/deroule"
import { PhotosGroupePage } from "@/pages/photos-groupe"
import { AccueilPage } from "@/pages/accueil"
import { LogistiquePage } from "@/pages/logistique"
import { InvitesPage } from "@/pages/invites"
import { GuestDetailPage } from "@/pages/invites/guest-detail"
import { DocumentsPage } from "@/pages/documents"
import { ParametresPage } from "@/pages/parametres"
import { RevueContenuPage } from "@/pages/revue-contenu"
import { MaMissionPage } from "@/pages/ma-mission"
import { MesResponsabilitesPage } from "@/pages/mes-responsabilites"
import { TourTablesIndexPage } from "@/pages/tour-tables"
import { MessagesPage } from "@/pages/messages"
import { CadeauxPage } from "@/pages/cadeaux"
import { NotFoundPage } from "@/pages/not-found"
import { RsvpPage } from "@/pages/rsvp"
import { RsvpInvitationPage } from "@/pages/rsvp/invitation"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/rsvp" element={<RsvpPage />} />
      <Route path="/rsvp/invitation" element={<RsvpInvitationPage />} />
      <Route path="/connexion" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route element={<AppShell />}>
<Route
            path="introduction"
            element={
              <RoleGuard capability="view:introduction">
                <IntroductionPage />
              </RoleGuard>
            }
          />
          <Route index element={<IndexPage />} />
          <Route
            path="missions"
            element={
              <RoleGuard capability="view:missions">
                <MissionsPage />
              </RoleGuard>
            }
          />
          <Route path="assignations" element={<Navigate to="/referents" replace />} />
          <Route
            path="referents"
            element={
              <RoleGuard capability="view:referents">
                <ReferentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="planning"
            element={
              <RoleGuard capability="view:planning">
                <PlanningPage />
              </RoleGuard>
            }
          />
          <Route
            path="deroule"
            element={
              <RoleGuard capability="view:deroule">
                <DeroulePage />
              </RoleGuard>
            }
          />
          <Route path="timing" element={<Navigate to="/deroule" replace />} />
          <Route
            path="messages"
            element={
              <RoleGuard capability="view:messages">
                <MessagesPage />
              </RoleGuard>
            }
          />
          <Route
            path="photos-groupe"
            element={
              <RoleGuard capability="view:photos-groupe">
                <PhotosGroupePage />
              </RoleGuard>
            }
          />
          <Route
            path="accueil"
            element={
              <RoleGuard capability="view:accueil">
                <AccueilPage />
              </RoleGuard>
            }
          />
          <Route
            path="logistique"
            element={
              <RoleGuard capability="view:logistique">
                <LogistiquePage />
              </RoleGuard>
            }
          />
          <Route path="nourriture" element={<Navigate to="/logistique" replace />} />
          <Route path="materiel" element={<Navigate to="/logistique" replace />} />
          <Route path="sejour" element={<Navigate to="/logistique" replace />} />
          <Route
            path="invites"
            element={
              <RoleGuard capability="view:guests">
                <InvitesPage />
              </RoleGuard>
            }
          />
          <Route
            path="invites/:guestId"
            element={
              <RoleGuard capability="view:guests">
                <GuestDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="tour-tables"
            element={
              <RoleGuard capability="view:tour-tables">
                <TourTablesIndexPage />
              </RoleGuard>
            }
          />
          <Route path="plan-table" element={<Navigate to="/invites" replace />} />
          <Route path="enfants" element={<Navigate to="/invites" replace />} />
          <Route path="personnes-agees" element={<Navigate to="/invites" replace />} />
          <Route path="prestataires" element={<Navigate to="/logistique" replace />} />
          <Route
            path="cadeaux"
            element={
              <RoleGuard capability="view:cadeaux">
                <CadeauxPage />
              </RoleGuard>
            }
          />
          <Route
            path="documents"
            element={
              <RoleGuard capability="view:documents">
                <DocumentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="parametres"
            element={
              <RoleGuard capability="manage:settings">
                <ParametresPage />
              </RoleGuard>
            }
          />
          <Route
            path="parametres/revue-contenu"
            element={
              <RoleGuard capability="manage:settings">
                <RevueContenuPage />
              </RoleGuard>
            }
          />
          <Route
            path="ma-mission"
            element={
              <RoleGuard capability="view:role">
                <MaMissionPage />
              </RoleGuard>
            }
          />
          <Route
            path="mes-responsabilites"
            element={
              <RoleGuard capability="view:briefing">
                <MesResponsabilitesPage />
              </RoleGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
