import { supabase } from "./supabaseClient";

export async function getStudentRecords(profile) {
  let query = supabase
    .from("student_records")
    .select(
      `
      *,
      departments (
        id,
        name
      )
    `
    )
    .order("full_name", { ascending: true });

  if (profile?.role === "student") {
    query = query.eq("student_id", profile.id);
  }

  if (profile?.role === "doctor" && profile.department_id) {
    query = query.eq("department_id", profile.department_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Student records error:", error.message);
    return [];
  }

  return data || [];
}

export async function getMyStudentRecord(student_id) {
  const { data, error } = await supabase
    .from("student_records")
    .select(
      `
      *,
      departments (
        id,
        name
      )
    `
    )
    .eq("student_id", student_id)
    .single();

  if (error) {
    console.error("My student record error:", error.message);
    return null;
  }

  return data;
}

export async function addStudentRecord(record) {
  const { data, error } = await supabase
    .from("student_records")
    .insert([record])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function updateStudentRecord(id, record) {
  const { data, error } = await supabase
    .from("student_records")
    .update(record)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteStudentRecord(id) {
  const { error } = await supabase
    .from("student_records")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
