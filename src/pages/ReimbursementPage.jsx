import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { reimbursementApi } from '../api/reimbursementApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import AppInput from '../components/AppInput.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { wsService } from '../services/wsService.js';
import { formatDate } from '../utils/formatDate.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { normalizeList } from '../utils/statusMapper.js';

const CATEGORIES = ['Travel', 'Food', 'Internet', 'Medical', 'Other'];

const EMPTY_FORM = { amount: '', category: 'Travel', description: '', expense_date: '' };

export default function ReimbursementPage() {
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const prevStatuses = useRef({});

  function loadReimbursements({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    reimbursementApi.getMyReimbursements()
      .then((data) => setItems(normalizeList(data)))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReimbursements();
  }, []);

  useEffect(() => {
    const unsub = wsService.on('reimbursement_update', (data) => {
      const updated = data.reimbursement || data;
      const id = updated?.id;
      if (!id) return;
      setItems((prev) => {
        const existed = prev.find((r) => r.id === id);
        const oldStatus = existed?.status;
        const newStatus = updated.status;
        if (existed && oldStatus !== newStatus) {
          if (newStatus === 'APPROVED') showToast('Reimbursement approved!', 'success');
          else if (newStatus === 'REJECTED') showToast('Reimbursement rejected.', 'error');
          else if (newStatus === 'PAID') showToast('Reimbursement paid!', 'success');
        }
        if (existed) return prev.map((r) => r.id === id ? { ...r, ...updated } : r);
        return [updated, ...prev];
      });
    });
    return unsub;
  }, [showToast]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.amount || !form.category || !form.description.trim() || !form.expense_date) {
      setFormError('All fields are required.');
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await reimbursementApi.requestReimbursement({
        amount: Number(form.amount),
        category: form.category,
        description: form.description.trim(),
        expense_date: form.expense_date
      });
      showToast('Reimbursement submitted.', 'success');
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadReimbursements();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Reimbursements"
        action={(
          <div className="header-actions">
            <button className="icon-button" type="button" onClick={() => loadReimbursements()} aria-label="Refresh">
              <RefreshCw size={20} />
            </button>
            <button className="icon-button" type="button" onClick={() => setShowForm((v) => !v)} aria-label="New request">
              <Plus size={21} />
            </button>
          </div>
        )}
      />

      {showForm && (
        <AppCard>
          <div className="card-heading">
            <div><p className="eyebrow">New</p><h2>Reimbursement</h2></div>
          </div>
          <form className="form-stack" onSubmit={handleSubmit}>
            <AppInput
              label="Amount (₹)"
              type="number"
              inputMode="decimal"
              min="1"
              value={form.amount}
              onChange={handleChange('amount')}
              placeholder="1200"
            />
            <label className="field">
              <span>Category</span>
              <select className="input" value={form.category} onChange={handleChange('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Expense date</span>
              <input
                className="input"
                type="date"
                value={form.expense_date}
                onChange={handleChange('expense_date')}
                max={new Date().toISOString().split('T')[0]}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                className="input textarea"
                value={form.description}
                onChange={handleChange('description')}
                placeholder="Brief description of the expense"
                rows={3}
              />
            </label>
            {formError ? <p className="alert alert--error">{formError}</p> : null}
            <div className="button-row">
              <AppButton variant="secondary" type="button" onClick={() => { setShowForm(false); setFormError(''); }}>
                Cancel
              </AppButton>
              <AppButton type="submit" loading={submitting}>Submit</AppButton>
            </div>
          </form>
        </AppCard>
      )}

      {loading ? <LoadingSpinner /> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}
      {error ? <AppButton variant="secondary" onClick={() => loadReimbursements()}>Retry</AppButton> : null}
      {!loading && !error && !items.length ? (
        <EmptyState
          title="No reimbursements yet"
          message="Submit your first expense reimbursement."
          action={<AppButton onClick={() => setShowForm(true)}>New Request</AppButton>}
        />
      ) : null}

      {items.map((item) => (
        <AppCard key={item.id}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">{item.category}</p>
              <h2>{formatCurrency(item.amount)}</h2>
            </div>
            <StatusBadge status={item.status || 'PENDING'} />
          </div>
          <div className="detail-row"><span>Date</span><strong>{formatDate(item.expense_date)}</strong></div>
          <div className="detail-row"><span>Submitted</span><strong>{item.submitted_at || '-'}</strong></div>
          {item.description ? <p className="muted" style={{ marginTop: 8 }}>{item.description}</p> : null}
          {item.rejection_reason ? <p className="alert alert--error" style={{ marginTop: 8 }}>{item.rejection_reason}</p> : null}
        </AppCard>
      ))}
    </>
  );
}
