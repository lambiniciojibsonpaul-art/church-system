import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import ChurchLandingPage from './components/ChurchLandingPage';
import AboutUsPage from './components/AboutUsPage';
import ServicesPage from './components/ServicesPage';
import EventsPage from './components/EventsPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import AdminSchedules from './components/AdminSchedules';
import AdminReports from './components/AdminReports';
import MinistriesPage from './components/MinistriesPage';
import GivePage from './components/GivePage';
import AdminAttendanceList from './components/AdminAttendanceList';
import AdminQRCenter from './components/AdminQRCenter';
import RequirePriest from './components/RequirePriest';
import PriestDashboard from './components/PriestDashboard';
import StaffDashboard from "./components/StaffDashboard";

// --- Auth Folder Imports ---
import CheckInPage from './components/Auth/CheckInPage';
import AdminManageUsers from './components/Auth/AdminManageUsers';
import UpdatePassword from './components/Auth/UpdatePassword';

function App() {
  return (
    <Router>
      <div className="App text-left">
        <Routes>
          {/* All routes share a single persistent Header via <Layout /> */}
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<ChurchLandingPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ministries" element={<MinistriesPage />} />
            <Route path="/give" element={<GivePage />} />
            <Route path="/staff-dashboard" element={<StaffDashboard />} />

            {/* QR Check-In (component handles its own login gate) */}
            <Route path="/check-in/:eventId" element={<CheckInPage />} />

            {/* Admin (gated by RequireAdmin) */}
            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/schedules" element={<RequireAdmin><AdminSchedules /></RequireAdmin>} />
            <Route path="/admin/manage-users" element={<RequireAdmin><AdminManageUsers /></RequireAdmin>} />
            <Route path="/admin/reports" element={<RequireAdmin><AdminReports /></RequireAdmin>} />
            <Route path="/admin/attendance-list" element={<RequireAdmin><AdminAttendanceList /></RequireAdmin>} />
            <Route path="/admin/qr-generator" element={<RequireAdmin><AdminQRCenter /></RequireAdmin>} />

            {/* PRIEST DASHBOARD (gated by RequirePriest) */}
            <Route path="/priest-dashboard" element={<RequirePriest><PriestDashboard /></RequirePriest>} />

            {/* Auth security */}
            <Route path="/update-password" element={<UpdatePassword />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;