import { useEffect, useState } from "react";
import { getMyEnrollments } from "../services/courseService";
import { getCurrentUser } from "../services/authService";
import Card from "../components/Card";
import "../styles/listPages.css";

function Enrollment() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEnrollments() {
      const user = await getCurrentUser();
      if (!user) {
        setError("Please login to view enrollments.");
        setLoading(false);
        return;
      }

      const data = await getMyEnrollments(user.id);
      setEnrollments(data);
      setLoading(false);
    }

    loadEnrollments();
  }, []);

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Academic Module</p>
        <h1>My Enrollments</h1>
      </div>

      {error && <div className="empty-state error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading enrollments...</div>
      ) : enrollments.length === 0 ? (
        <div className="empty-state">No enrollments yet.</div>
      ) : (
        <div className="list-grid">
          {enrollments.map((enroll) => (
            <Card key={enroll.id}>
              <span className="badge">
                {enroll.courses?.credits} Credits
              </span>

              <h3>
                {enroll.courses?.code} - {enroll.courses?.title}
              </h3>

              <p>{enroll.courses?.description}</p>

              <p>
                <strong>Professor:</strong>{" "}
                {enroll.courses?.profiles?.full_name || "Not Assigned"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Enrollment;
