"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutationLock } from "@/hooks/use-mutation-lock";
import { navigateAfterSuccess } from "@/lib/navigation/after-success";

type FeatureMutationSuccess = {
  href?: string;
  method?: "push" | "replace";
  toast?: () => void;
  onSuccess?: () => void;
};

/**
 * Mutation lock + async mutate + optional navigate/toast on success.
 * Releases the lock on error, or when staying on the page without navigation.
 */
export function useFeatureMutation() {
  const router = useRouter();
  const { isPending, tryBegin, release } = useMutationLock();

  const runMutation = useCallback(
    async <T>(
      mutate: () => Promise<T>,
      options?: FeatureMutationSuccess,
    ): Promise<T | undefined> => {
      if (!tryBegin()) return undefined;

      try {
        const result = await mutate();
        options?.onSuccess?.();

        if (options?.href) {
          navigateAfterSuccess(router, options.href, {
            method: options.method,
            toast: options.toast,
          });
          // Keep lock engaged through leave navigation.
          return result;
        }

        options?.toast?.();
        release();
        return result;
      } catch (error) {
        release();
        throw error;
      }
    },
    [release, router, tryBegin],
  );

  return { isPending, runMutation, release };
}
