import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Clock, FileText, LogOut, Receipt, WalletCards } from 'lucide-react';
import { announcementApi } from '../api/announcementApi.js';
import { attendanceApi } from '../api/attendanceApi.js';
import { employeeApi } from '../api/employeeApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import { leaveApi } from '../api/leaveApi.js';
import { payslipApi } from '../api/payslipApi.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import QuickActionCard from '../components/QuickActionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { wsService } from '../services/wsService.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDate, formatTime, todayLabel } from '../utils/formatDate.js';
import { ATTENDANCE_STATUS, normalizeAttendanceStatus, normalizeList, titleFromStatus } from '../utils/statusMapper.js';

export default function EmployeeDashboardPage() {
  const { user, logout } = useAuth();
  const showToast = useToast();
  const [state, setState] = useState({
    loading: true, error: '', success: '',
    employee: user, today: null, history: [],
    balance: [], leaves: [], payslips: [], announcements: []
  });
  const [clocking, setClocking] = useState(false);

  async function loadDashboard() {
    setState((s) => ({ ...s, loading: true, error: '', success: '' }));
    try {
      const [employee, today, history, balance, leaves, payslips, announcements] = await Promise.allSettled([
        employeeApi.me(),
        attendanceApi.getTodayAttendance(),
        attendanceApi.getMyAttendance(),
        leaveApi.getLeaveBalance(),
        leaveApi.getMyLeaves(),
        payslipApi.getMyPayslips(),
        announcementApi.getAnnouncements()
      ]);
      const firstError = [employee, today, history, balance, leaves, payslips].find((r) => r.status === 'rejected');
      setState({
        loading: false,
        error: firstError ? getApiErrorMessage(firstError.reason) : '',
        success: '',
        employee: employee.status === 'fulfilled' ? employee.value : user,
        today: today.status === 'fulfilled' ? today.value : null,
        history: history.status === 'fulfilled' ? normalizeList(history.value).slice(0, 3) : [],
        balance: balance.status === 'fulfilled' ? normalizeList(balance.value) : [],
        leaves: leaves.status === 'fulfilled' ? normalizeList(leaves.value) : [],
        payslips: payslips.status === 'fulfilled' ? normalizeList(payslips.value) : [],
        announcements: announcements.status === 'fulfilled' ? normalizeList(announcements.value) : []
      });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: getApiErrorMessage(error), employee: s.employee || user }));
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // WebSocket: live attendance update
  useEffect(() => {
    const unsub = wsService.on('attendance_update', (data) => {
      const updated = data.attendance || data;
      setState((s) => ({ ...s, today: { ...s.today, ...updated } }));
    });
    return unsub;
  }, []);

  // WebSocket: new announcement
  useEffect(() => {
    const unsub = wsService.on('announcement_created', (data) => {
      const a = data.announcement || data;
      if (!a?.id) return;
      setState((s) => {
        if (s.announcements.find((x) => x.id === a.id)) return s;
        return { ...s, announcements: [a, ...s.announcements] };
      });
      showToast(`New announcement: ${a.title}`, 'info');
    });
    return unsub;
  }, [showToast]);

  // WebSocket: payslip generated
  useEffect(() => {
    const unsub = wsService.on('payslip_generated', () => {
      showToast('New payslip generated!', 'success');
      payslipApi.getMyPayslips()
        .then((data) => setState((s) => ({ ...s, payslips: normalizeList(data) })))
        .catch(() => {});
    });
    return unsub;
  }, [showToast]);

  async function handleClock() {
    if (clocking) return;
    setClocking(true);
    setState((s) => ({ ...s, error: '', success: '' }));
    try {
      const status = normalizeAttendanceStatus(state.today);
      if (status === ATTENDANCE_STATUS.CLOCKED_IN) {
        await attendanceApi.clockOut();
      } else {
        await attendanceApi.clockIn();
      }
      const refreshed = await attendanceApi.getTodayAttendance();
      setState((s) => ({
        ...s, today: refreshed,
        success: normalizeAttendanceStatus(refreshed) === ATTENDANCE_STATUS.CLOCKED_OUT
          ? 'Clocked out successfully.'
          : 'Clocked in successfully.'
      }));
    } catch (error) {
      setState((s) => ({ ...s, error: getApiErrorMessage(error) }));
    } finally {
      setClocking(false);
    }
  }

  const employee = state.employee || user || {};
  const status = normalizeAttendanceStatus(state.today);
  const pendingLeaves = state.leaves.filter((l) => String(l.status).toUpperCase() === 'PENDING').slice(0, 2);
  const latestPayslip = state.payslips[0];
  const latestAnnouncement = state.announcements[0];

  return (
    <>
      <AppHeader
        title={`Hi, ${employee.first_name || employee.name?.split(' ')[0] || 'Employee'}`}
        subtitle={todayLabel()}
        action={<button className="icon-button" type="button" onClick={logout} aria-label="Logout"><LogOut size={21} /></button>}
      />
      {state.loading ? <LoadingSpinner /> : null}
      {state.error ? <p className="alert alert--error">{state.error}</p> : null}
      {state.error ? <AppButton variant="secondary" onClick={loadDashboard}>Retry</AppButton> : null}
      {state.success ? <p className="alert alert--success">{state.success}</p> : null}

      <AppCard className="profile-summary hero-card">
        <div>
          <strong>{employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'}</strong>
          <span>{employee.employee_code || employee.code || '-'}</span>
        </div>
        <div className="summary-grid">
          <p><span>Branch</span>{employee.branch?.name || employee.branch || '-'}</p>
          <p><span>Designation</span>{employee.designation?.name || employee.designation || '-'}</p>
        </div>
      </AppCard>

      {latestAnnouncement ? (
        <AppCard className="announcement-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Announcement</p>
              <h2>{latestAnnouncement.title}</h2>
            </div>
            <Link to="/announcements" aria-label="All announcements"><Bell size={20} /></Link>
          </div>
          <p className="muted">{latestAnnouncement.message}</p>
        </AppCard>
      ) : null}

      <AppCard className="today-card">
        <div className="card-heading">
          <div><p className="eyebrow">Today</p><h2>{formatDate(new Date())}</h2></div>
          <StatusBadge status={status} />
        </div>
        <div className="time-row">
          <span>In: {formatTime(state.today?.clock_in)}</span>
          <span>Out: {formatTime(state.today?.clock_out)}</span>
        </div>
        <p className="muted">Total hours: {state.today?.total_hours || '-'}</p>
        <AppButton onClick={handleClock} loading={clocking} disabled={status === ATTENDANCE_STATUS.CLOCKED_OUT}>
          {status === ATTENDANCE_STATUS.CLOCKED_IN ? 'Clock Out' : status === ATTENDANCE_STATUS.CLOCKED_OUT ? 'Completed Today' : 'Clock In'}
        </AppButton>
      </AppCard>

      <div className="quick-grid">
        <QuickActionCard to="/attendance/history" icon={Clock} label="History" caption="Attendance" />
        <QuickActionCard to="/leave/balance" icon={WalletCards} label="Balance" caption="Leave" />
        <QuickActionCard to="/reimbursements" icon={Receipt} label="Reimburse" caption="Expenses" />
        <QuickActionCard to="/announcements" icon={Bell} label="Notices" caption="Announcements" />
        <QuickActionCard to="/shifts" icon={CalendarDays} label="Shifts" caption="Schedule" />
        <QuickActionCard to="/payslips" icon={FileText} label="Payslip" caption="Payroll" />
      </div>

      <AppCard>
        <div className="card-heading"><h2>Leave balance</h2><Link to="/leave/balance">View</Link></div>
        {state.balance.length ? state.balance.slice(0, 3).map((item) => (
          <div className="list-row" key={item.id || item.leave_type || item.type}>
            <span>{item.leave_type || item.type}</span>
            <strong>{item.remaining ?? item.balance ?? 0} left</strong>
          </div>
        )) : !state.error ? <EmptyState title="No balance found" /> : null}
      </AppCard>

      <AppCard>
        <div className="card-heading"><h2>Recent attendance</h2><Link to="/attendance/history">View</Link></div>
        {state.history.length ? state.history.map((item) => (
          <div className="list-row" key={item.id || item.date}>
            <span>{formatDate(item.date)}</span>
            <StatusBadge status={titleFromStatus(normalizeAttendanceStatus(item))} />
          </div>
        )) : !state.error ? <EmptyState title="No attendance yet" /> : null}
      </AppCard>

      <AppCard>
        <div className="card-heading"><h2>Pending leave</h2><Link to="/leave">View</Link></div>
        {pendingLeaves.length ? pendingLeaves.map((item) => (
          <div className="list-row" key={item.id}>
            <span>{item.leave_type || item.type}</span><StatusBadge status={item.status} />
          </div>
        )) : !state.error ? <EmptyState title="No pending leave" /> : null}
      </AppCard>

      <AppCard>
        <div className="card-heading"><h2>Latest payslip</h2><Link to="/payslips">View</Link></div>
        {latestPayslip ? (
          <div className="list-row">
            <span>{latestPayslip.month || '-'} {latestPayslip.year || ''}</span>
            <strong>{formatCurrency(latestPayslip.net_salary)}</strong>
          </div>
        ) : !state.error ? <EmptyState title="No payslips available yet." /> : null}
      </AppCard>
    </>
  );
}
