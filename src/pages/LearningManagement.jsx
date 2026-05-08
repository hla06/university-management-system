import { useEffect, useState } from "react";
import "../styles/featureModules.css";
import { getCurrentProfile, getCurrentUser } from "../services/authService";
import { supabase } from "../services/supabaseClient";
import { createAssignment } from "../services/assignmentService";

const emptyForm = {
  title: "",
  description: "",
  course_id: "",
  due_date: "",
  activity_type: "Assignment",
  content_format: "Document",
  content_url: "",
};

function LearningManagement() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState({});
  const [gradeForm, setGradeForm] = useState({});
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canManage = profile?.role === "doctor" || profile?.role === "admin";

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const currentProfile = await getCurrentProfile();
      const currentUser = await getCurrentUser();
      setProfile(currentProfile);
      setUser(currentUser);

      if (!currentProfile || !currentUser) {
        setAssignments([]);
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
        .select("id, student_id, course_id");
      if (enrollmentError) throw enrollmentError;
      setEnrollments(enrollmentData || []);

      let assignmentQuery = supabase
        .from("assignments")
        .select(
          `
          id,
          title,
          description,
          course_id,
          due_date,
          activity_type,
          content_format,
          content_url,
          created_by,
          courses (id, code, title)
        `
        )
        .eq("activity_type", "Assignment");

      if (currentProfile.role === "student") {
        const myCourseIds = (enrollmentData || [])
          .filter((item) => item.student_id === currentUser.id)
          .map((item) => item.course_id);

        if (myCourseIds.length === 0) {
          setAssignments([]);
          setSubmissions([]);
          setGrades([]);
          setSelectedAssignment(null);
          return;
        }

        assignmentQuery = assignmentQuery.in("course_id", myCourseIds);
      }

      if (currentProfile.role === "doctor") {
        const visibleCourseIds = (courseData || []).map((course) => course.id);
        if (visibleCourseIds.length === 0) {
          setAssignments([]);
          setSubmissions([]);
          setGrades([]);
          setSelectedAssignment(null);
          return;
        }
        assignmentQuery = assignmentQuery.in("course_id", visibleCourseIds);
      }

      const { data: assignmentData, error: assignmentError } =
        await assignmentQuery.order("due_date", { ascending: true });
      if (assignmentError) throw assignmentError;

      const visibleAssignments = assignmentData || [];
      const visibleAssignmentIds = visibleAssignments.map((item) => item.id);
      setAssignments(visibleAssignments);
      setSelectedAssignment(visibleAssignments[0] || null);

      if (visibleAssignmentIds.length === 0) {
        setSubmissions([]);
        setGrades([]);
        return;
      }

      let submissionsQuery = supabase
        .from("assignment_submissions")
        .select(
          `
          *,
          assignments (*, courses (*)),
          profiles (*)
        `
        )
        .in("assignment_id", visibleAssignmentIds);

      if (currentProfile.role === "student") {
        submissionsQuery = submissionsQuery.eq("student_id", currentUser.id);
      }

      const { data: submissionData, error: submissionError } =
        await submissionsQuery.order("submitted_at", { ascending: false });
      if (submissionError) throw submissionError;
      setSubmissions(submissionData || []);

      let gradesQuery = supabase
        .from("grades")
        .select("id, student_id, assignment_id, grade, feedback")
        .in("assignment_id", visibleAssignmentIds);

      if (currentProfile.role === "student") {
        gradesQuery = gradesQuery.eq("student_id", currentUser.id);
      }

      const { data: gradeData, error: gradeError } = await gradesQuery;
      if (gradeError) throw gradeError;
      setGrades(gradeData || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!canManage || !user) {
      setError("Only doctors and admins can add assignments.");
      return;
    }

    try {
      await createAssignment({
        title: form.title.trim(),
        description: form.description.trim(),
        course_id: Number(form.course_id),
        due_date: form.due_date,
        activity_type: "Assignment",
        content_format: form.content_format,
        content_url: form.content_url.trim() || null,
        created_by: user.id,
      });

      setForm(emptyForm);
      setMessage("Assignment published successfully.");
      await loadPage();
    } catch (createError) {
      setError(createError.message || "Failed to create assignment.");
    }
  }

  function enrolledCount(courseId) {
    return enrollments.filter((item) => Number(item.course_id) === Number(courseId))
      .length;
  }

  function assignmentSubmissions(assignmentId) {
    return submissions.filter(
      (item) => Number(item.assignment_id) === Number(assignmentId)
    );
  }

  function getGradeForSubmission(submission) {
    return grades.find(
      (grade) =>
        Number(grade.assignment_id) === Number(submission.assignment_id) &&
        grade.student_id === submission.student_id
    );
  }

  async function submitAssignment(assignmentId) {
    setError("");
    setMessage("");
    const text = submissionText[assignmentId];

    if (!text?.trim() || !user) {
      setError("Please write your answer before submitting.");
      return;
    }

    try {
      const { error: submitError } = await supabase
        .from("assignment_submissions")
        .insert([
          {
            assignment_id: assignmentId,
            student_id: user.id,
            submission_text: text.trim(),
            status: "Submitted",
            submitted_at: new Date().toISOString(),
          },
        ]);

      if (submitError) throw submitError;
      setSubmissionText({ ...submissionText, [assignmentId]: "" });
      setMessage("Assignment submitted successfully.");
      await loadPage();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit assignment.");
    }
  }

  async function saveGrade() {
    setError("");
    setMessage("");

    if (!gradingSubmission) return;

    if (!gradeForm.grade) {
      setError("Enter a grade first.");
      return;
    }

    try {
      const gradePayload = {
        student_id: gradingSubmission.student_id,
        assignment_id: gradingSubmission.assignment_id,
        grade: Number(gradeForm.grade),
        feedback: gradeForm.feedback || "",
      };

      const existingGrade = getGradeForSubmission(gradingSubmission);

      if (existingGrade) {
        const { error: updateError } = await supabase
          .from("grades")
          .update(gradePayload)
          .eq("id", existingGrade.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("grades")
          .insert([gradePayload]);
        if (insertError) throw insertError;
      }

      await supabase
        .from("assignment_submissions")
        .update({ status: "Graded" })
        .eq("id", gradingSubmission.id);

      setGradingSubmission(null);
      setGradeForm({});
      setMessage("Grade saved successfully.");
      await loadPage();
    } catch (gradeError) {
      setError(gradeError.message || "Failed to save grade.");
    }
  }

  return (
    <section className="feature-page lms-page">
      <div className="feature-hero">
        <p className="page-label">Curriculum Module</p>
        <h1>Assignments / LMS</h1>
        <p>
          Students submit assignments. Doctors review submissions and publish
          grades.
        </p>
      </div>

      {error && <div className="feature-card error">{error}</div>}
      {message && <div className="feature-card success">{message}</div>}

      <div className={`feature-grid lms-grid ${canManage ? "" : "lms-grid-full"}`}>
        {canManage && (
          <form className="feature-card lms-form" onSubmit={handleCreate}>
            <h2>Create Assignment</h2>
            <div className="feature-form-grid">
              <div className="feature-field">
                <label>Title</label>
                <input name="title" value={form.title} onChange={handleChange} required />
              </div>

              <div className="feature-field">
                <label>Course</label>
                <select name="course_id" value={form.course_id} onChange={handleChange} required>
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} - ` : ""}
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feature-field">
                <label>Content Format</label>
                <select name="content_format" value={form.content_format} onChange={handleChange}>
                  <option>Document</option>
                  <option>Video</option>
                  <option>External Link</option>
                  <option>LMS Package</option>
                </select>
              </div>

              <div className="feature-field">
                <label>Content Link</label>
                <input
                  name="content_url"
                  value={form.content_url}
                  onChange={handleChange}
                  placeholder="Optional link"
                />
              </div>

              <div className="feature-field">
                <label>Due Date</label>
                <input name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>

              <div className="feature-field">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} required />
              </div>
            </div>
            <div className="feature-actions">
              <button type="submit">Publish Assignment</button>
            </div>
          </form>
        )}

        <div className="feature-table-wrap lms-table-wrap">
          <h2>{canManage ? "Course Assignments" : "My Assignments"}</h2>
          {loading ? (
            <p>Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p>No assignments found.</p>
          ) : (
            <table className="feature-table lms-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Course</th>
                  <th>Due Date</th>
                  {canManage && <th>Enrolled</th>}
                  {canManage && <th>Submissions</th>}
                  {canManage && <th>Action</th>}
                  <th>Content</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </td>
                    <td>
                      {item.courses
                        ? `${item.courses.code || ""} ${item.courses.title}`
                        : "N/A"}
                    </td>
                    <td>{item.due_date || "N/A"}</td>
                    {canManage && <td>{enrolledCount(item.course_id)}</td>}
                    {canManage && <td>{assignmentSubmissions(item.id).length}</td>}
                    {canManage && (
                      <td>
                        <button onClick={() => setSelectedAssignment(item)}>
                          View Submissions
                        </button>
                      </td>
                    )}
                    <td>
                      {item.content_url ? (
                        <a href={item.content_url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        item.content_format || "Document"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!canManage && assignments.length > 0 && (
        <div className="feature-grid lms-grid-full">
          {assignments.map((assignment) => {
            const mySubmission = submissions.find(
              (item) =>
                Number(item.assignment_id) === Number(assignment.id) &&
                item.student_id === user?.id
            );
            const myGrade = grades.find(
              (item) =>
                Number(item.assignment_id) === Number(assignment.id) &&
                item.student_id === user?.id
            );

            return (
              <article className="feature-card" key={assignment.id}>
                <h3>{assignment.title}</h3>
                <p>{assignment.description}</p>

                {mySubmission ? (
                  <>
                    <span className="status-pill success">Submitted</span>
                    <p>{mySubmission.submission_text}</p>
                  </>
                ) : (
                  <>
                    <textarea
                      value={submissionText[assignment.id] || ""}
                      onChange={(e) =>
                        setSubmissionText({
                          ...submissionText,
                          [assignment.id]: e.target.value,
                        })
                      }
                      placeholder="Write your answer..."
                    />
                    <button onClick={() => submitAssignment(assignment.id)}>
                      Submit Assignment
                    </button>
                  </>
                )}

                {myGrade && (
                  <div>
                    <h4>Grade</h4>
                    <p>{myGrade.grade}</p>
                    <p>{myGrade.feedback}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {canManage && selectedAssignment && (
        <div className="feature-table-wrap">
          <h2>Submissions for {selectedAssignment.title}</h2>

          {assignmentSubmissions(selectedAssignment.id).length === 0 ? (
            <p>No submissions for this assignment.</p>
          ) : (
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignmentSubmissions(selectedAssignment.id).map((submission) => {
                  const grade = getGradeForSubmission(submission);
                  return (
                    <tr key={submission.id}>
                      <td>
                        {submission.profiles?.full_name ||
                          submission.profiles?.email ||
                          submission.student_id}
                      </td>
                      <td>
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : "N/A"}
                      </td>
                      <td>{submission.status || "Submitted"}</td>
                      <td>{grade?.grade || "Not graded"}</td>
                      <td>
                        <button
                          onClick={() => {
                            setGradingSubmission(submission);
                            setGradeForm({
                              grade: grade?.grade || "",
                              feedback: grade?.feedback || "",
                            });
                          }}
                        >
                          View / Grade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {canManage && gradingSubmission && (
        <div className="feature-card">
          <h2>Grade Submission</h2>
          <p>
            Student:{" "}
            {gradingSubmission.profiles?.full_name ||
              gradingSubmission.profiles?.email}
          </p>
          <p>{gradingSubmission.submission_text}</p>

          <div className="feature-form-grid">
            <div className="feature-field">
              <label>Grade</label>
              <input
                type="number"
                value={gradeForm.grade || ""}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, grade: e.target.value })
                }
              />
            </div>
            <div className="feature-field">
              <label>Feedback</label>
              <textarea
                value={gradeForm.feedback || ""}
                onChange={(e) =>
                  setGradeForm({ ...gradeForm, feedback: e.target.value })
                }
              />
            </div>
          </div>

          <button onClick={saveGrade}>Save Grade</button>
          <button type="button" onClick={() => setGradingSubmission(null)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

export default LearningManagement;
