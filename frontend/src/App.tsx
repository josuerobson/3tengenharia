// src/App.tsx
// Raiz da aplicação — define as rotas e envolve tudo no AuthProvider e DashboardLayout.

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'

// ── Páginas reais (Etapa 5) ───────────────────────────────────────────────────
import TripStartPage from '@/pages/vehicles/TripStartPage'
import MaintenanceAlertsPage from '@/pages/vehicles/MaintenanceAlertsPage'
import AssetCatalogPage from '@/pages/assets/AssetCatalogPage'

// ── Páginas reais (Etapa 6) ────────────────────────────────────────────────────
import DailyLogPage from '@/pages/time-logs/DailyLogPage'
import ReportPage from '@/pages/time-logs/ReportPage'

// ── Páginas reais (Módulo 5S) ────────────────────────────────────────────────
import DailyAuditForm5S from '@/pages/fiveS/DailyAuditForm5S'
import QualityValidationPanel5S from '@/pages/fiveS/QualityValidationPanel5S'

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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/*"
          element={
            <DashboardLayout>
              <Routes>
                {/* Redireciona raiz para /dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard */}
                <Route
                  path="dashboard"
                  element={<PlaceholderPage title="Dashboard" description="Indicadores operacionais da 3T." />}
                />

                {/* Módulo 1 — Veículos */}
                <Route path="vehicles/trips/new" element={<TripStartPage />} />
                <Route path="vehicles/trips" element={<PlaceholderPage title="Histórico de Viagens" />} />
                <Route path="vehicles/maintenance" element={<MaintenanceAlertsPage />} />

                {/* Módulo 2 — Ferramentas */}
                <Route path="assets/catalog" element={<AssetCatalogPage />} />
                <Route path="assets/loans/new" element={<PlaceholderPage title="Solicitar Empréstimo" />} />
                <Route path="assets/maintenance/new" element={<PlaceholderPage title="Relatar Defeito" />} />
                <Route path="assets/warehouse" element={<PlaceholderPage title="Almoxarifado" />} />

                {/* Módulo 3 — Horas */}
                <Route path="time-logs/daily" element={<DailyLogPage />} />
                <Route path="time-logs/report" element={<ReportPage />} />

                {/* Módulo 5S — Auditorias de Organização */}
                <Route path="5s/audit/new" element={<DailyAuditForm5S />} />
                <Route path="5s/panel"     element={<QualityValidationPanel5S />} />

                {/* Admin */}
                <Route path="admin/users" element={<PlaceholderPage title="Usuários" />} />
                <Route path="admin/worksites" element={<PlaceholderPage title="Cadastro de Obras" />} />
                <Route path="admin/vehicles" element={<PlaceholderPage title="Cadastro de Veículos" />} />

                {/* 404 interno */}
                <Route
                  path="*"
                  element={<PlaceholderPage title="Página não encontrada" description="A rota solicitada não existe." />}
                />
              </Routes>
            </DashboardLayout>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
