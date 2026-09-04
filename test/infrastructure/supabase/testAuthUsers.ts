import { createSupabaseServiceClient } from "@/infrastructure/supabase/client";

export async function createTestAuthUser(email: string): Promise<{ id: string }> {
  const client = createSupabaseServiceClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `test-${crypto.randomUUID()}`,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test auth user: ${error?.message}`);
  }
  return { id: data.user.id };
}

export async function deleteTestAuthUser(id: string): Promise<void> {
  const client = createSupabaseServiceClient();
  await client.auth.admin.deleteUser(id);
}
