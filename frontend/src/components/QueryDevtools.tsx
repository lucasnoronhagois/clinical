import { lazy, Suspense } from 'react';

const Devtools = lazy(() => import('@tanstack/react-query-devtools').then((mod) => ({ default: mod.ReactQueryDevtools })));

/** Ferramenta de inspeção do cache, só no ambiente de desenvolvimento. */
export function QueryDevtools() {
  if (!import.meta.env.DEV) return null;
  return (
    <Suspense fallback={null}>
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  );
}
