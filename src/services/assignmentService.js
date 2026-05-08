import { supabase } from "./supabaseClient";

export async function getAssignments() {
  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id,
      title,
      description,
      course_id,
      due_date,
      created_by,
      courses (
        id,
        code,
        title
      )
    `)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Assignments loading error:", error.message);
    return [];
  }

  return data || [];
}

export async function createAssignment(assignment) {
  const { data, error } = await supabase
    .from("assignments")
    .insert([assignment])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function getGradesForStudent(studentId) {
  const { data, error } = await supabase
    .from("grades")
    .select(`
      id,
      student_id,
      course_id,
      assignment_id,
      grade,
      feedback,
      assignments (
        id,
        title,
        description,
        due_date
      ),
      courses (
        id,
        code,
        title
      )
    `)
    .eq("student_id", studentId);

  if (error) {
    console.error("Grades loading error:", error.message);
    return [];
  }

  return data || [];
}
export async function getAssignmentsForStudent(studentId) {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  const courseIds = enrollments?.map((e) => e.course_id) || [];

  if (courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      id,
      title,
      description,
      course_id,
      due_date,
      courses (
        id,
        code,
        title
      )
    `)
    .in("course_id", courseIds)
    .order("due_date", { ascending: true });

  if (error) {
    console.error(error.message);
    return [];
  }

  return data || [];
}
export async function getAllGrades() {
  const { data, error } = await supabase
    .from("grades")
    .select(`
      id,
      student_id,
      course_id,
      assignment_id,
      grade,
      feedback,
      assignments (
        id,
        title,
        description,
        due_date
      ),
      courses (
        id,
        code,
        title
      ),
      profiles (
        full_name,
        email
      )
    `);

  if (error) {
    console.error("All grades loading error:", error.message);
    return [];
  }

  return data || [];
}