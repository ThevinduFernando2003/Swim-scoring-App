import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/roles";
import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("unauthorized");
  }
  return user;
}

export async function requireMeetAccess(meetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("unauthorized");
  }
  const access = await getAccess(supabase, user, meetId);
  return { user, supabase, access };
}
