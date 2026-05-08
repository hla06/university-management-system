import { supabase } from "./supabaseClient";

export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Events error:", error.message);
    return [];
  }

  return data;
}