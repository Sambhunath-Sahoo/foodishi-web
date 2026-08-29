"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { services } from "../services";
import type { PlatformSettings } from "../services/types";
import { keys } from "./keys";

/**
 * Platform settings, and what changing them costs.
 *
 * Saving invalidates far more than the settings key. The commission rate decides
 * every figure in the ledger and two of the reports; the tax rate and the
 * delivery fees decide what a new order costs; the refund SLA decides which
 * refunds count as breached and therefore the alarm on the overview. A settings
 * screen that saved and left all of those showing the old arithmetic would be
 * the worst kind of wrong — quietly.
 */
export function useSettings(): UseQueryResult<PlatformSettings> {
  return useQuery({
    queryKey: keys.settings.current(),
    queryFn: () => services.settings.get(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function useSettingsWrite(
  write: (next: PlatformSettings) => Promise<PlatformSettings>,
): UseMutationResult<PlatformSettings, Error, PlatformSettings> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (saved) => {
      client.setQueryData(keys.settings.current(), saved);
      void client.invalidateQueries({ queryKey: keys.metrics.all });
      void client.invalidateQueries({ queryKey: keys.finance.all });
      void client.invalidateQueries({ queryKey: keys.reports.all });
    },
  });
}

export function useSaveSettings(): UseMutationResult<
  PlatformSettings,
  Error,
  PlatformSettings
> {
  return useSettingsWrite((next) => services.settings.save(next));
}

/** Throw away every local change and go back to what the platform ships. */
export function useResetSettings(): UseMutationResult<
  PlatformSettings,
  Error,
  PlatformSettings
> {
  return useSettingsWrite(() => services.settings.reset());
}
