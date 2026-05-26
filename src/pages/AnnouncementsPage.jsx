import { useEffect, useState } from 'react';
import { announcementApi } from '../api/announcementApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { wsService } from '../services/wsService.js';
import { normalizeList } from '../utils/statusMapper.js';

export default function AnnouncementsPage() {
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadAnnouncements({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    announcementApi.getAnnouncements()
      .then((data) => setItems(normalizeList(data)))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    const unsub = wsService.on('announcement_created', (data) => {
      const announcement = data.announcement || data;
      if (!announcement?.id) return;
      setItems((prev) => {
        if (prev.find((a) => a.id === announcement.id)) return prev;
        return [announcement, ...prev];
      });
      showToast(`New announcement: ${announcement.title}`, 'info');
    });
    return unsub;
  }, [showToast]);

  return (
    <>
      <AppHeader title="Announcements" back />
      {loading ? <LoadingSpinner /> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}
      {error ? <AppButton variant="secondary" onClick={() => loadAnnouncements()}>Retry</AppButton> : null}
      {!loading && !error && !items.length ? (
        <EmptyState title="No announcements" message="Company announcements will appear here." />
      ) : null}
      {items.map((item) => (
        <AppCard key={item.id} className="announcement-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">
                {item.audience === 'ALL' ? 'Everyone' : item.branch || item.audience || 'Notice'}
              </p>
              <h2>{item.title}</h2>
            </div>
            <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{item.published_at || ''}</span>
          </div>
          <p className="muted">{item.message}</p>
        </AppCard>
      ))}
    </>
  );
}
