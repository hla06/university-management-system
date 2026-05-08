import { supabase } from "./supabaseClient";

export async function getAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Announcements error:", error.message);
    return [];
  }

  return data;
}