import { supabase } from "./supabaseClient";

const COURSE_SELECT = `
  *,
  profiles (
    id,
    full_name,
    email,
    department_id
  ),
  departments (
    id,
    name
  )
`;

function applyCourseVisibility(query, profile) {
  if (!profile) return query;

  if (profile.role === "admin") {
    return query;
  }

  if (profile.role === "doctor") {
    if (profile.id && profile.department_id) {
      return query.or(
        `doctor_id.eq.${profile.id},department_id.eq.${profile.department_id}`
      );
    }

    if (profile.id) return query.eq("doctor_id", profile.id);
    if (profile.department_id) return query.eq("department_id", profile.department_id);

    console.warn(
      "HUMAN DATABASE FIX NEEDED: doctor profiles should have id and department_id so course access can be scoped."
    );
    return query;
  }

  if (profile.role === "student") {
    if (profile.department_id) {
      return query.eq("department_id", profile.department_id);
    }

    console.warn(
      "HUMAN DATABASE FIX NEEDED: student profiles should have department_id so course eligibility can be checked."
    );
  }

  return query;
}

export function canManageCourse(profile, course) {
  if (!profile || !course) return false;
  if (profile.role === "admin") return true;

  if (profile.role === "doctor") {
    return (
      course.doctor_id === profile.id ||
      (profile.department_id && course.department_id === profile.department_id)
    );
  }

  return false;
}

export function canStudentAccessCourse(profile, course) {
  if (!profile || !course || profile.role !== "student") return false;

  if (profile.department_id && course.department_id) {
    return profile.department_id === course.department_id;
  }

  console.warn(
    "HUMAN DATABASE FIX NEEDED: profiles.department_id and courses.department_id are required for department-based enrollment checks."
  );
  return true;
}

export async function getCourses(profile) {
  let query = supabase
    .from("courses")
    .select(COURSE_SELECT)
    .order("id", { ascending: true });

  query = applyCourseVisibility(query, profile);

  const { data, error } = await query;

  if (error) {
    console.error("Courses error:", error.message);
    return [];
  }

  return data;
}

export async function getCourseById(id) {
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Course details error:", error.message);
    return null;
  }

  return data;
}

export async function getExistingEnrollment(student_id, course_id) {
  const { data: existing } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", student_id)
    .eq("course_id", course_id);

  return existing?.[0] || null;
}

export async function enrollInCourse(student_id, course_id, profile) {
  if (!student_id) {
    return { success: false, message: "Please login first." };
  }

  if (profile?.role !== "student") {
    return { success: false, message: "Only students can enroll in courses." };
  }

  const course = await getCourseById(course_id);

  if (!course) {
    return { success: false, message: "Course not found." };
  }

  if (!canStudentAccessCourse(profile, course)) {
    return {
      success: false,
      message: "You can only enroll in courses from your department.",
    };
  }

  const existing = await getExistingEnrollment(student_id, course_id);

  if (existing) {
    return {
      success: false,
      duplicate: true,
      message: "You are already enrolled in this course.",
    };
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert([{ student_id, course_id }])
    .select();

  if (error) {
    console.error("Enrollment error:", error.message);
    return {
      success: false,
      message:
        error.code === "23505"
          ? "You are already enrolled in this course."
          : error.message,
    };
  }

  return {
    success: true,
    message: "Enrolled successfully.",
    enrollment: data?.[0],
    course,
  };
}

export async function getMyEnrollments(student_id) {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      course_id,
      courses (
        id,
        code,
        title,
        description,
        credits,
        type,
        doctor_id,
        profiles (
          id,
          full_name
        )
      )
    `)
    .eq("student_id", student_id);

  if (error) {
    console.error("My enrollments error:", error.message);
    return [];
  }

  return data;
}

export async function getMyEnrolledCourseTitles(student_id) {
  const enrollments = await getMyEnrollments(student_id);

  return enrollments
    .map((enroll) => enroll.courses?.title)
    .filter(Boolean);
}
