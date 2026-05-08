import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "../styles/staffDirectory.css";

function StaffDirectory() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        role,
        created_at,
        department_id,
        departments (
          id,
          name
        )
      `
      )
      .eq("role", "doctor")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Staff loading error:", error.message);
      setStaff([]);
    } else {
      setStaff(data || []);
    }

    setLoading(false);
  }

  const filteredStaff = staff.filter((member) => {
    const value = `${member.full_name} ${member.email} ${member.role} ${member.departments?.name || ""}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  return (
    <section className="staff-page">
      <div className="staff-hero glass-card">
        <div>
          <p className="page-label">University Staff</p>
          <h1>Doctors Directory</h1>
          <p>
            View academic staff members and doctors available in the university
            system.
          </p>
        </div>

        <div className="staff-count">
          <strong>{staff.length}</strong>
          <span>Staff Members</span>
        </div>
      </div>

      <div className="staff-toolbar glass-card">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button onClick={loadStaff}>Refresh</button>
      </div>

      {loading ? (
        <div className="glass-card empty-box">Loading staff directory...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="glass-card empty-box">No staff members found.</div>
      ) : (
        <div className="staff-grid">
          {filteredStaff.map((member) => (
            <div className="staff-card glass-card" key={member.id}>
              <div className="staff-avatar">
                {member.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="staff-info">
                <h3>{member.full_name}</h3>
                <p>{member.email}</p>
                <span>Doctor</span>
                <p>{member.departments?.name || "Department not assigned"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default StaffDirectory;
