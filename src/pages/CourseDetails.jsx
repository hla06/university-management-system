import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  canStudentAccessCourse,
  enrollInCourse,
  getCourseById,
  getExistingEnrollment,
} from "../services/courseService";
import { getCurrentUser, getCurrentProfile } from "../services/authService";
import Card from "../components/Card";
import "../styles/listPages.css";

function CourseDetails() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      setMessage("");

      const [courseData, profileData, userData] = await Promise.all([
        getCourseById(id),
        getCurrentProfile(),
        getCurrentUser(),
      ]);

      setProfile(profileData);
      setUser(userData);

      if (!courseData) {
        setError("Course not found.");
        setLoading(false);
        return;
      }

      if (
        profileData?.role === "student" &&
        !canStudentAccessCourse(profileData, courseData)
      ) {
        setError("You can only view courses from your department.");
        setCourse(null);
        setLoading(false);
        return;
      }

      setCourse(courseData);

      if (profileData?.role === "student" && userData) {
        const existing = await getExistingEnrollment(userData.id, courseData.id);
        setEnrolled(Boolean(existing));
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  async function handleEnroll() {
    setError("");
    setMessage("");

    if (!user || !profile) {
      setError("Please login first.");
      return;
    }

    const result = await enrollInCourse(user.id, course?.id, profile);

    if (result.success) {
      setEnrolled(true);
      setMessage(result.message);
      return;
    }

    setError(result.message || "Enrollment failed.");
  }

  if (loading) return <p>Loading course...</p>;

  if (error && !course) {
    return (
      <div className="list-page">
        <div className="empty-state error">{error}</div>
      </div>
    );
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Academic Module</p>
        <h1>Course Details</h1>
      </div>

      {error && <div className="empty-state error">{error}</div>}
      {message && <div className="empty-state success">{message}</div>}

      <div className="list-grid">
        <Card>
          <span className="badge">{course.type}</span>

          <h3>
            {course.code} - {course.title}
          </h3>

          <p>{course.description}</p>

          <p>
            <strong>Credits:</strong> {course.credits}
          </p>

          <p>
            <strong>Professor:</strong>{" "}
            {course.profiles?.full_name || "Not Assigned"}
          </p>

          <p>
            <strong>Department:</strong>{" "}
            {course.departments?.name || "Not Assigned"}
          </p>

          {profile?.role === "student" && (
            <button onClick={handleEnroll} disabled={enrolled}>
              {enrolled ? "Already Enrolled" : "Enroll"}
            </button>
          )}

          {profile?.role === "doctor" && (
            <p>Doctors can view courses but cannot enroll.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default CourseDetails;
