import { useEffect, useRef } from 'react';

/**
 * Executa `reset` quando um modal abre (ou passa a editar outro registro).
 * Guarda o último estado em uma ref para não apagar o que o usuário digitou
 * caso o efeito seja reexecutado por re-render ou reconexão do React.
 */
export function useResetOnOpen(open: boolean, recordKey: unknown, reset: () => void) {
  const last = useRef<unknown>(undefined);
  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    if (!open) {
      last.current = undefined;
      return;
    }
    const key = recordKey ?? 'new';
    if (last.current === key) return;
    last.current = key;
    resetRef.current();
  }, [open, recordKey]);
}
