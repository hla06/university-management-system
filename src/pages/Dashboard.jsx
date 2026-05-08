import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import AdminManage from "./AdminManage";
import "../styles/dashboard.css";

function Dashboard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      setProfile(data);
    }

    loadProfile();
  }, []);

  if (profile?.role === "admin") {
    return <AdminManage />;
  }

  return (
    <div className="dashboard-fullscreen">
      <div className="dashboard-pro">
        <div className="dashboard-glow"></div>

        <section className="dashboard-panel">
          <div className="brand-mark">U</div>

          <p className="eyebrow">University Management System</p>

          <h1>UMS</h1>

          <p className="dashboard-subtitle">
            A centralized academic platform for managing courses,
            announcements, events, communication, classrooms, LMS activities,
            assessments, parent communication, payroll, HR, and campus
            resources.
          </p>

          {profile && (
            <div className="dashboard-user">
              <span>{profile.full_name}</span>
              <small style={{ textTransform: "capitalize" }}>
                {profile.role}
              </small>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
