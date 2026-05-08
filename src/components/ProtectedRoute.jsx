import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentProfile, VALID_ROLES } from "../services/authService";

function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function checkUser() {
      const data = await getCurrentProfile();
      setProfile(data);
      setLoading(false);
    }

    checkUser();
  }, []);

  if (loading) return <p>Loading...</p>;

  if (!profile) {
    return <Navigate to="/login" />;
  }

  if (!VALID_ROLES.includes(profile.role)) {
    return (
      <div className="empty-state">
        HUMAN DATABASE FIX NEEDED: Unsupported role "{profile.role}". Use only
        student, doctor, or admin.
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <h2>Access Denied</h2>;
  }

  return children;
}

export default ProtectedRoute;
