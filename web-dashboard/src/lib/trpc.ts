import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// Import de solo-tipos: se borra en compilación, así que el código del
// backend nunca se empaqueta en el bundle del frontend (ver el alias
// "memorias-backend" en tsconfig.json, que apunta a ../backend/src).
import type { AppRouter } from 'memorias-backend/trpc/app.router';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/trpc';

export function createTrpcClient(getToken: () => Promise<string | null>) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: apiUrl,
        headers: async () => {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

export type TrpcClient = ReturnType<typeof createTrpcClient>;
