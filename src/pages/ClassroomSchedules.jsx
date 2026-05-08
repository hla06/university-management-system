import { useCallback, useEffect, useState } from "react";
import {
  addClassroomSchedule,
  deleteClassroomSchedule,
  getClassroomLabel,
  getClassrooms,
  getClassroomSchedules,
  hasClassroomScheduleIdColumns,
  hasScheduleConflict,
  updateClassroomSchedule,
} from "../services/classroomService";
import { getCurrentProfile, getCurrentUser } from "../services/authService";
import { getCourses, getMyEnrollments } from "../services/courseService";
import "../styles/classrooms.css";

const emptyForm = {
  day: "",
  classroom_id: "",
  room_name: "",
  course_id: "",
  course_name: "",
  start_time: "",
  end_time: "",
};

function ClassroomSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dbNotes, setDbNotes] = useState([]);
  const [usesScheduleIds, setUsesScheduleIds] = useState(false);

  const canManage = profile?.role === "doctor" || profile?.role === "admin";
  const isStudent = profile?.role === "student";

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    const currentProfile = await getCurrentProfile();
    const user = await getCurrentUser();
    const nextNotes = [];

    setProfile(currentProfile);

    if (!currentProfile || !user) {
      setCourses([]);
      setClassrooms([]);
      setSchedules([]);
      setLoading(false);
      return;
    }

    const idColumnSupport = await hasClassroomScheduleIdColumns();
    setUsesScheduleIds(idColumnSupport);

    if (!idColumnSupport) {
      nextNotes.push(
        "HUMAN DATABASE FIX NEEDED: classroom_schedules must include course_id and classroom_id."
      );
    }

    const [courseData, classroomData] = await Promise.all([
      getCourses(currentProfile),
      getClassrooms(),
    ]);

    if (classroomData.length === 0) {
      nextNotes.push(
        "HUMAN DATABASE FIX NEEDED: add/verify classrooms table with id and display name columns."
      );
    }

    setCourses(courseData);
    setClassrooms(classroomData);
    setDbNotes(nextNotes);

    if (currentProfile.role === "student") {
      const enrollments = await getMyEnrollments(user.id);
      const courseIds = enrollments.map((item) => item.course_id).filter(Boolean);
      const courseNames = enrollments
        .map((item) => item.courses?.title)
        .filter(Boolean);

      if (
        (idColumnSupport && courseIds.length === 0) ||
        (!idColumnSupport && courseNames.length === 0)
      ) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const data = await getClassroomSchedules(
        idColumnSupport ? { courseIds } : { courseNames }
      );
      setSchedules(data);
      setLoading(false);
      return;
    }

    if (currentProfile.role === "doctor") {
      const courseIds = courseData.map((course) => course.id).filter(Boolean);
      const courseNames = courseData.map((course) => course.title).filter(Boolean);

      if (
        (idColumnSupport && courseIds.length === 0) ||
        (!idColumnSupport && courseNames.length === 0)
      ) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const data = await getClassroomSchedules(
        idColumnSupport ? { courseIds } : { courseNames }
      );
      setSchedules(data);
      setLoading(false);
      return;
    }

    const data = await getClassroomSchedules();
    setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPage]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function timeToMinutes(time) {
    if (!time) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function getCourseTitle(schedule) {
    const course = courses.find(
      (item) => Number(item.id) === Number(schedule.course_id)
    );
    return course?.title || schedule.course_name || "Unassigned course";
  }

  function getRoomName(schedule) {
    const classroom = classrooms.find(
      (item) => Number(item.id) === Number(schedule.classroom_id)
    );
    return getClassroomLabel(classroom) || schedule.room_name || "Unassigned room";
  }

  function handleEdit(schedule) {
    const matchedCourse = courses.find(
      (course) =>
        Number(course.id) === Number(schedule.course_id) ||
        course.title === schedule.course_name
    );
    const matchedClassroom = classrooms.find(
      (classroom) =>
        Number(classroom.id) === Number(schedule.classroom_id) ||
        getClassroomLabel(classroom) === schedule.room_name
    );

    setEditingId(schedule.id);
    setForm({
      day: schedule.day || "",
      classroom_id: matchedClassroom?.id || schedule.classroom_id || "",
      room_name: schedule.room_name || "",
      course_id: matchedCourse?.id || schedule.course_id || "",
      course_name: schedule.course_name || "",
      start_time: schedule.start_time || "",
      end_time: schedule.end_time || "",
    });
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function validateForm() {
    if (!form.day || !form.start_time || !form.end_time) {
      return "Please fill day, start time, and end time.";
    }

    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      return "End time must be after start time.";
    }

    if (!form.course_id) {
      return "Please select a valid course.";
    }

    if (usesScheduleIds) {
      if (classrooms.length > 0 && !form.classroom_id) {
        return "Please select a classroom.";
      }
      if (classrooms.length === 0 && !form.room_name.trim()) {
        return "Please enter a classroom name.";
      }
    } else {
      if (!form.room_name.trim()) {
        return "Please enter a classroom or hall name.";
      }
    }

    return "";
  }

  function buildPayload() {
    const selectedCourse = courses.find(
      (course) => Number(course.id) === Number(form.course_id)
    );
    const selectedClassroom = classrooms.find(
      (classroom) => Number(classroom.id) === Number(form.classroom_id)
    );
    const roomName =
      getClassroomLabel(selectedClassroom) || form.room_name.trim();
    const courseName = selectedCourse?.title || form.course_name.trim();

    if (usesScheduleIds) {
      const payload = {
        day: form.day,
        course_id: Number(form.course_id),
        room_name: roomName,
        course_name: courseName,
        start_time: form.start_time,
        end_time: form.end_time,
      };

      if (form.classroom_id) {
        payload.classroom_id = Number(form.classroom_id);
      }

      return payload;
    }

    return {
      day: form.day,
      room_name: roomName,
      course_name: courseName,
      start_time: form.start_time,
      end_time: form.end_time,
      selectedClassroom,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!canManage) {
      setError("Only doctors and admins can manage classroom schedules.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload();
    delete payload.selectedClassroom;

    try {
      setSaving(true);

      const conflict = await hasScheduleConflict(
        payload,
        editingId,
        usesScheduleIds && Boolean(payload.classroom_id)
      );

      if (conflict) {
        setError(
          `This classroom is not available. Conflict with ${getCourseTitle(
            conflict
          )} in ${getRoomName(conflict)} on ${conflict.day} from ${
            conflict.start_time
          } to ${conflict.end_time}.`
        );
        return;
      }

      if (editingId) {
        await updateClassroomSchedule(editingId, payload);
        setMessage("Schedule updated successfully.");
      } else {
        await addClassroomSchedule(payload);
        setMessage("Schedule added successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadPage();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!canManage) {
      setError("Only doctors and admins can delete classroom schedules.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this classroom schedule?"
    );

    if (!confirmDelete) return;

    try {
      await deleteClassroomSchedule(id);
      setForm(emptyForm);
      setEditingId(null);
      setMessage("Schedule deleted successfully.");
      await loadPage();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <section className="classrooms-page">
      <div className="classrooms-hero glass-card">
        <div>
          <p className="page-label">Facilities Module</p>
          <h1>Classroom Schedules</h1>

          {isStudent ? (
            <p>Showing classroom schedules for your enrolled courses only.</p>
          ) : canManage ? (
            <p>
              Manage room bookings, course schedules, and classroom
              availability.
            </p>
          ) : (
            <p>Please login to view classroom schedules.</p>
          )}
        </div>

        <div className="hero-stat">
          <strong>{schedules.length}</strong>
          <span>Bookings</span>
        </div>
      </div>

      {dbNotes.map((note) => (
        <div className="glass-card empty-box" key={note}>
          {note}
        </div>
      ))}

      {error && <div className="glass-card empty-box error">{error}</div>}
      {message && <div className="glass-card empty-box success">{message}</div>}

      {canManage && (
        <form className="classroom-form glass-card" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit Schedule" : "Add Classroom Booking"}</h2>

          <div className="form-grid">
            <div className="field-group">
              <label>Day</label>
              <input
                name="day"
                value={form.day}
                onChange={handleChange}
                placeholder="Sunday"
              />
            </div>

            <div className="field-group">
              <label>Room</label>
              {usesScheduleIds ? (
                classrooms.length > 0 ? (
                  <select
                    name="classroom_id"
                    value={form.classroom_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select classroom</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {getClassroomLabel(classroom)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-xs)' }}>
                      No classrooms found. Please add classrooms first in Supabase.
                    </p>
                    <input
                      name="room_name"
                      value={form.room_name}
                      onChange={handleChange}
                      placeholder="No classroom dropdown found"
                      required
                    />
                  </div>
                )
              ) : (
                <input
                  name="room_name"
                  value={form.room_name}
                  onChange={handleChange}
                  placeholder="Hall A"
                  required
                />
              )}
            </div>

            <div className="field-group">
              <label>Course</label>
              <select
                name="course_id"
                value={form.course_id}
                onChange={handleChange}
              >
                <option value="">Select available course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code ? `${course.code} - ` : ""}
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>From</label>
              <input
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
              />
            </div>

            <div className="field-group">
              <label>To</label>
              <input
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Checking..."
                : editingId
                ? "Update Schedule"
                : "Add Schedule"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <div className="glass-card empty-box">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="glass-card empty-box">
          No classroom schedules available.
        </div>
      ) : (
        <div className="classroom-grid">
          {schedules.map((schedule) => (
            <div className="classroom-card glass-card" key={schedule.id}>
              <div className="card-top">
                <span>{schedule.day}</span>
                <strong>{getRoomName(schedule)}</strong>
              </div>

              <h3>{getCourseTitle(schedule)}</h3>

              <div className="time-box">
                <div>
                  <small>From</small>
                  <strong>{schedule.start_time}</strong>
                </div>

                <div>
                  <small>To</small>
                  <strong>{schedule.end_time}</strong>
                </div>
              </div>

              <p className="availability">Room booked for this course</p>

              {canManage && (
                <div className="card-actions">
                  <button onClick={() => handleEdit(schedule)}>Edit</button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ClassroomSchedules;
