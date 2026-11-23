import { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import { queryKeys } from './queryKeys';
import { Attendance, Company, DashboardStatistics, Patient, Place, ReportRow, User } from '../types';

async function getJson<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<T>(url, { params });
  return data;
}

export const fetchCompanies = () => getJson<Company[]>('/companies');
export const fetchCompany = (id: number) => getJson<Company>(`/companies/${id}`);
export const fetchPatients = (companyId: number) => getJson<Patient[]>('/patients', { company_id: companyId });
export const fetchPatient = (id: number | string) => getJson<Patient>(`/patients/${id}`);
export const fetchAttendances = (companyId: number, filters?: { patient_id?: number | string }) =>
  getJson<Attendance[]>('/attendances', { company_id: companyId, ...filters });
export const fetchPlaces = (companyId: number) => getJson<Place[]>('/places', { company_id: companyId });
export const fetchUsers = async (companyId: number, filters?: { role?: string }) => {
  const data = await getJson<{ users: User[] }>('/users', { company_id: companyId, ...filters });
  return data.users;
};
export const fetchDashboard = (companyId: number, range: { start_date: string; end_date: string }) =>
  getJson<DashboardStatistics>('/dashboard/statistics', { company_id: companyId, ...range });
export const fetchReports = (companyId: number, params: Record<string, unknown>) =>
  getJson<ReportRow[]>('/reports/attendances', { company_id: companyId, ...params });

const byName = <T extends { name: string }>(list: T[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
const byStartDate = (list: Attendance[]) => [...list].sort((a, b) => b.start_date.localeCompare(a.start_date));

export function upsertPatientInCache(client: QueryClient, companyId: number, saved: Patient) {
  client.setQueryData(queryKeys.patients.list(companyId), (current: Patient[] | undefined) =>
    current ? byName([...current.filter((item) => item.id !== saved.id), saved]) : current,
  );
  client.setQueryData(queryKeys.patients.detail(saved.id), saved);
}

export function removePatientFromCache(client: QueryClient, companyId: number, id: number) {
  client.setQueryData(queryKeys.patients.list(companyId), (current: Patient[] | undefined) => current?.filter((item) => item.id !== id));
  client.removeQueries({ queryKey: queryKeys.patients.detail(id) });
}

export function upsertAttendanceInCache(client: QueryClient, saved: Attendance) {
  client
    .getQueryCache()
    .findAll({ queryKey: queryKeys.attendances.all })
    .forEach((query) => {
      const filters = query.queryKey[3] as { patient_id?: number | string } | undefined;
      client.setQueryData(query.queryKey, (current: Attendance[] | undefined) => {
        if (!current) return current;
        const belongs = !filters?.patient_id || Number(filters.patient_id) === saved.patient_id;
        const without = current.filter((item) => item.id !== saved.id);
        return belongs ? byStartDate([...without, saved]) : without;
      });
    });
}

export function removeAttendanceFromCache(client: QueryClient, id: number) {
  client.setQueriesData({ queryKey: queryKeys.attendances.all }, (current: Attendance[] | undefined) => current?.filter((item) => item.id !== id));
}

export function upsertPlaceInCache(client: QueryClient, companyId: number, saved: Place) {
  client.setQueryData(queryKeys.places.list(companyId), (current: Place[] | undefined) =>
    current ? byName([...current.filter((item) => item.id !== saved.id), saved]) : current,
  );
}

export function removePlaceFromCache(client: QueryClient, companyId: number, id: number) {
  client.setQueryData(queryKeys.places.list(companyId), (current: Place[] | undefined) => current?.filter((item) => item.id !== id));
}

export function upsertUserInCache(client: QueryClient, saved: User) {
  client
    .getQueryCache()
    .findAll({ queryKey: queryKeys.users.all })
    .forEach((query) => {
      const filters = query.queryKey[3] as { role?: string } | undefined;
      client.setQueryData(query.queryKey, (current: User[] | undefined) => {
        if (!current) return current;
        const without = current.filter((item) => item.id !== saved.id);
        if (filters?.role && saved.role !== filters.role) return without;
        return byName([...without, saved]);
      });
    });
}

export function removeUserFromCache(client: QueryClient, id: number) {
  client.setQueriesData({ queryKey: queryKeys.users.all }, (current: User[] | undefined) => current?.filter((item) => item.id !== id));
}

export function upsertCompanyInCache(client: QueryClient, saved: Company) {
  client.setQueryData(queryKeys.companies.list(), (current: Company[] | undefined) =>
    current ? byName([...current.filter((item) => item.id !== saved.id), saved]) : current,
  );
  client.setQueryData(queryKeys.companies.detail(saved.id), saved);
}

export function removeCompanyFromCache(client: QueryClient, id: number) {
  client.setQueryData(queryKeys.companies.list(), (current: Company[] | undefined) => current?.filter((item) => item.id !== id));
  client.removeQueries({ queryKey: queryKeys.companies.detail(id) });
}

/** Depois de criar, confirmar, finalizar ou excluir um atendimento. */
export function invalidateAfterAttendanceChange(client: QueryClient, attendance?: { patient_id?: number | null }) {
  void client.invalidateQueries({ queryKey: queryKeys.attendances.all });
  void client.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void client.invalidateQueries({ queryKey: queryKeys.reports.all });
  if (attendance?.patient_id) {
    void client.invalidateQueries({ queryKey: queryKeys.patients.detail(attendance.patient_id) });
  }
}

/** Depois de criar, editar ou excluir um paciente (nomes na agenda e indicadores). */
export function invalidateAfterPatientChange(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.patients.all });
  void client.invalidateQueries({ queryKey: queryKeys.attendances.all });
  void client.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void client.invalidateQueries({ queryKey: queryKeys.reports.all });
}
