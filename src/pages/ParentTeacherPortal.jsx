import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getCurrentProfile } from "../services/authService";
import "../styles/featureModules.css";

const emptyRequest = {
  parent: "",
  student_id: "",
  teacher_id: "",
  topic: "",
  priority: "Normal",
};

function ParentTeacherPortal() {
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(emptyRequest);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManage = profile?.role === "doctor" || profile?.role === "admin";

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const currentProfile = await getCurrentProfile();
    setProfile(currentProfile);

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name", { ascending: true });

    const allProfiles = profilesData || [];

    setStudents(allProfiles.filter((p) => p.role === "student"));
    setTeachers(allProfiles.filter((p) => p.role === "doctor"));

    const { data, error } = await supabase
      .from("parent_requests")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getProfileName(id, list) {
    const person = list.find((item) => item.id === id);
    return person?.full_name || person?.email || "";
  }

  async function createRequest(e) {
    e.preventDefault();

    if (!canManage) return;

    const studentName = getProfileName(form.student_id, students);
    const teacherName = getProfileName(form.teacher_id, teachers);

    const { error } = await supabase.from("parent_requests").insert([
      {
        parent: form.parent.trim(),
        student: studentName,
        teacher: teacherName,
        student_id: form.student_id,
        teacher_id: form.teacher_id,
        topic: form.topic.trim(),
        priority: form.priority,
        status: "Needs reply",
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setForm(emptyRequest);
    await loadPage();
  }

  async function scheduleMeeting(id) {
    if (!canManage) return;

    const { error } = await supabase
      .from("parent_requests")
      .update({ status: "Scheduled" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPage();
  }

  return (
    <section className="feature-page">
      <div className="feature-hero">
        <div>
          <p className="feature-label">Family Communication</p>
          <h1>Parent to Teacher Portal</h1>
          <p>
            Parent requests are linked to existing students and doctors from the
            database.
          </p>
        </div>

        <div className="feature-stat">
          <strong>{requests.filter((r) => r.status === "Needs reply").length}</strong>
          <span>Open</span>
        </div>
      </div>

      <div className="feature-grid">
        {canManage && (
          <form className="feature-form" onSubmit={createRequest}>
            <h2>New Parent Request</h2>

            <div className="feature-form-grid">
              <div className="feature-field">
                <label>Parent Name</label>
                <input name="parent" value={form.parent} onChange={handleChange} required />
              </div>

              <div className="feature-field">
                <label>Student</label>
                <select name="student_id" value={form.student_id} onChange={handleChange} required>
                  <option value="">Select existing student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feature-field">
                <label>Teacher / Doctor</label>
                <select name="teacher_id" value={form.teacher_id} onChange={handleChange} required>
                  <option value="">Select existing doctor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feature-field">
                <label>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>

              <div className="feature-field">
                <label>Topic</label>
                <textarea name="topic" value={form.topic} onChange={handleChange} required />
              </div>
            </div>

            <div className="feature-actions">
              <button type="submit">Send Request</button>
            </div>
          </form>
        )}

        <div className="feature-stack">
          {loading ? (
            <article className="feature-card">Loading parent requests...</article>
          ) : requests.length === 0 ? (
            <article className="feature-card">
              <h3>No parent requests yet</h3>
              <p>No requests have been added.</p>
            </article>
          ) : (
            requests.map((request) => (
              <article className="feature-card" key={request.id}>
                <span
                  className={
                    request.priority === "High" || request.priority === "Urgent"
                      ? "status-pill danger"
                      : "status-pill"
                  }
                >
                  {request.priority}
                </span>

                <h3>{request.student}</h3>
                <p>{request.topic}</p>

                <ul className="feature-list">
                  <li>Parent: {request.parent}</li>
                  <li>Teacher: {request.teacher}</li>
                  <li>Status: {request.status}</li>
                </ul>

                {canManage && (
                  <div className="feature-actions">
                    <button onClick={() => scheduleMeeting(request.id)}>
                      Schedule Meeting
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default ParentTeacherPortal;
