// src/App.tsx
// Raiz da aplicação — define as rotas e envolve tudo no AuthProvider e DashboardLayout.

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RequirePage from '@/components/RequirePage'

// ── Páginas reais (Etapa 5) ───────────────────────────────────────────────────
import TripStartPage           from '@/pages/vehicles/TripStartPage'
import TripHistoryPage         from '@/pages/vehicles/TripHistoryPage'
import MaintenanceAlertsPage   from '@/pages/vehicles/MaintenanceAlertsPage'
import MaintenanceTypesPage    from '@/pages/vehicles/MaintenanceTypesPage'
import NewDefectReportPage     from '@/pages/assets/NewDefectReportPage'
import WarehousePage           from '@/pages/assets/WarehousePage'
import LoanRequestsPage        from '@/pages/assets/LoanRequestsPage'

// ── Páginas reais (Etapa 6) ────────────────────────────────────────────────────
import DailyLogPage from '@/pages/time-logs/DailyLogPage'
import ReportPage from '@/pages/time-logs/ReportPage'
import TeamAllocationPage from '@/pages/time-logs/TeamAllocationPage'
import TeamsPage from '@/pages/time-logs/TeamsPage'

// ── Páginas reais (Módulo 5S) ────────────────────────────────────────────────
import DailyAuditForm5S        from '@/pages/fiveS/DailyAuditForm5S'
import QualityValidationPanel5S from '@/pages/fiveS/QualityValidationPanel5S'

// ── Páginas reais (Admin) ───────────────────────────────────────────────────────────────────────────
import VehicleRegistrationPage from '@/pages/vehicles/VehicleRegistrationPage'
import UsersPage                 from '@/pages/admin/UsersPage'
import ProfilePage               from '@/pages/auth/ProfilePage'
import WorksitesPage             from '@/pages/admin/WorksitesPage'
import DashboardPage             from '@/pages/dashboard/DashboardPage'
import AccessControlPage         from '@/pages/admin/AccessControlPage'

// ── Página placeholder genérica (substituir pelas páginas reais na Etapa 5) ──

function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 bg-brand-primary rounded-lg" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {description ?? 'Módulo em desenvolvimento — Etapa 5.'}
        </p>
      </div>
    </div>
  )
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <DashboardLayout>{children}</DashboardLayout>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedLayout>
              <Routes>
                {/* Redireciona raiz para /dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard */}
                <Route path="dashboard" element={<RequirePage pageKey="dashboard"><DashboardPage /></RequirePage>} />

                {/* Módulo 1 — Veículos */}
                <Route path="vehicles/trips/new"        element={<RequirePage pageKey="vehicles.trips.new"><TripStartPage /></RequirePage>} />
                <Route path="vehicles/trips"             element={<RequirePage pageKey="vehicles.trips.history"><TripHistoryPage /></RequirePage>} />
                <Route path="vehicles/maintenance"       element={<RequirePage pageKey="vehicles.maintenance.alerts"><MaintenanceAlertsPage /></RequirePage>} />
                <Route path="vehicles/maintenance-types" element={<RequirePage pageKey="vehicles.maintenance.types"><MaintenanceTypesPage /></RequirePage>} />
                <Route path="vehicles/fleet"             element={<RequirePage pageKey="vehicles.fleet"><VehicleRegistrationPage /></RequirePage>} />

                {/* Módulo 2 — Ferramentas */}
                {/* Catálogo de Itens foi consolidado em Almoxarifado > Inventário Geral */}
                <Route path="assets/catalog" element={<Navigate to="/assets/warehouse" replace />} />
                <Route path="assets/requests" element={<RequirePage pageKey="assets.requests"><LoanRequestsPage /></RequirePage>} />
                <Route path="assets/maintenance/new" element={<RequirePage pageKey="assets.defect.new"><NewDefectReportPage /></RequirePage>} />
                <Route path="assets/warehouse" element={<RequirePage pageKey={['assets.warehouse.inventory', 'assets.warehouse.fulfillment', 'assets.warehouse.activeLoans']}><WarehousePage /></RequirePage>} />

                {/* Módulo 3 — Horas */}
                <Route path="time-logs/daily" element={<RequirePage pageKey="timelogs.daily"><DailyLogPage /></RequirePage>} />
                <Route path="time-logs/report" element={<RequirePage pageKey="timelogs.report"><ReportPage /></RequirePage>} />
                <Route path="time-logs/team-allocation" element={<RequirePage pageKey="timelogs.allocation"><TeamAllocationPage /></RequirePage>} />
                <Route path="time-logs/teams" element={<RequirePage pageKey="timelogs.teams"><TeamsPage /></RequirePage>} />

                {/* Módulo 5S — Auditorias de Organização */}
                <Route path="5s/audit/new" element={<RequirePage pageKey="fiveS.audit.new"><DailyAuditForm5S /></RequirePage>} />
                <Route path="5s/panel"     element={<RequirePage pageKey="fiveS.panel"><QualityValidationPanel5S /></RequirePage>} />

                {/* Admin */}
                <Route path="admin/users"    element={<RequirePage pageKey="admin.users"><UsersPage /></RequirePage>} />
                <Route path="admin/worksites" element={<RequirePage pageKey="admin.worksites"><WorksitesPage /></RequirePage>} />
                <Route path="admin/access-control" element={<RequirePage pageKey="admin.accessControl"><AccessControlPage /></RequirePage>} />

                {/* Perfil */}
                <Route path="profile" element={<ProfilePage />} />

                {/* 404 interno */}
                <Route
                  path="*"
                  element={<PlaceholderPage title="Página não encontrada" description="A rota solicitada não existe." />}
                />
              </Routes>
            </ProtectedLayout>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
