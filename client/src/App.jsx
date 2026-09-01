import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './routes/ProtectedRoute';
import { ROLES } from './constants/roles';
import { useAuthStore } from './store/auth.store';
import { useSettingsStore } from './store/settings.store';
import { ROLE_HOME } from './constants/roles';
import { useSecurityMonitor } from './hooks/useSecurityMonitor';

import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ControlAccessPage from './features/auth/pages/ControlAccessPage';

import PublicLayout from './layouts/PublicLayout';
import StaffLayout from './layouts/StaffLayout';
import AdminLayout from './layouts/AdminLayout';

import PublicDashboard from './pages/public/PublicDashboard';
import ReportEmergency from './pages/public/ReportEmergency';
import MyReports from './pages/public/MyReports';
import ReportDetail from './pages/public/ReportDetail';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffAssignments from './pages/staff/StaffAssignments';
import StaffIncidentOps from './pages/staff/StaffIncidentOps';
import StaffHistory from './pages/staff/StaffHistory';
import AdminDashboard from './pages/admin/AdminDashboard';
import IncidentQueue from './pages/admin/IncidentQueue';
import AdminIncidentDetail from './pages/admin/AdminIncidentDetail';
import ResolutionReview from './pages/admin/ResolutionReview';
import ResolutionDetail from './pages/admin/ResolutionDetail';
import StaffManagement from './pages/admin/StaffManagement';
import UserManagement from './pages/admin/UserManagement';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import AdminBroadcasts from './pages/admin/AdminBroadcasts';
import PublicAlerts from './pages/public/PublicAlerts';
import PublicNotifications from './pages/public/PublicNotifications';
import StaffNotifications from './pages/staff/StaffNotifications';
import PublicSafetyMap from './pages/public/PublicSafetyMap';
import SafePlaces from './pages/public/SafePlaces';
import PublicAiAssistant from './pages/public/PublicAiAssistant';
import PublicWeather from './pages/public/PublicWeather';
import AdminOperationsMap from './pages/admin/AdminOperationsMap';
import AdminShelters from './pages/admin/AdminShelters';
import SmartDispatch from './pages/admin/SmartDispatch';
import ProfilePage from './pages/ProfilePage';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminResources from './pages/admin/AdminResources';
import AdminWeather from './pages/admin/AdminWeather';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function App() {
  useSecurityMonitor();

  // Restore the account's saved preferences (theme, language) whenever a
  // user session becomes available — login or restored session on app open.
  const sessionUser = useAuthStore((s) => s.user);
  const hydrateFromUser = useSettingsStore((s) => s.hydrateFromUser);
  useEffect(() => {
    if (sessionUser) hydrateFromUser(sessionUser);
  }, [sessionUser?.id, sessionUser?.prefs, hydrateFromUser]);

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/control" element={<ControlAccessPage />} />

      {/* Citizen portal */}
      <Route element={<ProtectedRoute roles={[ROLES.PUBLIC]} />}>
        <Route element={<PublicLayout />}>
          <Route path="/public/dashboard" element={<PublicDashboard />} />
          <Route path="/public/report" element={<ReportEmergency />} />
          <Route path="/public/map" element={<PublicSafetyMap />} />
          <Route path="/public/incidents" element={<MyReports />} />
          <Route path="/public/incidents/:id" element={<ReportDetail />} />
          <Route path="/public/assistant" element={<PublicAiAssistant />} />
          <Route path="/public/weather" element={<PublicWeather />} />
          <Route path="/public/alerts" element={<PublicAlerts />} />
          <Route path="/public/safe-places" element={<SafePlaces />} />
          <Route path="/public/notifications" element={<PublicNotifications />} />
          <Route path="/public/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Responder portal */}
      <Route element={<ProtectedRoute roles={[ROLES.STAFF]} />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/incidents" element={<StaffAssignments />} />
          <Route path="/staff/incidents/:id" element={<StaffIncidentOps />} />
          <Route path="/staff/history" element={<StaffHistory />} />
          <Route path="/staff/notifications" element={<StaffNotifications />} />
          <Route path="/staff/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Command center */}
      <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/map" element={<AdminOperationsMap />} />
          <Route path="/admin/incidents" element={<IncidentQueue />} />
          <Route path="/admin/incidents/:id" element={<AdminIncidentDetail />} />
          <Route path="/admin/dispatch" element={<SmartDispatch />} />
          <Route path="/admin/alerts" element={<AdminBroadcasts />} />
          <Route path="/admin/resolutions" element={<ResolutionReview />} />
          <Route path="/admin/resolutions/:id" element={<ResolutionDetail />} />
          <Route path="/admin/staff" element={<StaffManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/departments" element={<DepartmentsPage />} />
          <Route path="/admin/resources" element={<AdminResources />} />
          <Route path="/admin/shelters" element={<AdminShelters />} />
          <Route path="/admin/weather" element={<AdminWeather />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/audit" element={<AdminAuditLogs />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
