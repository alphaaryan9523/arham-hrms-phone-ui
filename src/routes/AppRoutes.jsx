import { Navigate, Route, Routes } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AnnouncementsPage from '../pages/AnnouncementsPage.jsx';
import AttendanceHistoryPage from '../pages/AttendanceHistoryPage.jsx';
import AttendancePage from '../pages/AttendancePage.jsx';
import ChangePasswordPage from '../pages/ChangePasswordPage.jsx';
import CreateTicketPage from '../pages/CreateTicketPage.jsx';
import EmployeeDashboardPage from '../pages/EmployeeDashboardPage.jsx';
import LeaveApplyPage from '../pages/LeaveApplyPage.jsx';
import LeaveBalancePage from '../pages/LeaveBalancePage.jsx';
import LeaveHistoryPage from '../pages/LeaveHistoryPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PayslipPage from '../pages/PayslipPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import ReimbursementPage from '../pages/ReimbursementPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import ShiftPage from '../pages/ShiftPage.jsx';
import TicketListPage from '../pages/TicketListPage.jsx';

function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<EmployeeDashboardPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance/history" element={<AttendanceHistoryPage />} />
          <Route path="/leave" element={<LeaveHistoryPage />} />
          <Route path="/leave/apply" element={<LeaveApplyPage />} />
          <Route path="/leave/balance" element={<LeaveBalancePage />} />
          <Route path="/shifts" element={<ShiftPage />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/create" element={<CreateTicketPage />} />
          <Route path="/payslips" element={<PayslipPage />} />
          <Route path="/reimbursements" element={<ReimbursementPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
    </Routes>
  );
}
