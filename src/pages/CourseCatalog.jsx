import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { getCurrentProfile } from "../services/authService";
import { canManageCourse, getCourses } from "../services/courseService";
import "../styles/listPages.css";

function CourseCatalog() {
  const emptyCourse = {
    code: "",
    title: "",
    description: "",
    credits: "",
    type: "",
    doctor_id: "",
    department_id: "",
  };

  const [courses, setCourses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState(emptyCourse);
  const [newCourse, setNewCourse] = useState(emptyCourse);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = profile?.role === "admin";
  const isDoctor = profile?.role === "doctor";

  async function loadCoursesForProfile(currentProfile = profile) {
    if (!currentProfile) return;
    const data = await getCourses(currentProfile);
    setCourses(data);
  }

  async function loadDoctorsAndDepartments() {
    const { data: doctorData, error: doctorError } = await supabase
      .from("profiles")
      .select("id, full_name, department_id")
      .eq("role", "doctor")
      .order("full_name", { ascending: true });

    if (doctorError) {
      setError(doctorError.message);
      setDoctors([]);
    } else {
      setDoctors(doctorData || []);
    }

    const { data: departmentData, error: departmentError } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });

    if (departmentError) {
      setError(departmentError.message);
      setDepartments([]);
    } else {
      setDepartments(departmentData || []);
    }
  }

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      const currentProfile = await getCurrentProfile();
      setProfile(currentProfile);

      if (!currentProfile) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const [courseData] = await Promise.all([
        getCourses(currentProfile),
        loadDoctorsAndDepartments(),
      ]);

      setCourses(courseData);
      setLoading(false);
    }

    const timeoutId = window.setTimeout(() => {
      loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function doctorCanEdit(course) {
    return isDoctor && canManageCourse(profile, course);
  }

  function canEditCourse(course) {
    return isAdmin || doctorCanEdit(course);
  }

  function canDeleteCourse() {
    return isAdmin;
  }

  function startEdit(course) {
    setMessage("");
    setError("");
    setEditingId(course.id);
    setEditData({
      code: course.code || "",
      title: course.title || "",
      description: course.description || "",
      credits: course.credits || "",
      type: course.type || "",
      doctor_id: course.doctor_id || "",
      department_id: course.department_id || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyCourse);
  }

  function validateCourse(course) {
    if (
      !course.code.trim() ||
      !course.title.trim() ||
      !course.description.trim() ||
      !course.type.trim()
    ) {
      return "Please fill all course fields.";
    }

    if (Number(course.credits) <= 0) {
      return "Credits must be greater than 0.";
    }

    return "";
  }

  async function saveEdit() {
    const selectedCourse = courses.find((course) => course.id === editingId);

    if (!canEditCourse(selectedCourse)) {
      setError("You do not have permission to edit this course.");
      return;
    }

    const validationError = validateCourse(editData);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      code: editData.code.trim(),
      title: editData.title.trim(),
      description: editData.description.trim(),
      credits: Number(editData.credits),
      type: editData.type.trim(),
    };

    if (isAdmin) {
      payload.doctor_id = editData.doctor_id || null;
      payload.department_id = editData.department_id || null;
    }

    const { error: updateError } = await supabase
      .from("courses")
      .update(payload)
      .eq("id", editingId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingId(null);
    setEditData(emptyCourse);
    setMessage("Course updated successfully.");
    await loadCoursesForProfile();
  }

  async function addCourse(e) {
    e.preventDefault();

    if (!isAdmin) {
      setError("Only admins can create courses.");
      return;
    }

    const validationError = validateCourse(newCourse);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      code: newCourse.code.trim(),
      title: newCourse.title.trim(),
      description: newCourse.description.trim(),
      credits: Number(newCourse.credits),
      type: newCourse.type.trim(),
      doctor_id: newCourse.doctor_id || null,
      department_id: newCourse.department_id || null,
    };

    const { error: insertError } = await supabase.from("courses").insert([payload]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewCourse(emptyCourse);
    setShowAddForm(false);
    setMessage("Course added successfully.");
    await loadCoursesForProfile();
  }

  async function deleteCourse(courseId) {
    if (!canDeleteCourse()) {
      setError("Only admins can delete courses.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmDelete) return;

    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setEditingId(null);
    setMessage("Course deleted successfully.");
    await loadCoursesForProfile();
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Curriculum Module</p>
        <h1>Course Catalog</h1>
        <p>Browse available university courses.</p>
        {isDoctor && (
          <p>
            Doctors can edit courses assigned to them or their department only.
          </p>
        )}
      </div>

      {error && <div className="empty-state error">{error}</div>}
      {message && <div className="empty-state success">{message}</div>}

      {isAdmin && (
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel Add Course" : "Add Course"}
        </button>
      )}

      {isAdmin && showAddForm && (
        <div className="card">
          <h3>Add New Course</h3>

          <form onSubmit={addCourse}>
            <input
              placeholder="Course code"
              value={newCourse.code}
              onChange={(e) =>
                setNewCourse({ ...newCourse, code: e.target.value })
              }
              required
            />
            <input
              placeholder="Course title"
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse({ ...newCourse, title: e.target.value })
              }
              required
            />
            <input
              placeholder="Description"
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse({ ...newCourse, description: e.target.value })
              }
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Credits"
              value={newCourse.credits}
              onChange={(e) =>
                setNewCourse({ ...newCourse, credits: e.target.value })
              }
              required
            />
            <input
              placeholder="Type"
              value={newCourse.type}
              onChange={(e) =>
                setNewCourse({ ...newCourse, type: e.target.value })
              }
              required
            />
            <select
              value={newCourse.doctor_id}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
                  doctor_id: e.target.value,
                })
              }
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
            <select
              value={newCourse.department_id}
              onChange={(e) =>
                setNewCourse({
                  ...newCourse,
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
            <button type="submit">Save Course</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">No courses available.</div>
      ) : (
        <div className="list-grid">
          {courses.map((course) => (
            <div key={course.id} className="info-card">
              {editingId === course.id ? (
                <>
                  <input
                    value={editData.code}
                    onChange={(e) =>
                      setEditData({ ...editData, code: e.target.value })
                    }
                  />
                  <input
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                  />
                  <input
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        description: e.target.value,
                      })
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    value={editData.credits}
                    onChange={(e) =>
                      setEditData({ ...editData, credits: e.target.value })
                    }
                  />
                  <input
                    value={editData.type}
                    onChange={(e) =>
                      setEditData({ ...editData, type: e.target.value })
                    }
                  />

                  {isAdmin && (
                    <>
                      <select
                        value={editData.doctor_id}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            doctor_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.full_name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editData.department_id}
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
                    </>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={saveEdit}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                    {canDeleteCourse() && (
                      <button
                        style={{ backgroundColor: "#ef4444" }}
                        onClick={() => deleteCourse(course.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="badge">{course.code}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <p>{course.credits} Credits</p>
                  <p>{course.type}</p>
                  <p>
                    Professor: {course.profiles?.full_name || "Not Assigned"}
                  </p>
                  <p>
                    Department: {course.departments?.name || "Not Assigned"}
                  </p>

                  <Link to={`/courses/${course.id}`}>View Details</Link>

                  {canEditCourse(course) && (
                    <div style={{ marginTop: "15px" }}>
                      <button onClick={() => startEdit(course)}>Edit</button>
                    </div>
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

export default CourseCatalog;
