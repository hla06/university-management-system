import { useNavigate } from "react-router-dom";
import "../styles/listPages.css";

function AdminManage() {
  const navigate = useNavigate();

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Admin Panel</p>
        <h1>Admin Management</h1>
        <p>
          Choose what you want to manage. Each button opens the real page where
          you can add, edit, or delete items.
        </p>
      </div>

      <div className="list-grid">
        <div className="info-card">
          <span className="badge">Curriculum</span>
          <h3>Courses</h3>
          <p>Manage course catalog, credits, course type, and professor name.</p>
          <button onClick={() => navigate("/courses")}>Open Courses</button>
        </div>

        <div className="info-card">
          <span className="badge">Community</span>
          <h3>Events</h3>
          <p>Manage university events, dates, descriptions, and locations.</p>
          <button onClick={() => navigate("/events")}>Open Events</button>
        </div>

        <div className="info-card">
          <span className="badge">Community</span>
          <h3>Announcements</h3>
          <p>Manage official announcements shown to students.</p>
          <button onClick={() => navigate("/announcements")}>
            Open Announcements
          </button>
        </div>

        <div className="info-card">
          <span className="badge">Facilities</span>
          <h3>Classrooms</h3>
          <p>Manage classroom schedules, rooms, and course timings.</p>
          <button onClick={() => navigate("/classrooms")}>
            Open Classrooms
          </button>
        </div>

        <div className="info-card">
          <span className="badge">Learning</span>
          <h3>LMS Activities</h3>
          <p>Publish online assignments, quizzes, and multimedia learning items.</p>
          <button onClick={() => navigate("/lms")}>Open LMS</button>
        </div>

        <div className="info-card">
          <span className="badge">Assessment</span>
          <h3>Assignments and Exams</h3>
          <p>Create assessments and move submitted work through grading.</p>
          <button onClick={() => navigate("/assessments")}>
            Open Assessments
          </button>
        </div>

        <div className="info-card">
          <span className="badge">Family</span>
          <h3>Parent Portal</h3>
          <p>Manage parent-to-teacher communication and meeting requests.</p>
          <button onClick={() => navigate("/parent-portal")}>
            Open Parent Portal
          </button>
        </div>

        <div className="info-card">
          <span className="badge">Operations</span>
          <h3>Payroll and HR</h3>
          <p>Track employee records and payroll integration sync status.</p>
          <button onClick={() => navigate("/payroll-hr")}>
            Open Payroll HR
          </button>
        </div>

        <div className="info-card">
          <span className="badge">Assets</span>
          <h3>Resources</h3>
          <p>Allocate equipment, lab assets, and software licenses.</p>
          <button onClick={() => navigate("/resources")}>
            Open Resources
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminManage;
