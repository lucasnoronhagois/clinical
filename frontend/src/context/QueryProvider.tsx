import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { QueryDevtools } from '../components/QueryDevtools';
import { createQueryClient } from '../lib/queryClient';

export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [fallback] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client ?? fallback}>
      {children}
      {import.meta.env.DEV && <QueryDevtools />}
    </QueryClientProvider>
  );
}
