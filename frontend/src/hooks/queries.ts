import { keepPreviousData, useQuery, UseQueryResult } from '@tanstack/react-query';
import { getErrorMessage } from '../lib/api';
import {
  fetchAttendances,
  fetchCompanies,
  fetchCompany,
  fetchDashboard,
  fetchPatient,
  fetchPatients,
  fetchPlaces,
  fetchReports,
  fetchUsers,
} from '../lib/queryApi';
import { queryKeys } from '../lib/queryKeys';
import { Attendance, Company, DashboardStatistics, Patient, Place, ReportRow, User } from '../types';

export interface ResourceQuery<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  isFetching: boolean;
}

export function toResource<T>(query: UseQueryResult<T, Error>): ResourceQuery<T> {
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => {
      void query.refetch();
    },
    isFetching: query.isFetching,
  };
}

export function useCompanies(enabled = true) {
  return toResource(
    useQuery({
      queryKey: queryKeys.companies.list(),
      queryFn: fetchCompanies,
      enabled,
      placeholderData: keepPreviousData,
    }),
  );
}

export function useCompany(id: number | null, enabled = true) {
  return toResource(
    useQuery({
      queryKey: queryKeys.companies.detail(id ?? 0),
      queryFn: () => fetchCompany(id!),
      enabled: enabled && Boolean(id),
    }),
  );
}

export function usePatients(companyId: number, enabled = true) {
  return toResource(
    useQuery({
      queryKey: queryKeys.patients.list(companyId),
      queryFn: () => fetchPatients(companyId),
      enabled,
      placeholderData: keepPreviousData,
    }),
  );
}

export function usePatient(id: number | string | undefined) {
  return toResource(
    useQuery({
      queryKey: queryKeys.patients.detail(id ?? 0),
      queryFn: () => fetchPatient(id!),
      enabled: Boolean(id),
    }),
  );
}

export function useAttendances(companyId: number, filters?: { patient_id?: number | string }) {
  return toResource(
    useQuery({
      queryKey: queryKeys.attendances.list(companyId, filters),
      queryFn: () => fetchAttendances(companyId, filters),
      placeholderData: keepPreviousData,
    }),
  );
}

export function usePlaces(companyId: number, enabled = true) {
  return toResource(
    useQuery({
      queryKey: queryKeys.places.list(companyId),
      queryFn: () => fetchPlaces(companyId),
      enabled,
      placeholderData: keepPreviousData,
    }),
  );
}

export function useUsers(companyId: number, filters?: { role?: string }, enabled = true) {
  return toResource(
    useQuery({
      queryKey: queryKeys.users.list(companyId, filters),
      queryFn: () => fetchUsers(companyId, filters),
      enabled,
      placeholderData: keepPreviousData,
    }),
  );
}

export function useDashboard(companyId: number, range: { start_date: string; end_date: string }) {
  return toResource(
    useQuery({
      queryKey: queryKeys.dashboard.stats(companyId, range),
      queryFn: () => fetchDashboard(companyId, range),
      placeholderData: keepPreviousData,
    }),
  );
}

export function useReports(companyId: number, params: Record<string, unknown>) {
  const filters = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'company_id'));
  return toResource(
    useQuery({
      queryKey: queryKeys.reports.attendances(companyId, filters),
      queryFn: () => fetchReports(companyId, filters),
      placeholderData: keepPreviousData,
    }),
  );
}

export type { Attendance, Company, DashboardStatistics, Patient, Place, ReportRow, User };
