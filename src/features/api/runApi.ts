import type { AppDeps } from "@/application/ports/appDeps";
import { localDeps, localUserId } from "@/features/authentication/container";
import { isSupabaseMode } from "@/shared/config";

/**
 * Runs one API operation: through its server function in Supabase mode, or
 * directly against the localStorage adapters in local mode. Routes call the
 * `api.<area>.<op>` wrappers built on this and never branch on mode.
 */
export async function runApi<I, O>(
  serverFn: (opts: { data: I }) => Promise<O>,
  local: (deps: AppDeps, actorId: string, input: I) => Promise<O>,
  input: I,
): Promise<O> {
  if (isSupabaseMode()) return serverFn({ data: input });
  return local(localDeps(), await localUserId(), input);
}

/** Like `runApi`, for the few operations that need no signed-in user (invitation preview). */
export async function runPublicApi<I, O>(
  serverFn: (opts: { data: I }) => Promise<O>,
  local: (deps: AppDeps, input: I) => Promise<O>,
  input: I,
): Promise<O> {
  if (isSupabaseMode()) return serverFn({ data: input });
  return local(localDeps(), input);
}
