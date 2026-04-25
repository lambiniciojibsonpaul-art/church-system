import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ChurchLandingPage from './components/ChurchLandingPage';
import AboutUsPage from './components/AboutUsPage';
import ServicesPage from './components/ServicesPage';
import EventsPage from './components/EventsPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import AdminSchedules from './components/AdminSchedules';

// --- New Auth Imports ---
import AdminManageUsers from './components/Auth/AdminManageUsers';
import UpdatePassword from './components/Auth/UpdatePassword';

function App() {
  return (
    <Router>
      <div className="App text-left">
        <Routes>
          <Route path="/" element={<ChurchLandingPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/events" element={<EventsPage />} /> 
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/schedules" element={<AdminSchedules />} />
          <Route path="/admin/manage-users" element={<AdminManageUsers />} />
          
          {/* Auth Security Route */}
          <Route path="/update-password" element={<UpdatePassword />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;