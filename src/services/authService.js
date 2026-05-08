import { supabase } from "./supabaseClient";

export const VALID_ROLES = ["student", "doctor", "admin"];

export function warnIfLegacyRole(role) {
  if (role && !VALID_ROLES.includes(role)) {
    console.warn(
      `HUMAN DATABASE FIX NEEDED: profile role "${role}" is not supported. Use only student, doctor, or admin. Convert legacy super_admin rows to admin and old admin-as-doctor rows to doctor.`
    );
  }
}

export async function register(email, password, fullName, role) {
  warnIfLegacyRole(role);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile error:", error.message);
    return null;
  }

  warnIfLegacyRole(data?.role);

  return data;
}
