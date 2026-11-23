import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '../lib/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Busca dados de um endpoint GET e expõe estados de carregamento, erro e recarga. */
export function useApi<T>(url: string | null, params?: Record<string, unknown>) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: Boolean(url), error: null });
  const paramsKey = JSON.stringify(params ?? {});
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const { data } = await api.get<T>(url, { params: JSON.parse(paramsKey) });
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) setState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [url, paramsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setState((current) => ({ ...current, data: updater(current.data) }));
  }, []);

  return { ...state, reload: load, setData };
}
