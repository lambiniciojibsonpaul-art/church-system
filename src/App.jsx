import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';

import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import { useAuth } from './contexts/useAuth';
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
import ManageUsers from './components/ManageUsers';
import UserProfile from './components/UserProfile';
import AnnouncementsPage from './components/AnnouncementsPage';
import AnnouncementsInbox from './components/AnnouncementsInbox';

// --- Auth Folder Imports ---
import CheckInPage from './components/Auth/CheckInPage';
import UpdatePassword from './components/Auth/UpdatePassword';

// ✨ NEW COMPONENT: The invisible background listener
function GlobalNotificationListener() {
  const { user } = useAuth();

  useEffect(() => {
    // If no one is logged in, don't listen for notifications
    if (!user?.id) return; 

    // Tell Supabase to listen for NEW inserts to the notifications table
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`, // ONLY listen to notifications meant for THIS user
        },
        (payload) => {
          // When a new row is detected, pop up a beautiful toast!
          const newNotif = payload.new;
          
          toast.success(
            <div className="flex flex-col gap-1">
              <strong className="text-sm font-serif text-gray-800">{newNotif.title}</strong>
              <p className="text-xs text-gray-600 m-0">{newNotif.message}</p>
            </div>,
            { 
              duration: 6000, 
              position: 'top-right',
              style: {
                borderRadius: '1rem',
                border: '1px solid #F3F4F6',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                background: '#fff',
                padding: '16px',
              }
            }
          );
        }
      )
      .subscribe();

    // Cleanup function when user logs out or leaves
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null; // This component renders nothing visually
}


// Redirects admins/priests/staff to their dashboard on first load at "/"
function HomeRoute() {
  const { role, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );
  if (role === "admin" || role === "superadmin") return <Navigate to="/admin" replace />;
  if (role === "priest")  return <Navigate to="/priest-dashboard" replace />;
  if (role === "staff")   return <Navigate to="/staff-dashboard" replace />;
  return <ChurchLandingPage />;
}

function App() {
  return (
    <Router>
      {/* ✨ NEW: Add the Toaster component at the very top of the app */}
      <Toaster />
      {/* ✨ NEW: Add the Listener so it runs continuously */}
      <GlobalNotificationListener />
      
      <div className="App text-left">
        <Routes>
          {/* All routes share a single persistent Header via <Layout /> */}
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ministries" element={<MinistriesPage />} />
            <Route path="/give" element={<GivePage />} />
            
            {/* Announcements inbox — all authenticated users */}
            <Route path="/announcements" element={<AnnouncementsInbox />} />

            {/* Staff */}
            <Route path="/staff-dashboard" element={<StaffDashboard />} />

            {/* QR Check-In (component handles its own login gate) */}
            <Route path="/check-in/:eventId" element={<CheckInPage />} />

            {/* Admin (gated by RequireAdmin) */}
            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/schedules" element={<RequireAdmin><AdminSchedules /></RequireAdmin>} />
            <Route path="/admin/reports" element={<RequireAdmin><AdminReports /></RequireAdmin>} />
            <Route path="/admin/attendance-list" element={<RequireAdmin><AdminAttendanceList /></RequireAdmin>} />
            <Route path="/admin/qr-generator" element={<RequireAdmin><AdminQRCenter /></RequireAdmin>} />
            <Route path="/admin/announcements" element={<RequireAdmin><AnnouncementsPage /></RequireAdmin>} />
            
            {/* Manage Users */}
            <Route path="/admin/manage-users" element={<RequireAdmin><ManageUsers /></RequireAdmin>} />

            {/* PRIEST DASHBOARD (gated by RequirePriest) */}
            <Route path="/priest-dashboard" element={<RequirePriest><PriestDashboard /></RequirePriest>} />

            {/* Profile (all authenticated roles) */}
            <Route path="/profile" element={<UserProfile />} />

            {/* Auth security */}
            <Route path="/update-password" element={<UpdatePassword />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;