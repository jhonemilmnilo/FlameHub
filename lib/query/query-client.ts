import { QueryClient } from "@tanstack/react-query";

/**
 * ⚡ Singleton QueryClient Factory
 *
 * Configures global caching behavior:
 * - staleTime: 30 seconds (modal queries stay fresh in memory for 30s)
 * - gcTime: 5 minutes (inactive modal caches are garbage-collected)
 * - retry: 1 (retry network hiccups once)
 * - refetchOnWindowFocus: false (avoids unexpected modal data shifts on tab switch)
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a fresh QueryClient to prevent cross-request leakage
    return makeQueryClient();
  } else {
    // Browser: reuse singleton QueryClient across component lifecycles
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
