import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import CourseCatalog from "./pages/CourseCatalog";
import CourseDetails from "./pages/CourseDetails";
import Enrollment from "./pages/Enrollment";
import Announcements from "./pages/Announcements";
import Events from "./pages/Events";
import RoleBasedMessages from "./pages/RoleBasedMessages";
import ClassroomSchedules from "./pages/ClassroomSchedules";
import StudentRecords from "./pages/StudentRecords";
import AdminManage from "./pages/AdminManage";
import StaffDirectory from "./pages/StaffDirectory";
import LearningManagement from "./pages/LearningManagement";
import AssessmentCenter from "./pages/AssessmentCenter";
import ParentTeacherPortal from "./pages/ParentTeacherPortal";
import PayrollHR from "./pages/PayrollHR";
import ResourceAllocation from "./pages/ResourceAllocation";

function App() {
  const allRoles = ["student", "doctor", "admin"];

  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <CourseCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enrollment"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <Enrollment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/announcements"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <Announcements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <Events />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <RoleBasedMessages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/classrooms"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <ClassroomSchedules />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <StaffDirectory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lms"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <LearningManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assessments"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <AssessmentCenter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/parent-portal"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <ParentTeacherPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-record"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentRecords selfOnly />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={["doctor", "admin"]}>
                <StudentRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payroll-hr"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <PayrollHR />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resources"
            element={
              <ProtectedRoute allowedRoles={allRoles}>
                <ResourceAllocation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/manage"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminManage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<h1>Page Not Found</h1>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
