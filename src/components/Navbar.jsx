import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout, getCurrentProfile } from "../services/authService";
import { supabase } from "../services/supabaseClient";

function Navbar() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const data = await getCurrentProfile();
      setProfile(data);
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await logout();
    setProfile(null);
    navigate("/login");
  }

  const isStudent = profile?.role === "student";
  const isDoctor = profile?.role === "doctor";
  const isAdmin = profile?.role === "admin";
  const isAuthenticated = Boolean(profile);

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-icon">U</div>
          <div>
            <h2>UMS</h2>
            <p>University System</p>
          </div>
        </div>

        <nav className="side-links">
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/courses">Courses</NavLink>

              {isStudent && <NavLink to="/enrollment">Enrollment</NavLink>}
              {isStudent && <NavLink to="/my-record">My Record</NavLink>}

              <NavLink to="/announcements">Announcements</NavLink>
              <NavLink to="/events">Events</NavLink>
              <NavLink to="/classrooms">Classrooms</NavLink>
              <NavLink to="/lms">LMS</NavLink>
              <NavLink to="/assessments">Assessments</NavLink>
              <NavLink to="/parent-portal">Parent Portal</NavLink>
              <NavLink to="/staff">Doctors</NavLink>
              <NavLink to="/resources">Resources</NavLink>
              <NavLink to="/messages">Messages</NavLink>

              {(isDoctor || isAdmin) && <NavLink to="/students">Students</NavLink>}

              {isAdmin && <NavLink to="/payroll-hr">Payroll HR</NavLink>}
              {isAdmin && <NavLink to="/admin/manage">Manage</NavLink>}
            </>
          )}

          {!isAuthenticated && <NavLink to="/login">Login</NavLink>}
        </nav>
      </div>

      <div className="sidebar-footer">
        {profile ? (
          <>
            <div className="user-box">
              <strong>{profile.full_name}</strong>
              <span>{profile.role}</span>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <p className="guest-text">Guest mode</p>
        )}
      </div>
    </aside>
  );
}

export default Navbar;
