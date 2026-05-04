import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ChurchLandingPage from './components/ChurchLandingPage';
import AboutUsPage from './components/AboutUsPage';
import ServicesPage from './components/ServicesPage';
import EventsPage from './components/EventsPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import AdminSchedules from './components/AdminSchedules';
import AdminReports from './components/AdminReports';
import MinistriesPage from './components/MinistriesPage';
import AdminAttendanceList from './components/AdminAttendanceList';

// --- Auth Folder Imports ---
// All these files must be inside src/components/Auth/
import CheckInPage from './components/Auth/CheckInPage'; 
import AdminManageUsers from './components/Auth/AdminManageUsers';
import UpdatePassword from './components/Auth/UpdatePassword';

function App() {
  return (
    <Router>
      <div className="App text-left">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ChurchLandingPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/events" element={<EventsPage />} /> 
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ministries" element={<MinistriesPage />} />
          
          {/* QR Check-In Route (Public access, but requires login inside the component) */}
          <Route path="/check-in/:eventId" element={<CheckInPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/schedules" element={<AdminSchedules />} />
          <Route path="/admin/manage-users" element={<AdminManageUsers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/attendance-list" element={<AdminAttendanceList />} />
          
          {/* Auth Security Route */}
          <Route path="/update-password" element={<UpdatePassword />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;