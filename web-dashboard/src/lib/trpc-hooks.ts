'use client';

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { createTrpcClient } from './trpc';

export function useTrpc() {
  const { getToken } = useAuth();
  return useMemo(() => createTrpcClient(() => getToken()), [getToken]);
}
