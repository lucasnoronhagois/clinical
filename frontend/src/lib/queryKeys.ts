export const queryKeys = {
  companies: {
    all: ['companies'] as const,
    list: () => [...queryKeys.companies.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.companies.all, 'detail', id] as const,
  },
  patients: {
    all: ['patients'] as const,
    list: (companyId: number) => [...queryKeys.patients.all, 'list', companyId] as const,
    detail: (id: number | string) => [...queryKeys.patients.all, 'detail', Number(id)] as const,
  },
  attendances: {
    all: ['attendances'] as const,
    list: (companyId: number, filters?: { patient_id?: number | string }) =>
      filters ? ([...queryKeys.attendances.all, 'list', companyId, filters] as const) : ([...queryKeys.attendances.all, 'list', companyId] as const),
  },
  places: {
    all: ['places'] as const,
    list: (companyId: number) => [...queryKeys.places.all, 'list', companyId] as const,
  },
  users: {
    all: ['users'] as const,
    list: (companyId: number, filters?: { role?: string }) => [...queryKeys.users.all, 'list', companyId, filters ?? {}] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: (companyId: number, range: { start_date: string; end_date: string }) => [...queryKeys.dashboard.all, 'stats', companyId, range] as const,
  },
  reports: {
    all: ['reports'] as const,
    attendances: (companyId: number, params: Record<string, unknown>) => [...queryKeys.reports.all, 'attendances', companyId, params] as const,
  },
};
