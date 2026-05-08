import { supabase } from "./supabaseClient";

export async function hasClassroomScheduleIdColumns() {
  const { error } = await supabase
    .from("classroom_schedules")
    .select("id, course_id, classroom_id")
    .limit(1);

  if (error) {
    console.warn(
      "HUMAN DATABASE FIX NEEDED: classroom_schedules must include course_id and classroom_id."
    );
    return false;
  }

  return true;
}

export async function getClassrooms() {
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name, display_name, building, capacity, type, location")
    .order("display_name", { ascending: true });

  if (error) {
    console.warn(
      "HUMAN DATABASE FIX NEEDED: add/verify classrooms table with id, name, and display_name columns."
    );
    return [];
  }

  return data || [];
}

export function getClassroomLabel(classroom) {
  return (
    classroom?.display_name ||
    classroom?.name ||
    classroom?.room_name ||
    classroom?.hall_name ||
    classroom?.title ||
    `Classroom ${classroom?.id || ""}`.trim()
  );
}

export async function getClassroomSchedules(filters = {}) {
  let query = supabase
    .from("classroom_schedules")
    .select("*")
    .order("day", { ascending: true });

  if (filters.courseIds?.length) query = query.in("course_id", filters.courseIds);
  if (filters.courseNames?.length) query = query.in("course_name", filters.courseNames);

  const { data, error } = await query;

  if (error) {
    console.error("Classroom schedules error:", error.message);
    return [];
  }

  return data || [];
}

export async function hasScheduleConflict(schedule, excludeId, useIdColumns) {
  let query = supabase
    .from("classroom_schedules")
    .select("*")
    .eq("day", schedule.day)
    .lt("start_time", schedule.end_time)
    .gt("end_time", schedule.start_time);

  if (useIdColumns) query = query.eq("classroom_id", schedule.classroom_id);
  else query = query.eq("room_name", schedule.room_name);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;

  if (error) throw error;
  return data?.[0] || null;
}

export async function addClassroomSchedule(schedule) {
  const { data, error } = await supabase
    .from("classroom_schedules")
    .insert([schedule])
    .select();

  if (error) throw error;
  return data;
}

export async function updateClassroomSchedule(id, schedule) {
  const { data, error } = await supabase
    .from("classroom_schedules")
    .update(schedule)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data;
}

export async function deleteClassroomSchedule(id) {
  const { error } = await supabase
    .from("classroom_schedules")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
