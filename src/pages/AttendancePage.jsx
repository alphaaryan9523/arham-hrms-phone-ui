import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceApi } from '../api/attendanceApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { wsService } from '../services/wsService.js';
import { formatDate, formatTime } from '../utils/formatDate.js';
import { ATTENDANCE_STATUS, normalizeAttendanceStatus } from '../utils/statusMapper.js';

export default function AttendancePage() {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadToday() {
    setLoading(true);
    setError('');
    await attendanceApi.getTodayAttendance()
      .then((todayAttendance) => {
        setToday(todayAttendance);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    const unsub = wsService.on('attendance_update', (data) => {
      const updated = data.attendance || data;
      setToday((prev) => ({ ...prev, ...updated }));
    });
    return unsub;
  }, []);

  async function handleClock() {
    if (clocking) return;
    setClocking(true);
    setMessage('');
    setError('');
    try {
      if (normalizeAttendanceStatus(today) === ATTENDANCE_STATUS.CLOCKED_IN) {
        await attendanceApi.clockOut();
      } else {
        await attendanceApi.clockIn();
      }
      const updated = await attendanceApi.getTodayAttendance();
      setToday(updated);
      setMessage(normalizeAttendanceStatus(updated) === ATTENDANCE_STATUS.CLOCKED_OUT ? 'Clocked out successfully.' : 'Clocked in successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setClocking(false);
    }
  }

  const status = normalizeAttendanceStatus(today);

  return (
    <>
      <AppHeader title="Attendance" subtitle={formatDate(new Date())} />
      {loading ? <LoadingSpinner /> : null}
      {message ? <p className="alert alert--success">{message}</p> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}
      <AppCard className="attendance-card">
        <StatusBadge status={status} />
        <div className="clock-display">
          <strong>{formatTime(today?.clock_in)}</strong>
          <span>Clock in</span>
        </div>
        <div className="time-row">
          <span>Clock out</span>
          <strong>{formatTime(today?.clock_out)}</strong>
        </div>
        <div className="time-row">
          <span>Total hours</span>
          <strong>{today?.total_hours || '-'}</strong>
        </div>
        <AppButton onClick={handleClock} loading={clocking} disabled={status === ATTENDANCE_STATUS.CLOCKED_OUT}>
          {status === ATTENDANCE_STATUS.CLOCKED_IN ? 'Clock Out' : status === ATTENDANCE_STATUS.CLOCKED_OUT ? 'Attendance Completed' : 'Clock In'}
        </AppButton>
      </AppCard>
      <Link className="text-link-card" to="/attendance/history">View attendance history</Link>
    </>
  );
}
