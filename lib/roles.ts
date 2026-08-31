import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Access, MeetRoleName } from "./types";

export async function isSuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (!error && typeof data === "boolean") return data;

  const { data: rows, error: tableError } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (tableError) {
    // Before migration / empty table: any signed-in user can administer.
    return true;
  }
  if (rows) return true;

  const { count } = await supabase
    .from("super_admins")
    .select("user_id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

export async function loadMeetRole(
  supabase: SupabaseClient,
  meetId: string,
  userId: string,
): Promise<MeetRoleName | null> {
  const { data } = await supabase
    .from("meet_roles")
    .select("role")
    .eq("meet_id", meetId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as MeetRoleName | undefined) ?? null;
}

export async function getAccess(
  supabase: SupabaseClient,
  user: User,
  meetId: string | null,
): Promise<Access> {
  const superAdmin = await isSuperAdmin(supabase, user.id);
  const meetRole = meetId ? await loadMeetRole(supabase, meetId, user.id) : null;
  return {
    userId: user.id,
    email: user.email ?? null,
    isSuperAdmin: superAdmin,
    meetRole,
    canManage: superAdmin || meetRole === "meet_admin",
    canScore: superAdmin || meetRole === "meet_admin" || meetRole === "official",
  };
}

export async function listAccessibleMeets(supabase: SupabaseClient, user: User) {
  const superAdmin = await isSuperAdmin(supabase, user.id);
  if (superAdmin) {
    const { data, error } = await supabase
      .from("meets")
      .select("id, slug, name, participant_label, status, points_config, pdfs_public, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { isSuperAdmin: true, meets: data ?? [] };
  }

  const { data: roles, error: roleError } = await supabase
    .from("meet_roles")
    .select("meet_id, role, meets(id, slug, name, participant_label, status, points_config, pdfs_public, created_at)")
    .eq("user_id", user.id);
  if (roleError) throw roleError;

  const meets = (roles ?? [])
    .map((row) => {
      const meet = Array.isArray(row.meets) ? row.meets[0] : row.meets;
      return meet ? { ...meet, role: row.role } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  return { isSuperAdmin: false, meets };
}
