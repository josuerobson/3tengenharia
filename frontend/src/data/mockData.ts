// src/data/mockData.ts
// Dados fictícios para desenvolvimento — substituir por chamadas à API real na Etapa 6.

export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
export type AssetStatus = 'AVAILABLE' | 'LOANED' | 'MAINTENANCE' | 'DAMAGED' | 'WRITTEN_OFF'
export type ShiftType = 'REGULAR' | 'OVERTIME' | 'ON_CALL' | 'ABSENCE' | 'VACATION' | 'HOLIDAY'

// ── Veículos ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  currentKm: number
  status: VehicleStatus
  /** Limiar de KM para manutenção preventiva (ex: 5000 km) */
  maintenanceKmThreshold: number | null
  /** Limiar de dias para manutenção preventiva (ex: 90 dias) */
  maintenanceDayThreshold: number | null
  /** KM registrado na última manutenção */
  lastMaintenanceKm: number | null
  /** Data da última manutenção */
  lastMaintenanceDate: string | null
  /** Tipo de combustível */
  fuelType: 'FLEX' | 'DIESEL' | 'GASOLINE' | 'ELECTRIC'
  /** Empresa responsável */
  responsibleCompany: string | null
}

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    licensePlate: 'ABC-1D23',
    brand: 'Volkswagen',
    model: 'Saveiro Robust CS',
    year: 2022,
    currentKm: 48_320,
    status: 'ACTIVE',
    maintenanceKmThreshold: 5_000,
    maintenanceDayThreshold: 90,
    lastMaintenanceKm: 43_950,
    lastMaintenanceDate: '2026-03-10',
    fuelType: 'FLEX',
    responsibleCompany: '3T Engenharia',
  },
  {
    id: 'veh-002',
    licensePlate: 'DEF-2E34',
    brand: 'Ford',
    model: 'Ranger XLS 4x4',
    year: 2021,
    currentKm: 102_150,
    status: 'ACTIVE',
    maintenanceKmThreshold: 10_000,
    maintenanceDayThreshold: 90,
    lastMaintenanceKm: 96_200,
    lastMaintenanceDate: '2026-02-15',
    fuelType: 'DIESEL',
    responsibleCompany: '3T Engenharia',
  },
  {
    id: 'veh-003',
    licensePlate: 'GHI-3F45',
    brand: 'Toyota',
    model: 'Hilux SW4 SRX',
    year: 2023,
    currentKm: 75_840,
    status: 'MAINTENANCE',
    maintenanceKmThreshold: 5_000,
    maintenanceDayThreshold: 90,
    lastMaintenanceKm: 70_100,
    lastMaintenanceDate: '2026-05-01',
    fuelType: 'DIESEL',
    responsibleCompany: '3T Engenharia',
  },
  {
    id: 'veh-004',
    licensePlate: 'JKL-4G56',
    brand: 'Fiat',
    model: 'Fiorino Furgão',
    year: 2020,
    currentKm: 31_200,
    status: 'ACTIVE',
    maintenanceKmThreshold: 5_000,
    maintenanceDayThreshold: 60,
    lastMaintenanceKm: 26_800,
    lastMaintenanceDate: '2026-04-20',
    fuelType: 'FLEX',
    responsibleCompany: '3T Engenharia',
  },
  {
    id: 'veh-005',
    licensePlate: 'MNO-5H67',
    brand: 'Chevrolet',
    model: 'S10 High Country 4x4',
    year: 2022,
    currentKm: 88_910,
    status: 'ACTIVE',
    maintenanceKmThreshold: 10_000,
    maintenanceDayThreshold: 90,
    lastMaintenanceKm: 82_300,
    lastMaintenanceDate: '2026-04-05',
    fuelType: 'DIESEL',
    responsibleCompany: '3T Engenharia',
  },
]

// ── Viagens (para histórico de auditoria) ─────────────────────────────────────

export interface Trip {
  id: string
  vehicleId: string
  vehicle: { licensePlate: string; model: string; brand: string }
  driverName: string
  driverRegistration: string
  origin: string
  destination: string
  purpose: string
  departureDateTime: string
  arrivalDateTime: string | null
  initialKm: number
  finalKm: number | null
  distanceTraveled: number | null
  maintenanceAlertActive: boolean
}

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-001',
    vehicleId: 'veh-001',
    vehicle: { licensePlate: 'ABC-1D23', model: 'Saveiro Robust CS', brand: 'Volkswagen' },
    driverName: 'João da Silva Santos',
    driverRegistration: 'EMP-0042',
    origin: 'São Paulo — Almoxarifado Central',
    destination: 'Campinas — Obra Residencial Norte',
    purpose: 'Transporte de materiais',
    departureDateTime: '2026-06-22T07:30:00',
    arrivalDateTime: '2026-06-22T09:45:00',
    initialKm: 47_980,
    finalKm: 48_320,
    distanceTraveled: 340,
    maintenanceAlertActive: true,
  },
  {
    id: 'trip-002',
    vehicleId: 'veh-002',
    vehicle: { licensePlate: 'DEF-2E34', model: 'Ranger XLS 4x4', brand: 'Ford' },
    driverName: 'Carlos Eduardo Pereira',
    driverRegistration: 'EMP-0015',
    origin: 'São Paulo — Sede',
    destination: 'Santos — Obra Comercial Porto',
    purpose: 'Visita técnica de fiscalização',
    departureDateTime: '2026-06-21T14:00:00',
    arrivalDateTime: '2026-06-21T16:30:00',
    initialKm: 101_820,
    finalKm: 102_150,
    distanceTraveled: 330,
    maintenanceAlertActive: false,
  },
  {
    id: 'trip-003',
    vehicleId: 'veh-001',
    vehicle: { licensePlate: 'ABC-1D23', model: 'Saveiro Robust CS', brand: 'Volkswagen' },
    driverName: 'Marcos Roberto Lima',
    driverRegistration: 'EMP-0031',
    origin: 'Campinas — Obra Residencial Norte',
    destination: 'Sorocaba — Fornecedor Ferro Bom',
    purpose: 'Busca de materiais de construção',
    departureDateTime: '2026-06-20T08:15:00',
    arrivalDateTime: '2026-06-20T11:00:00',
    initialKm: 47_550,
    finalKm: 47_980,
    distanceTraveled: 430,
    maintenanceAlertActive: false,
  },
  {
    id: 'trip-004',
    vehicleId: 'veh-004',
    vehicle: { licensePlate: 'JKL-4G56', model: 'Fiorino Furgão', brand: 'Fiat' },
    driverName: 'André Luís Costa',
    driverRegistration: 'EMP-0058',
    origin: 'São Paulo — Sede',
    destination: 'São Paulo — Obra Itaim Bibi',
    purpose: 'Entrega de ferramentas e EPIs',
    departureDateTime: '2026-06-22T10:00:00',
    arrivalDateTime: null,
    initialKm: 31_200,
    finalKm: null,
    distanceTraveled: null,
    maintenanceAlertActive: false,
  },
  {
    id: 'trip-005',
    vehicleId: 'veh-005',
    vehicle: { licensePlate: 'MNO-5H67', model: 'S10 High Country 4x4', brand: 'Chevrolet' },
    driverName: 'Roberto Alves Mendes',
    driverRegistration: 'EMP-0021',
    origin: 'São Paulo — Sede',
    destination: 'Guarulhos — Obra Industrial Norte',
    purpose: 'Reunião de alinhamento com cliente',
    departureDateTime: '2026-06-19T09:00:00',
    arrivalDateTime: '2026-06-19T10:20:00',
    initialKm: 88_720,
    finalKm: 88_910,
    distanceTraveled: 190,
    maintenanceAlertActive: false,
  },
]

// ── Bens Patrimoniais ─────────────────────────────────────────────────────────

export type AssetCategory =
  | 'POWER_TOOLS'
  | 'HAND_TOOLS'
  | 'MEASUREMENT'
  | 'SAFETY'
  | 'PNEUMATIC'
  | 'LIFTING'
  | 'ELECTRICAL'
  | 'OTHER'

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  POWER_TOOLS: 'Ferramentas Elétricas',
  HAND_TOOLS: 'Ferramentas Manuais',
  MEASUREMENT: 'Medição e Topografia',
  SAFETY: 'Segurança do Trabalho',
  PNEUMATIC: 'Ferramentas Pneumáticas',
  LIFTING: 'Içamento e Movimentação',
  ELECTRICAL: 'Elétrica e Eletrônica',
  OTHER: 'Outros',
}

export interface Asset {
  id: string
  assetTag: string
  description: string
  category: AssetCategory
  brand: string | null
  model: string | null
  serialNumber: string | null
  currentStatus: AssetStatus
  location: string | null
  acquisitionDate: string | null
  acquisitionValue: number | null
  currentBorrowee: string | null
}

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'ast-001',
    assetTag: 'PAT-0001',
    description: 'Furadeira de Impacto 13mm',
    category: 'POWER_TOOLS',
    brand: 'Bosch',
    model: 'GSB 13 RE',
    serialNumber: 'BSH-2024-0001',
    currentStatus: 'AVAILABLE',
    location: 'Almoxarifado Central — Prateleira A1',
    acquisitionDate: '2024-01-15',
    acquisitionValue: 485.90,
    currentBorrowee: null,
  },
  {
    id: 'ast-002',
    assetTag: 'PAT-0002',
    description: 'Martelo Rotativo / Demolidor',
    category: 'POWER_TOOLS',
    brand: 'DeWalt',
    model: 'D25134K',
    serialNumber: 'DWT-2023-0088',
    currentStatus: 'LOANED',
    location: 'Obra Residencial Norte — Campinas',
    acquisitionDate: '2023-08-20',
    acquisitionValue: 1_240.00,
    currentBorrowee: 'João da Silva Santos',
  },
  {
    id: 'ast-003',
    assetTag: 'PAT-0003',
    description: 'Serra Circular de Bancada 10"',
    category: 'POWER_TOOLS',
    brand: 'Makita',
    model: 'LS1016L',
    serialNumber: 'MKT-2024-0022',
    currentStatus: 'MAINTENANCE',
    location: 'Oficina Interna — Bancada 3',
    acquisitionDate: '2024-03-10',
    acquisitionValue: 3_200.00,
    currentBorrowee: null,
  },
  {
    id: 'ast-004',
    assetTag: 'PAT-0004',
    description: 'Parafusadeira / Furadeira sem fio',
    category: 'POWER_TOOLS',
    brand: 'Milwaukee',
    model: 'M18 BLPD2-0',
    serialNumber: 'MLW-2025-0005',
    currentStatus: 'AVAILABLE',
    location: 'Almoxarifado Central — Prateleira A2',
    acquisitionDate: '2025-01-08',
    acquisitionValue: 890.00,
    currentBorrowee: null,
  },
  {
    id: 'ast-005',
    assetTag: 'PAT-0005',
    description: 'Esmerilhadeira Angular 4.5"',
    category: 'POWER_TOOLS',
    brand: 'Metabo',
    model: 'W 850-115',
    serialNumber: 'MTB-2023-0041',
    currentStatus: 'DAMAGED',
    location: 'Almoxarifado Central — Área de Defeitos',
    acquisitionDate: '2023-06-05',
    acquisitionValue: 620.00,
    currentBorrowee: null,
  },
  {
    id: 'ast-006',
    assetTag: 'PAT-0006',
    description: 'Nível a Laser de Linhas Cruzadas',
    category: 'MEASUREMENT',
    brand: 'Leica',
    model: 'LINO L2',
    serialNumber: 'LCA-2024-0003',
    currentStatus: 'AVAILABLE',
    location: 'Almoxarifado Central — Prateleira B1',
    acquisitionDate: '2024-05-20',
    acquisitionValue: 2_100.00,
    currentBorrowee: null,
  },
  {
    id: 'ast-007',
    assetTag: 'PAT-0007',
    description: 'Multímetro Digital True RMS',
    category: 'ELECTRICAL',
    brand: 'Fluke',
    model: '117',
    serialNumber: 'FLK-2024-0011',
    currentStatus: 'LOANED',
    location: 'Obra Comercial Porto — Santos',
    acquisitionDate: '2024-02-14',
    acquisitionValue: 1_580.00,
    currentBorrowee: 'Carlos Eduardo Pereira',
  },
  {
    id: 'ast-008',
    assetTag: 'PAT-0008',
    description: 'Compressor de Ar Portátil 10 pcm',
    category: 'PNEUMATIC',
    brand: 'Schulz',
    model: 'CSA-10',
    serialNumber: 'SCZ-2023-0055',
    currentStatus: 'AVAILABLE',
    location: 'Almoxarifado Central — Área de Grandes Volumes',
    acquisitionDate: '2023-11-30',
    acquisitionValue: 1_950.00,
    currentBorrowee: null,
  },
]

// ── Tipos de Manutenção por Veículo ──────────────────────────────────────────

export interface VehicleMaintenanceType {
  id: string
  vehicleId: string
  name: string
  description: string | null
  isActive: boolean
  intervalKm: number | null
  intervalDays: number | null
  lastServiceKm: number | null
  lastServiceDate: string | null
}

export interface MaintenanceAlert {
  maintenanceTypeId: string
  vehicleId: string
  name: string              // ex: "Troca de óleo do motor"
  description: string | null
  licensePlate: string
  vehicleBrand: string
  vehicleModel: string
  currentKm: number
  intervalKm: number | null
  intervalDays: number | null
  lastServiceKm: number | null
  lastServiceDate: string | null
  kmRemaining: number | null     // negativo = vencido em km
  daysRemaining: number | null   // negativo = vencido em dias
  urgency: 'ok' | 'medium' | 'high' | 'critical'
}

export const MOCK_MAINTENANCE_TYPES: VehicleMaintenanceType[] = [
  // ── Volkswagen Saveiro (veh-001, currentKm: 48.320) ─────────────────────────
  { id: 'mt-001', vehicleId: 'veh-001', name: 'Troca de óleo do motor',     description: 'Óleo 5W30 sintético + filtro de óleo',           isActive: true,  intervalKm: 10_000, intervalDays: 180, lastServiceKm: 46_000, lastServiceDate: '2026-04-01' },
  { id: 'mt-002', vehicleId: 'veh-001', name: 'Óleo da caixa de câmbio',    description: null,                                               isActive: true,  intervalKm: 40_000, intervalDays: null, lastServiceKm: 20_000, lastServiceDate: '2024-10-10' },
  { id: 'mt-003', vehicleId: 'veh-001', name: 'Correia dentada',             description: 'Substituir conjunto correia + tensor + polia',    isActive: true,  intervalKm: 60_000, intervalDays: null, lastServiceKm: 0,      lastServiceDate: null },
  { id: 'mt-004', vehicleId: 'veh-001', name: 'Filtro de ar do motor',      description: null,                                               isActive: true,  intervalKm: 15_000, intervalDays: 365,  lastServiceKm: 40_000, lastServiceDate: '2026-01-15' },
  { id: 'mt-005', vehicleId: 'veh-001', name: 'Pneus dianteiros',           description: 'Verificar desgaste e calibragem — trocar se < 2mm', isActive: true, intervalKm: 40_000, intervalDays: null, lastServiceKm: 12_000, lastServiceDate: '2023-06-01' },

  // ── Ford Ranger (veh-002, currentKm: 102.150) ────────────────────────────────
  { id: 'mt-006', vehicleId: 'veh-002', name: 'Troca de óleo do motor',     description: 'Óleo 10W40 diesel semi-sintético',                isActive: true,  intervalKm: 10_000, intervalDays: 180, lastServiceKm: 96_200, lastServiceDate: '2026-02-15' },
  { id: 'mt-007', vehicleId: 'veh-002', name: 'Filtro de combustível',      description: null,                                               isActive: true,  intervalKm: 20_000, intervalDays: null, lastServiceKm: 90_000, lastServiceDate: '2025-11-01' },
  { id: 'mt-008', vehicleId: 'veh-002', name: 'Correia dentada',             description: 'Substituir conjunto completo',                    isActive: true,  intervalKm: 60_000, intervalDays: null, lastServiceKm: 60_000, lastServiceDate: '2024-08-20' },

  // ── Toyota Hilux (veh-003, currentKm: 75.840) ────────────────────────────────
  { id: 'mt-009', vehicleId: 'veh-003', name: 'Troca de óleo do motor',     description: 'Óleo 5W40 diesel sintético',                     isActive: true,  intervalKm: 10_000, intervalDays: 180, lastServiceKm: 70_100, lastServiceDate: '2026-05-01' },
  { id: 'mt-010', vehicleId: 'veh-003', name: 'Pastilhas de freio dianteiro', description: null,                                             isActive: true,  intervalKm: 25_000, intervalDays: null, lastServiceKm: 50_000, lastServiceDate: '2025-07-10' },

  // ── Fiat Fiorino (veh-004, currentKm: 31.200) ────────────────────────────────
  { id: 'mt-011', vehicleId: 'veh-004', name: 'Troca de óleo do motor',     description: 'Óleo 5W30 mineral',                              isActive: true,  intervalKm: 5_000,  intervalDays: 120, lastServiceKm: 28_000, lastServiceDate: '2026-04-20' },
  { id: 'mt-012', vehicleId: 'veh-004', name: 'Pneus dianteiros',           description: null,                                               isActive: true,  intervalKm: 40_000, intervalDays: null, lastServiceKm: 0,      lastServiceDate: null },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calcula alertas de manutenção por tipo de serviço para um veículo.
 * Retorna um alerta por tipo cadastrado (com intervalKm ou intervalDays),
 * ordenados por urgência (crítico → urgente → atenção → ok).
 */
export function computeMaintenanceAlerts(
  vehicle: Vehicle,
  types: VehicleMaintenanceType[],
): MaintenanceAlert[] {
  const urgencyOrder = { critical: 0, high: 1, medium: 2, ok: 3 }
  const today = new Date()

  return types
    .filter(t => t.isActive && (t.intervalKm !== null || t.intervalDays !== null))
    .map(t => {
      // ── KM ──────────────────────────────────────────────────────────────────
      let kmRemaining: number | null = null
      let kmUrgency: 'ok' | 'medium' | 'high' | 'critical' | null = null

      if (t.intervalKm !== null) {
        const baseKm = t.lastServiceKm ?? 0
        const dueAtKm = baseKm + t.intervalKm
        kmRemaining = dueAtKm - vehicle.currentKm
        const pct = Math.min(100, ((vehicle.currentKm - baseKm) / t.intervalKm) * 100)
        kmUrgency = pct >= 100 ? 'critical' : pct >= 85 ? 'high' : pct >= 65 ? 'medium' : 'ok'
      }

      // ── Dias ────────────────────────────────────────────────────────────────
      let daysRemaining: number | null = null
      let daysUrgency: 'ok' | 'medium' | 'high' | 'critical' | null = null

      if (t.intervalDays !== null) {
        const baseDate = t.lastServiceDate ? new Date(t.lastServiceDate) : new Date(0)
        const dueMs = baseDate.getTime() + t.intervalDays * 86_400_000
        daysRemaining = Math.ceil((dueMs - today.getTime()) / 86_400_000)
        const elapsed = t.intervalDays - daysRemaining
        const pct = Math.min(100, (elapsed / t.intervalDays) * 100)
        daysUrgency = pct >= 100 ? 'critical' : pct >= 85 ? 'high' : pct >= 65 ? 'medium' : 'ok'
      }

      // Urgência = a mais severa entre km e dias
      const urgency = ([kmUrgency, daysUrgency].filter(Boolean) as ('ok' | 'medium' | 'high' | 'critical')[])
        .sort((a, b) => urgencyOrder[a] - urgencyOrder[b])[0] ?? 'ok'

      return {
        maintenanceTypeId: t.id,
        vehicleId:         vehicle.id,
        name:              t.name,
        description:       t.description,
        licensePlate:      vehicle.licensePlate,
        vehicleBrand:      `${vehicle.brand} ${vehicle.model}`,
        vehicleModel:      vehicle.model,
        currentKm:         vehicle.currentKm,
        intervalKm:        t.intervalKm,
        intervalDays:      t.intervalDays,
        lastServiceKm:     t.lastServiceKm,
        lastServiceDate:   t.lastServiceDate,
        kmRemaining,
        daysRemaining,
        urgency,
      } satisfies MaintenanceAlert
    })
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
}

/** @deprecated — use computeMaintenanceAlerts. Mantido para compatibilidade com a timeline de viagens. */
export function getVehicleMaintenanceInfo(vehicle: Vehicle): {
  kmSinceLast: number
  percentage: number
  urgency: 'ok' | 'medium' | 'high' | 'critical'
  needsMaintenance: boolean
} {
  if (!vehicle.maintenanceKmThreshold || vehicle.lastMaintenanceKm === null) {
    return { kmSinceLast: 0, percentage: 0, urgency: 'ok', needsMaintenance: false }
  }
  const kmSinceLast = vehicle.currentKm - vehicle.lastMaintenanceKm
  const percentage = Math.min(100, (kmSinceLast / vehicle.maintenanceKmThreshold) * 100)
  const urgency =
    percentage >= 100 ? 'critical'
    : percentage >= 85 ? 'high'
    : percentage >= 65 ? 'medium'
    : 'ok'
  return { kmSinceLast, percentage, urgency, needsMaintenance: percentage >= 100 }
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatKm(km: number): string {
  return km.toLocaleString('pt-BR') + ' km'
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ── Obras / Centros de Custo ──────────────────────────────────────────────────

export interface Worksite {
  id: string
  name: string
  costCenter: string
  address: string
  city: string
  status: 'ACTIVE' | 'INACTIVE'
  coordinatorName: string
}

export const MOCK_WORKSITES: Worksite[] = [
  {
    id: 'ws-001',
    name: 'Residencial Norte',
    costCenter: 'CC-001-CPS',
    address: 'R. das Palmeiras, 100',
    city: 'Campinas',
    status: 'ACTIVE',
    coordinatorName: 'Roberto Alves Mendes',
  },
  {
    id: 'ws-002',
    name: 'Comercial Porto',
    costCenter: 'CC-002-STS',
    address: 'Av. do Porto, 500',
    city: 'Santos',
    status: 'ACTIVE',
    coordinatorName: 'Carlos Eduardo Pereira',
  },
  {
    id: 'ws-003',
    name: 'Industrial Guarulhos',
    costCenter: 'CC-003-GRU',
    address: 'Rua das Indústrias, 200',
    city: 'Guarulhos',
    status: 'ACTIVE',
    coordinatorName: 'Roberto Alves Mendes',
  },
  {
    id: 'ws-004',
    name: 'Residencial Itaim',
    costCenter: 'CC-004-SP',
    address: 'Rua Itaim Bibi, 750',
    city: 'São Paulo',
    status: 'ACTIVE',
    coordinatorName: 'Fernanda Souza Silva',
  },
  {
    id: 'ws-005',
    name: 'Sede 3T Engenharia',
    costCenter: 'CC-005-SP',
    address: 'Av. Paulista, 1234',
    city: 'São Paulo',
    status: 'ACTIVE',
    coordinatorName: 'Ana Clara Pereira',
  },
]

// ── Funcionários ──────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  fullName: string
  registration: string
  role: string
  department: string
  active: boolean
}

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp-001', fullName: 'João da Silva Santos',    registration: 'EMP-0042', role: 'Operário de Produção',    department: 'Execução',        active: true },
  { id: 'emp-002', fullName: 'Carlos Eduardo Pereira',  registration: 'EMP-0015', role: 'Motorista',               department: 'Logística',       active: true },
  { id: 'emp-003', fullName: 'Marcos Roberto Lima',     registration: 'EMP-0031', role: 'Pedreiro',                department: 'Execução',        active: true },
  { id: 'emp-004', fullName: 'André Luís Costa',        registration: 'EMP-0058', role: 'Eletricista',             department: 'Instalações',     active: true },
  { id: 'emp-005', fullName: 'Roberto Alves Mendes',    registration: 'EMP-0021', role: 'Engenheiro de Campo',     department: 'Supervisão',      active: true },
  { id: 'emp-006', fullName: 'Fernanda Souza Silva',    registration: 'EMP-0067', role: 'Encarregada de Obras',    department: 'Supervisão',      active: true },
  { id: 'emp-007', fullName: 'Paulo Henrique Alves',    registration: 'EMP-0033', role: 'Auxiliar de Obras',       department: 'Execução',        active: true },
  { id: 'emp-008', fullName: 'Luciana Torres Ramos',    registration: 'EMP-0049', role: 'Técnica em Segurança',    department: 'Segurança',       active: true },
  { id: 'emp-009', fullName: 'Diego Martins Oliveira',  registration: 'EMP-0055', role: 'Armador de Aço',          department: 'Execução',        active: true },
  { id: 'emp-010', fullName: 'Ana Clara Pereira',       registration: 'EMP-0073', role: 'Auxiliar Administrativa', department: 'Administração',   active: true },
]

// ── Lançamentos de Horas ──────────────────────────────────────────────────────

export interface TimeLogEntry {
  id: string
  employeeId: string
  employeeName: string
  registration: string
  worksiteId: string
  worksiteName: string
  costCenter: string
  logDate: string
  entryTime: string
  breakStartTime: string | null
  breakEndTime: string | null
  exitTime: string
  totalHours: number
  overtimeHours: number
  shiftType: ShiftType
  hasInconsistency: boolean
  inconsistencyNote: string | null
  recordedBy: string
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  REGULAR:  'Regular',
  OVERTIME: 'Hora Extra',
  ON_CALL:  'Sobreaviso',
  ABSENCE:  'Falta',
  VACATION: 'Férias',
  HOLIDAY:  'Feriado',
}

export const MOCK_TIME_LOGS: TimeLogEntry[] = [
  // ── 16/06 — Residencial Norte ───────────────────────────────────────────
  { id: 'tl-001', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-16', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-002', employeeId: 'emp-003', employeeName: 'Marcos Roberto Lima',    registration: 'EMP-0031', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-16', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-003', employeeId: 'emp-009', employeeName: 'Diego Martins Oliveira', registration: 'EMP-0055', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-16', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  // ── 16/06 — Residencial Itaim ───────────────────────────────────────────
  { id: 'tl-004', employeeId: 'emp-004', employeeName: 'André Luís Costa',       registration: 'EMP-0058', worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', costCenter: 'CC-004-SP',  logDate: '2026-06-16', entryTime: '08:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '18:00', totalHours: 9,   overtimeHours: 1,   shiftType: 'OVERTIME', hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
  { id: 'tl-005', employeeId: 'emp-008', employeeName: 'Luciana Torres Ramos',   registration: 'EMP-0049', worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', costCenter: 'CC-004-SP',  logDate: '2026-06-16', entryTime: '08:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 8,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
  // ── 17/06 — Residencial Norte ───────────────────────────────────────────
  { id: 'tl-006', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-17', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-007', employeeId: 'emp-003', employeeName: 'Marcos Roberto Lima',    registration: 'EMP-0031', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-17', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-008', employeeId: 'emp-007', employeeName: 'Paulo Henrique Alves',   registration: 'EMP-0033', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-17', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  // ── 17/06 — Industrial Guarulhos (hora extra) ──────────────────────────
  { id: 'tl-009', employeeId: 'emp-005', employeeName: 'Roberto Alves Mendes',   registration: 'EMP-0021', worksiteId: 'ws-003', worksiteName: 'Industrial Guarulhos', costCenter: 'CC-003-GRU', logDate: '2026-06-17', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '19:00', totalHours: 11,  overtimeHours: 3,   shiftType: 'OVERTIME', hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-010', employeeId: 'emp-006', employeeName: 'Fernanda Souza Silva',   registration: 'EMP-0067', worksiteId: 'ws-003', worksiteName: 'Industrial Guarulhos', costCenter: 'CC-003-GRU', logDate: '2026-06-17', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
  // ── 18/06 — Residencial Norte (inconsistência) ─────────────────────────
  { id: 'tl-011', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-18', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-012', employeeId: 'emp-003', employeeName: 'Marcos Roberto Lima',    registration: 'EMP-0031', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-18', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '22:00', totalHours: 14,  overtimeHours: 6,   shiftType: 'OVERTIME', hasInconsistency: true,  inconsistencyNote: 'Jornada acima de 10h sem justificativa de gestor', recordedBy: 'Roberto Alves Mendes' },
  // ── 19/06 — Comercial Porto ─────────────────────────────────────────────
  { id: 'tl-013', employeeId: 'emp-002', employeeName: 'Carlos Eduardo Pereira', registration: 'EMP-0015', worksiteId: 'ws-002', worksiteName: 'Comercial Porto',   costCenter: 'CC-002-STS', logDate: '2026-06-19', entryTime: '08:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 8,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Carlos Eduardo Pereira' },
  { id: 'tl-014', employeeId: 'emp-004', employeeName: 'André Luís Costa',       registration: 'EMP-0058', worksiteId: 'ws-002', worksiteName: 'Comercial Porto',   costCenter: 'CC-002-STS', logDate: '2026-06-19', entryTime: '08:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 8,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Carlos Eduardo Pereira' },
  // ── 20/06 — Residencial Norte ───────────────────────────────────────────
  { id: 'tl-015', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-20', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-016', employeeId: 'emp-005', employeeName: 'Roberto Alves Mendes',   registration: 'EMP-0021', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-20', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  // ── 21/06 — Residencial Norte (inconsistência) ─────────────────────────
  { id: 'tl-017', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-21', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-018', employeeId: 'emp-003', employeeName: 'Marcos Roberto Lima',    registration: 'EMP-0031', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-21', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: null,    exitTime: '17:00', totalHours: 10,  overtimeHours: 2,   shiftType: 'OVERTIME', hasInconsistency: true,  inconsistencyNote: 'Marcação de retorno do intervalo ausente no ponto eletrônico', recordedBy: 'Roberto Alves Mendes' },
  { id: 'tl-019', employeeId: 'emp-007', employeeName: 'Paulo Henrique Alves',   registration: 'EMP-0033', worksiteId: 'ws-001', worksiteName: 'Residencial Norte', costCenter: 'CC-001-CPS', logDate: '2026-06-21', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Roberto Alves Mendes' },
  // ── 22/06 (HOJE) — Residencial Itaim ───────────────────────────────────
  { id: 'tl-020', employeeId: 'emp-001', employeeName: 'João da Silva Santos',   registration: 'EMP-0042', worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', costCenter: 'CC-004-SP',  logDate: '2026-06-22', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
  { id: 'tl-021', employeeId: 'emp-004', employeeName: 'André Luís Costa',       registration: 'EMP-0058', worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', costCenter: 'CC-004-SP',  logDate: '2026-06-22', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
  { id: 'tl-022', employeeId: 'emp-006', employeeName: 'Fernanda Souza Silva',   registration: 'EMP-0067', worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', costCenter: 'CC-004-SP',  logDate: '2026-06-22', entryTime: '07:00', breakStartTime: '12:00', breakEndTime: '13:00', exitTime: '17:00', totalHours: 9,   overtimeHours: 0,   shiftType: 'REGULAR',  hasInconsistency: false, inconsistencyNote: null, recordedBy: 'Fernanda Souza Silva' },
]

// ── Helpers de Tempo ──────────────────────────────────────────────────────────

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToDecimalHours(mins: number): number {
  return Math.round((mins / 60) * 100) / 100
}

/**
 * Calcula as horas líquidas (descontando intervalo).
 * Retorna 0 se os inputs forem inválidos.
 */
export function calculateNetHours(
  entryTime: string,
  breakStartTime: string | null,
  breakEndTime: string | null,
  exitTime: string,
): number {
  if (!entryTime || !exitTime) return 0
  const totalMins = timeToMinutes(exitTime) - timeToMinutes(entryTime)
  const breakMins =
    breakStartTime && breakEndTime
      ? Math.max(0, timeToMinutes(breakEndTime) - timeToMinutes(breakStartTime))
      : 0
  return Math.max(0, minutesToDecimalHours(totalMins - breakMins))
}

export function validateTimes(
  entryTime: string,
  breakStartTime: string,
  breakEndTime: string,
  exitTime: string,
): string | null {
  if (!entryTime || !exitTime) return 'Preencha os horários de entrada e saída.'
  const entry = timeToMinutes(entryTime)
  const exit  = timeToMinutes(exitTime)
  if (exit <= entry) return 'Horário de saída deve ser posterior à entrada.'
  if (breakStartTime && breakEndTime) {
    const bs = timeToMinutes(breakStartTime)
    const be = timeToMinutes(breakEndTime)
    if (bs <= entry) return 'Início do intervalo deve ser após a entrada.'
    if (be <= bs)    return 'Fim do intervalo deve ser após o início.'
    if (be >= exit)  return 'Fim do intervalo deve ser antes da saída.'
  }
  return null
}

// ── Módulo 5S — Auditorias de Organização ────────────────────────────────────

export type AuditStatus5S    = 'CONFORME' | 'NAO_CONFORME'
export type ValidationStatus = 'AGUARDANDO_AVALIACAO' | 'APROVADO' | 'REPROVADO'

export const AREA_TYPES_5S = [
  'Canteiro',
  'Almoxarifado',
  'Escritório',
  'Área Comum',
  'Banheiro/Vestiário',
  'Refeitório',
  'Depósito de Materiais',
] as const
export type AreaType5S = (typeof AREA_TYPES_5S)[number]

export interface AuditPhoto5S {
  id: string
  photoUrl: string   // Em produção: URL do S3/Cloud Storage. No mock: objeto URL local
  createdAt: string
}

export interface Audit5SEntry {
  id: string
  worksiteId: string
  worksiteName: string
  worksiteCity: string
  auditorEmployeeId: string
  auditorName: string
  auditorRegistration: string
  areaType: AreaType5S
  description: string
  status: AuditStatus5S
  validation: ValidationStatus
  validatorId: string | null
  validatorEmail: string | null
  correctiveAction: string | null
  photos: AuditPhoto5S[]
  createdAt: string
  updatedAt: string
}

export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  AGUARDANDO_AVALIACAO: 'Aguardando avaliação',
  APROVADO:             'Aprovado',
  REPROVADO:            'Reprovado',
}

export const STATUS_5S_LABELS: Record<AuditStatus5S, string> = {
  CONFORME:     'Conforme',
  NAO_CONFORME: 'Não Conforme',
}

// Fotos placeholder (Unsplash — construção civil)
const PHOTO_STUBS: AuditPhoto5S[] = [
  { id: 'ph-1', photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=640&q=70', createdAt: '2026-06-18T08:12:00Z' },
  { id: 'ph-2', photoUrl: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=640&q=70', createdAt: '2026-06-18T08:13:00Z' },
  { id: 'ph-3', photoUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=640&q=70', createdAt: '2026-06-19T09:05:00Z' },
]

export const MOCK_AUDITS_5S: Audit5SEntry[] = [
  {
    id: 'a5s-001',
    worksiteId: 'ws-001', worksiteName: 'Residencial Norte', worksiteCity: 'Campinas',
    auditorEmployeeId: 'emp-005', auditorName: 'Roberto Alves Mendes', auditorRegistration: 'EMP-0021',
    areaType: 'Canteiro', description: 'Materiais de construção empilhados de forma inadequada próximo à circulação de pessoas, criando risco de queda e obstrução de saída de emergência.',
    status: 'NAO_CONFORME', validation: 'AGUARDANDO_AVALIACAO', validatorId: null, validatorEmail: null, correctiveAction: null,
    photos: [PHOTO_STUBS[0]!, PHOTO_STUBS[1]!],
    createdAt: '2026-06-18T08:15:00Z', updatedAt: '2026-06-18T08:15:00Z',
  },
  {
    id: 'a5s-002',
    worksiteId: 'ws-001', worksiteName: 'Residencial Norte', worksiteCity: 'Campinas',
    auditorEmployeeId: 'emp-008', auditorName: 'Luciana Torres Ramos', auditorRegistration: 'EMP-0049',
    areaType: 'Banheiro/Vestiário', description: 'Área de higiene pessoal em boas condições. Sabonete, papel toalha e lixeiras disponíveis.',
    status: 'CONFORME', validation: 'APROVADO', validatorId: 'usr-001', validatorEmail: 'qualidade@3tengenharia.com', correctiveAction: null,
    photos: [PHOTO_STUBS[2]!],
    createdAt: '2026-06-18T09:30:00Z', updatedAt: '2026-06-19T10:00:00Z',
  },
  {
    id: 'a5s-003',
    worksiteId: 'ws-003', worksiteName: 'Industrial Guarulhos', worksiteCity: 'Guarulhos',
    auditorEmployeeId: 'emp-006', auditorName: 'Fernanda Souza Silva', auditorRegistration: 'EMP-0067',
    areaType: 'Almoxarifado', description: 'Ferramentas sem identificação e sem local definido de guarda. EPIs misturados com ferramentas de corte. Risco de acidente e perda de rastreabilidade.',
    status: 'NAO_CONFORME', validation: 'REPROVADO', validatorId: 'usr-001', validatorEmail: 'qualidade@3tengenharia.com',
    correctiveAction: 'Identificar todas as ferramentas com etiquetas de patrimônio. Criar prateleiras exclusivas para EPIs separadas das ferramentas. Prazo: 5 dias úteis. Responsável: Encarregado de Almoxarifado.',
    photos: [PHOTO_STUBS[0]!, PHOTO_STUBS[2]!],
    createdAt: '2026-06-19T07:45:00Z', updatedAt: '2026-06-20T14:20:00Z',
  },
  {
    id: 'a5s-004',
    worksiteId: 'ws-002', worksiteName: 'Comercial Porto', worksiteCity: 'Santos',
    auditorEmployeeId: 'emp-005', auditorName: 'Roberto Alves Mendes', auditorRegistration: 'EMP-0021',
    areaType: 'Área Comum', description: 'Passarela molhada e sem sinalização. Acúmulo de entulho no corredor principal bloqueando 40% da largura mínima de passagem.',
    status: 'NAO_CONFORME', validation: 'AGUARDANDO_AVALIACAO', validatorId: null, validatorEmail: null, correctiveAction: null,
    photos: [PHOTO_STUBS[1]!, PHOTO_STUBS[2]!],
    createdAt: '2026-06-20T11:00:00Z', updatedAt: '2026-06-20T11:00:00Z',
  },
  {
    id: 'a5s-005',
    worksiteId: 'ws-004', worksiteName: 'Residencial Itaim', worksiteCity: 'São Paulo',
    auditorEmployeeId: 'emp-008', auditorName: 'Luciana Torres Ramos', auditorRegistration: 'EMP-0049',
    areaType: 'Escritório', description: 'Escritório de obra organizado. Documentos classificados, mesa limpa, extintor com validade em dia.',
    status: 'CONFORME', validation: 'AGUARDANDO_AVALIACAO', validatorId: null, validatorEmail: null, correctiveAction: null,
    photos: [PHOTO_STUBS[0]!],
    createdAt: '2026-06-22T07:30:00Z', updatedAt: '2026-06-22T07:30:00Z',
  },
  {
    id: 'a5s-006',
    worksiteId: 'ws-005', worksiteName: 'Sede 3T Engenharia', worksiteCity: 'São Paulo',
    auditorEmployeeId: 'emp-010', auditorName: 'Ana Clara Pereira', auditorRegistration: 'EMP-0073',
    areaType: 'Depósito de Materiais', description: 'Estoque de insumos sem etiquetagem de validade. Produtos químicos armazenados sem separação por classe de risco. FISPQ não disponível no local.',
    status: 'NAO_CONFORME', validation: 'AGUARDANDO_AVALIACAO', validatorId: null, validatorEmail: null, correctiveAction: null,
    photos: [PHOTO_STUBS[1]!, PHOTO_STUBS[2]!, PHOTO_STUBS[0]!],
    createdAt: '2026-06-22T10:15:00Z', updatedAt: '2026-06-22T10:15:00Z',
  },
]

/** Calcula KPIs do painel 5S a partir da lista de auditorias */
export function compute5SKPIs(audits: Audit5SEntry[]) {
  const pending    = audits.filter((a) => a.validation === 'AGUARDANDO_AVALIACAO')
  const naoConf    = audits.filter((a) => a.status === 'NAO_CONFORME')
  const reprovados = audits.filter((a) => a.validation === 'REPROVADO')

  // Obra com mais não conformidades
  const bySite = naoConf.reduce<Record<string, { name: string; count: number }>>((acc, a) => {
    if (!acc[a.worksiteId]) acc[a.worksiteId] = { name: a.worksiteName, count: 0 }
    acc[a.worksiteId]!.count++
    return acc
  }, {})
  const criticalSite = Object.values(bySite).sort((a, b) => b.count - a.count)[0] ?? null

  return {
    total:        audits.length,
    pending:      pending.length,
    naoConforme:  naoConf.length,
    reprovados:   reprovados.length,
    criticalSite,
  }
}
