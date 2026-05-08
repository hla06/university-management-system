import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getCurrentProfile, getCurrentUser } from "../services/authService";
import "../styles/listPages.css";

function gradeToPoints(gradeValue) {
  const grade = Number(gradeValue || 0);

  if (grade >= 90) return 4.0;
  if (grade >= 85) return 3.7;
  if (grade >= 80) return 3.3;
  if (grade >= 75) return 3.0;
  if (grade >= 70) return 2.7;
  if (grade >= 65) return 2.3;
  if (grade >= 60) return 2.0;
  if (grade >= 50) return 1.0;
  return 0;
}

function calculateGPA(studentGrades) {
  if (!studentGrades || studentGrades.length === 0) return "N/A";

  const gradesWithCredits = studentGrades
    .map((item) => ({
      points: gradeToPoints(item.grade),
      credits: Number(item.credit_hours || item.courses?.credits || 0),
    }))
    .filter((item) => item.credits > 0);

  if (gradesWithCredits.length > 0) {
    const totalCredits = gradesWithCredits.reduce(
      (sum, item) => sum + item.credits,
      0
    );
    const weightedPoints = gradesWithCredits.reduce(
      (sum, item) => sum + item.points * item.credits,
      0
    );

    return (weightedPoints / totalCredits).toFixed(2);
  }

  // HUMAN DATABASE FIX NEEDED: expose credit_hours or course credits for fully credit-weighted GPA.
  const total = studentGrades.reduce(
    (sum, item) => sum + gradeToPoints(item.grade),
    0
  );

  return (total / studentGrades.length).toFixed(2);
}

function getGradesForStudent(studentId, grades) {
  return (grades || []).filter((grade) => grade.student_id === studentId);
}

function StudentRecords({ selfOnly = false }) {
  const emptyEdit = { level: "", department_id: "" };

  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(emptyEdit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = profile?.role === "doctor" || profile?.role === "admin";

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    const currentProfile = await getCurrentProfile();
    const currentUser = await getCurrentUser();

    setProfile(currentProfile);

    if (!currentProfile || !currentUser) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department_id")
      .eq("role", "student")
      .order("full_name", { ascending: true });

    if (studentsError) {
      setError(studentsError.message);
      setLoading(false);
      return;
    }

    const { data: studentRecords, error: recordsError } = await supabase
      .from("student_records")
      .select(
        `
        *,
        departments (
          id,
          name
        )
      `
      );

    if (recordsError) {
      setError(recordsError.message);
      setLoading(false);
      return;
    }

    const { data: departmentData, error: departmentsError } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    if (departmentsError) {
      setError(departmentsError.message);
      setDepartments([]);
    } else {
      setDepartments(departmentData || []);
    }

    let enrollmentQuery = supabase.from("enrollments").select(`
      id,
      student_id,
      course_id,
      courses (
        id,
        code,
        title,
        doctor_id,
        department_id
      )
    `);

    if (currentProfile.role === "doctor") {
      let allowedCourseQuery = supabase.from("courses").select("id");

      if (currentProfile.department_id) {
        allowedCourseQuery = allowedCourseQuery.or(
          `doctor_id.eq.${currentUser.id},department_id.eq.${currentProfile.department_id}`
        );
      } else {
        allowedCourseQuery = allowedCourseQuery.eq("doctor_id", currentUser.id);
      }

      const { data: allowedCourses, error: coursesError } =
        await allowedCourseQuery;

      if (coursesError) {
        setError(coursesError.message);
        setLoading(false);
        return;
      }

      const allowedCourseIds = (allowedCourses || []).map((course) => course.id);

      if (allowedCourseIds.length === 0) {
        enrollmentQuery = null;
      } else {
        enrollmentQuery = enrollmentQuery.in("course_id", allowedCourseIds);
      }
    }

    let enrollmentData = [];
    if (enrollmentQuery) {
      const { data, error: enrollmentError } = await enrollmentQuery;

      if (enrollmentError) {
        setError(enrollmentError.message);
        setLoading(false);
        return;
      }

      enrollmentData = data || [];
    }

    let { data: gradeData, error: gradesError } = await supabase
      .from("grades")
      .select(
        `
        id,
        grade,
        student_id,
        assignment_id,
        course_id,
        credit_hours,
        assignments (
          id,
          title
        ),
        courses (
          id,
          credits
        )
      `
      );

    if (gradesError) {
      const fallback = await supabase.from("grades").select(`
        id,
        grade,
        student_id,
        assignment_id,
        course_id,
        assignments (
          id,
          title
        ),
        courses (
          id,
          credits
        )
      `);

      gradeData = fallback.data;
      gradesError = fallback.error;
    }

    if (gradesError) {
      setError(gradesError.message);
      setLoading(false);
      return;
    }

    const allowedStudentIds = new Set(
      (enrollmentData || []).map((enrollment) => enrollment.student_id)
    );

    const merged = (students || []).map((student) => {
      const record = (studentRecords || []).find(
        (item) => item.student_id === student.id
      );
      const profileDepartment = (departmentData || []).find(
        (department) => department.id === student.department_id
      );

      return {
        record_id: record?.id || null,
        student_id: student.id,
        full_name: student.full_name,
        email: student.email,
        level: record?.level || "Not Assigned",
        department_id: record?.department_id || student.department_id || "",
        department:
          record?.departments?.name ||
          profileDepartment?.name ||
          record?.department ||
          "Not Assigned",
      };
    });

    let visibleRecords = merged;

    if (selfOnly || currentProfile.role === "student") {
      visibleRecords = merged.filter((item) => item.student_id === currentUser.id);
    } else if (currentProfile.role === "doctor") {
      visibleRecords = merged.filter(
        (item) =>
          item.department_id === currentProfile.department_id ||
          allowedStudentIds.has(item.student_id)
      );
    }

    setEnrollments(enrollmentData || []);
    setGrades(gradeData || []);
    setRecords(visibleRecords);
    setLoading(false);
  }, [selfOnly]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadRecords();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRecords]);

  function startEdit(student) {
    setEditingId(student.student_id);
    setEditData({
      level: student.level === "Not Assigned" ? "" : student.level,
      department_id: student.department_id || "",
    });
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyEdit);
  }

  async function saveEdit(student) {
    if (!canEdit) {
      setError("Only doctors and admins can edit student records.");
      return;
    }

    if (!editData.level || !editData.department_id) {
      setError("Please fill all fields.");
      return;
    }

    const selectedDepartment = departments.find(
      (department) => department.id === editData.department_id
    );

    if (!selectedDepartment) {
      setError("Please select a valid department.");
      return;
    }

    const payload = {
      level: editData.level.trim(),
      department_id: editData.department_id,
      department: selectedDepartment.name,
      full_name: student.full_name,
    };

    if (student.record_id) {
      const { error: updateError } = await supabase
        .from("student_records")
        .update(payload)
        .eq("id", student.record_id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("student_records").insert([
        {
          ...payload,
          student_id: student.student_id,
        },
      ]);

      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setEditingId(null);
    setEditData(emptyEdit);
    setMessage("Student record saved successfully.");
    await loadRecords();
  }

  async function deleteRecord(student) {
    if (!canEdit) {
      setError("Only doctors and admins can delete student records.");
      return;
    }

    if (!student.record_id) {
      setError("This student does not have an academic record yet.");
      return;
    }

    const confirmDelete = window.confirm("Delete this academic record?");
    if (!confirmDelete) return;

    const { error: deleteError } = await supabase
      .from("student_records")
      .delete()
      .eq("id", student.record_id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setEditingId(null);
    setEditData(emptyEdit);
    setMessage("Student record deleted successfully.");
    await loadRecords();
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Academic Module</p>
        <h1>{selfOnly ? "My Academic Record" : "Student Records"}</h1>
        <p>
          Students see only their own academic record. Doctors see students from
          their department or assigned courses. Admins see all records.
        </p>
      </div>

      {error && <div className="empty-state error">{error}</div>}
      {message && <div className="empty-state success">{message}</div>}

      {loading ? (
        <div className="empty-state">Loading student records...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">No student records available.</div>
      ) : (
        <div className="list-grid">
          {records.map((student) => (
            <div key={student.student_id} className="info-card">
              <span className="badge">Student</span>

              {editingId === student.student_id ? (
                <>
                  <h3>{student.full_name}</h3>
                  <p>{student.email}</p>

                  <input
                    placeholder="Level"
                    value={editData.level}
                    onChange={(e) =>
                      setEditData({ ...editData, level: e.target.value })
                    }
                  />

                  <select
                    name="department_id"
                    value={editData.department_id || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        department_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={() => saveEdit(student)}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                    <button
                      style={{ backgroundColor: "#ef4444" }}
                      onClick={() => deleteRecord(student)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3>{student.full_name}</h3>
                  <p>{student.email}</p>

                  <p>
                    <strong>GPA:</strong>{" "}
                    {calculateGPA(getGradesForStudent(student.student_id, grades))}
                  </p>

                  <p>
                    <strong>Level:</strong> {student.level}
                  </p>

                  <p>
                    <strong>Department:</strong> {student.department}
                  </p>
                  <h4>Enrolled Courses</h4>

                  <ul>
                    {(enrollments || [])
                      .filter((course) => course.student_id === student.student_id)
                      .map((course) => (
                        <li key={course.id}>
                          {course.courses?.code || "Course"} -{" "}
                          {course.courses?.title || "Unnamed"}
                        </li>
                      ))}
                  </ul>

                  <h4>Grades</h4>

                  <ul>
                    {(grades || [])
                      .filter((grade) => grade.student_id === student.student_id)
                      .map((grade) => (
                        <li key={grade.id}>
                          {grade.assignments?.title || "Assignment"}:{" "}
                          {grade.grade}
                        </li>
                      ))}
                  </ul>

                  {canEdit && (
                    <button onClick={() => startEdit(student)}>Edit</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentRecords;
