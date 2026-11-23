import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { invalidateAfterAttendanceChange, removeAttendanceFromCache, upsertAttendanceInCache } from '../lib/queryApi';
import { queryKeys } from '../lib/queryKeys';
import { Attendance } from '../types';

function patchAttendanceLists(client: ReturnType<typeof useQueryClient>, id: number, updater: (current: Attendance) => Attendance) {
  client
    .getQueryCache()
    .findAll({ queryKey: queryKeys.attendances.all })
    .forEach((query) => {
      client.setQueryData(query.queryKey, (current: Attendance[] | undefined) => current?.map((item) => (item.id === id ? updater(item) : item)));
    });
}

function snapshotAttendances(client: ReturnType<typeof useQueryClient>) {
  return client.getQueriesData<Attendance[]>({ queryKey: queryKeys.attendances.all });
}

function restoreAttendances(client: ReturnType<typeof useQueryClient>, snapshot: ReturnType<typeof snapshotAttendances>) {
  snapshot.forEach(([key, data]) => client.setQueryData(key, data));
}

export function useConfirmAttendance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (attendance: Attendance) => {
      const { data } = await api.put<Attendance>(`/attendances/${attendance.id}/confirm`);
      return data;
    },
    onMutate: async (attendance) => {
      await client.cancelQueries({ queryKey: queryKeys.attendances.all });
      const snapshot = snapshotAttendances(client);
      patchAttendanceLists(client, attendance.id, (current) => ({ ...current, confirmed_at: new Date().toISOString() }));
      return { snapshot };
    },
    onError: (_error, _attendance, context) => {
      if (context?.snapshot) restoreAttendances(client, context.snapshot);
    },
    onSuccess: (saved) => {
      upsertAttendanceInCache(client, saved);
    },
    onSettled: (_data, _error, attendance) => {
      invalidateAfterAttendanceChange(client, attendance);
    },
  });
}

export function useFinishAttendance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (attendance: Attendance) => {
      const { data } = await api.put<Attendance>(`/attendances/${attendance.id}/finish`);
      return data;
    },
    onMutate: async (attendance) => {
      await client.cancelQueries({ queryKey: queryKeys.attendances.all });
      const snapshot = snapshotAttendances(client);
      patchAttendanceLists(client, attendance.id, (current) => ({ ...current, end_date: new Date().toISOString() }));
      return { snapshot };
    },
    onError: (_error, _attendance, context) => {
      if (context?.snapshot) restoreAttendances(client, context.snapshot);
    },
    onSuccess: (saved) => {
      upsertAttendanceInCache(client, saved);
    },
    onSettled: (_data, _error, attendance) => {
      invalidateAfterAttendanceChange(client, attendance);
    },
  });
}

export function useDeleteAttendance() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (attendance: Attendance) => {
      await api.delete(`/attendances/${attendance.id}`);
      return attendance;
    },
    onMutate: async (attendance) => {
      await client.cancelQueries({ queryKey: queryKeys.attendances.all });
      const snapshot = snapshotAttendances(client);
      removeAttendanceFromCache(client, attendance.id);
      return { snapshot };
    },
    onError: (_error, _attendance, context) => {
      if (context?.snapshot) restoreAttendances(client, context.snapshot);
    },
    onSettled: (_data, _error, attendance) => {
      invalidateAfterAttendanceChange(client, attendance);
    },
  });
}
