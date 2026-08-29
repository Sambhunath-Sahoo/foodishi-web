"use client";

import * as React from "react";
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { ApiError } from "./error";
import { migrateLegacyStorageKeys } from "./storage-migration";

const STALE_TIME_MS = 15_000;
const MAX_RETRIES = 2;

/**
 * A 4xx is the server telling us the request was wrong. Retrying it just
 * delays showing the operator the reason.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

export interface ApiProviderProps {
  readonly children: React.ReactNode;
  readonly client?: QueryClient;
}

/** Wrap each app's root layout in this. One client per browser session. */
export function ApiProvider({ children, client }: ApiProviderProps): React.JSX.Element {
  // Before anything reads storage. Every store in the three apps reads its
  // localStorage key lazily inside a useState initialiser, and React runs a
  // parent's body before its children's initialisers -- so this is the one place
  // the Foodishi-to-Foodishi key rename can be carried across without a store
  // having already looked and found nothing. Deliberately not a useEffect, which
  // would run too late. See storage-migration.ts, which is deletable.
  React.useState(migrateLegacyStorageKeys);

  const [queryClient] = React.useState(() => client ?? createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
