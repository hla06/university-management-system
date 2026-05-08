import { useEffect, useState } from "react";
import "../styles/featureModules.css";
import { getCurrentProfile, getCurrentUser } from "../services/authService";
import { supabase } from "../services/supabaseClient";

function AssessmentCenter() {
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = profile?.role === "doctor" || profile?.role === "admin";

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const currentProfile = await getCurrentProfile();
      const currentUser = await getCurrentUser();
      setProfile(currentProfile);

      if (!currentProfile || !currentUser) {
        setAssessments([]);
        setCourses([]);
        return;
      }

      let courseQuery = supabase
        .from("courses")
        .select("id, code, title, department_id, doctor_id");

      if (currentProfile.role === "doctor") {
        if (currentProfile.department_id) {
          courseQuery = courseQuery.or(
            `doctor_id.eq.${currentUser.id},department_id.eq.${currentProfile.department_id}`
          );
        } else {
          courseQuery = courseQuery.eq("doctor_id", currentUser.id);
        }
      }

      if (currentProfile.role === "student" && currentProfile.department_id) {
        courseQuery = courseQuery.eq("department_id", currentProfile.department_id);
      }

      const { data: courseData, error: courseError } = await courseQuery.order(
        "title",
        { ascending: true }
      );
      if (courseError) throw courseError;
      setCourses(courseData || []);

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("course_id, student_id");
      if (enrollmentError) throw enrollmentError;

      let assessmentQuery = supabase
        .from("assignments")
        .select(
          `
          id,
          title,
          description,
          course_id,
          due_date,
          activity_type,
          created_by,
          courses (id, code, title, doctor_id)
        `
        )
        .in("activity_type", ["Assessment", "Quiz", "Exam", "Online Quiz"]);

      if (currentProfile.role === "student") {
        const myCourseIds = (enrollmentData || [])
          .filter((item) => item.student_id === currentUser.id)
          .map((item) => item.course_id);

        if (myCourseIds.length === 0) {
          setAssessments([]);
          return;
        }

        assessmentQuery = assessmentQuery.in("course_id", myCourseIds);
      }

      if (currentProfile.role === "doctor") {
        const visibleCourseIds = (courseData || []).map((course) => course.id);
        if (visibleCourseIds.length === 0) {
          setAssessments([]);
          return;
        }
        assessmentQuery = assessmentQuery.in("course_id", visibleCourseIds);
      }

      const { data: assessmentData, error: assessmentError } =
        await assessmentQuery.order("due_date", { ascending: true });
      if (assessmentError) throw assessmentError;
      setAssessments(assessmentData || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function getDeadlineStatus(assessment) {
    if (!assessment?.due_date) return "No deadline";
    const dueDate = new Date(assessment.due_date);
    dueDate.setHours(23, 59, 59, 999);
    return new Date() <= dueDate ? "Open" : "Closed";
  }

  return (
    <section className="feature-page">
      <div className="feature-hero">
        <p className="page-label">Curriculum Module</p>
        <h1>Assessment Center</h1>
        <p>
          View quizzes, exams, and assessments for your courses.
        </p>
      </div>

      {error && <div className="feature-card error">{error}</div>}

      <div className="feature-table-wrap">
        <h2>{canManage ? "Course Assessments" : "My Assessments"}</h2>

        {loading ? (
          <p>Loading assessments...</p>
        ) : assessments.length === 0 ? (
          <p>No assessments found.</p>
        ) : (
          <table className="feature-table">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Course</th>
                <th>Type</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td>
                    <strong>{assessment.title}</strong>
                    <p>{assessment.description}</p>
                  </td>
                  <td>
                    {assessment.courses
                      ? `${assessment.courses.code || ""} ${assessment.courses.title}`
                      : "N/A"}
                  </td>
                  <td>{assessment.activity_type || "Assessment"}</td>
                  <td>{assessment.due_date || "N/A"}</td>
                  <td>
                    <span className="status-pill">
                      {getDeadlineStatus(assessment)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {courses.length === 0 && !loading && (
        <div className="feature-card">
          <p>No courses are available for your current role.</p>
        </div>
      )}
    </section>
  );
}

export default AssessmentCenter;
