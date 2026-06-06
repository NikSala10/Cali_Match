import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const upsertRow = async (table: string, row: Record<string, unknown>, onConflict?: string) => {
  const { error } = await supabase.from(table).upsert(row, onConflict ? { onConflict } : undefined);
  if (error) throw error;
};

// ── Save / create ─────────────────────────────────────────────────────────────

export const saveGroupToSupabase = async (params: {
  code: string;
  name: string;
  size: number;
  createdBy?: string | null;
  members: unknown[];
  status?: string;
}) => {
  await upsertRow(
    "groups",
    {
      id: params.code,
      code: params.code,
      name: params.name,
      size: params.size,
      created_by: params.createdBy,
      status: params.status ?? "active",
    },
    "id",
  );
  await upsertRow(
    "group_details",
    {
      group_id: params.code,
      code: params.code,
      members: params.members,
      quiz_answers: {},
      metadata: { size: params.size },
    },
    "group_id",
  );
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

export const fetchGroupFromSupabase = async (code: string) => {
  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", code)
    .single();

  if (error) throw error;

  const { data: details } = await supabase
    .from("group_details")
    .select("*")
    .eq("group_id", code)
    .single();

  const { data: recommendation } = await supabase
    .from("group_recommendations")
    .select("*")
    .eq("group_id", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...group,
    members: (details?.members ?? []) as unknown[],
    quizAnswers: (details?.quiz_answers ?? {}) as Record<string, unknown>,
    recommendation,
  };
};

// ── Update members ────────────────────────────────────────────────────────────

export const updateGroupMembersInSupabase = async (groupCode: string, members: unknown[]) => {
  const { error } = await supabase
    .from("group_details")
    .update({ members })
    .eq("group_id", groupCode);
  if (error) throw error;
};

// ── Save member quiz answer ───────────────────────────────────────────────────

export const saveMemberQuizToSupabase = async (
  groupCode: string,
  memberId: string,
  quiz: unknown,
) => {
  // Fetch current quiz_answers only — never touch the members array here
  // (touching members risks overwriting concurrent joins from other users)
  const { data } = await supabase
    .from("group_details")
    .select("quiz_answers")
    .eq("group_id", groupCode)
    .single();

  const quizAnswers = ((data?.quiz_answers as Record<string, unknown>) ?? {});
  quizAnswers[memberId] = quiz;

  const { error } = await supabase
    .from("group_details")
    .update({ quiz_answers: quizAnswers })
    .eq("group_id", groupCode);
  if (error) throw error;
};

// ── Finalize parche ───────────────────────────────────────────────────────────

export const finalizeGroupInSupabase = async (code: string) => {
  const { error } = await supabase
    .from("groups")
    .update({ status: "finalizado", finalized_at: new Date().toISOString() })
    .eq("id", code);
  if (error) throw error;
};

// ── Save personal onboarding answers ─────────────────────────────────────────

export const saveOnboardingToSupabase = async (userId: string, answers: unknown) => {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_answers: answers })
    .eq("id", userId);
  if (error) throw error;
};

// ── Update group info ─────────────────────────────────────────────────────────

export const updateGroupInfoInSupabase = async (
  code: string,
  updates: { name?: string; size?: number },
) => {
  const { error } = await supabase.from("groups").update(updates).eq("id", code);
  if (error) throw error;
};
