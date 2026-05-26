import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { leaveApi } from '../api/leaveApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { wsService } from '../services/wsService.js';
import { formatDate } from '../utils/formatDate.js';
import { normalizeList } from '../utils/statusMapper.js';

export default function LeaveHistoryPage() {
  const location = useLocation();
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.success || '');

  function loadLeaves({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    leaveApi.getMyLeaves()
      .then((data) => setItems(normalizeList(data)))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLeaves();
    setSuccess(location.state?.success || '');
  }, [location.key]);

  useEffect(() => {
    const unsub = wsService.on('leave_request_update', (data) => {
      const updated = data.leave || data;
      const id = updated?.id;
      if (!id) return;
      setItems((prev) => {
        const existed = prev.find((l) => l.id === id);
        const newStatus = String(updated.status || '').toUpperCase();
        if (existed && existed.status !== updated.status) {
          if (newStatus === 'APPROVED') showToast('Leave request approved!', 'success');
          else if (newStatus === 'REJECTED') showToast('Leave request rejected.', 'error');
        }
        if (existed) return prev.map((l) => l.id === id ? { ...l, ...updated } : l);
        return [updated, ...prev];
      });
    });
    return unsub;
  }, [showToast]);

  return (
    <>
      <AppHeader
        title="Leave"
        action={(
          <div className="header-actions">
            <button className="icon-button" type="button" onClick={() => loadLeaves()} aria-label="Refresh leave requests">
              <RefreshCw size={20} />
            </button>
            <Link className="icon-button" to="/leave/apply" aria-label="Apply leave"><Plus size={21} /></Link>
          </div>
        )}
      />
      <div className="tab-links">
        <Link to="/leave" className="active">Requests</Link>
        <Link to="/leave/balance">Balance</Link>
      </div>
      {loading ? <LoadingSpinner /> : null}
      {success ? <p className="alert alert--success">{success}</p> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}
      {error ? <AppButton variant="secondary" onClick={loadLeaves}>Retry</AppButton> : null}
      {!loading && !error && !items.length ? <EmptyState title="No leave requests" message="Your leave applications will appear here." /> : null}
      {items.map((item) => (
        <AppCard key={item.id}>
          <div className="card-heading">
            <h2>{item.leave_type || item.type || 'Leave'}</h2>
            {item.status ? <StatusBadge status={String(item.status).toUpperCase()} /> : null}
          </div>
          <div className="detail-row"><span>From</span><strong>{formatDate(item.from_date)}</strong></div>
          <div className="detail-row"><span>To</span><strong>{formatDate(item.to_date)}</strong></div>
          <div className="detail-row"><span>Total days</span><strong>{item.total_days ?? '-'}</strong></div>
          {item.reason ? <p>{item.reason}</p> : null}
        </AppCard>
      ))}
    </>
  );
}
