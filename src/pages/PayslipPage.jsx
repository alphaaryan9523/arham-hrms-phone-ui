import { useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, Send } from 'lucide-react';
import { payslipApi } from '../api/payslipApi.js';
import { getApiErrorMessage } from '../api/axiosClient.js';
import AppButton from '../components/AppButton.jsx';
import AppCard from '../components/AppCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { wsService } from '../services/wsService.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDate } from '../utils/formatDate.js';
import { downloadPayslipPdf, getPdfErrorMessage, viewPayslipPdf } from '../utils/pdfDownload.js';
import { normalizeList } from '../utils/statusMapper.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getYearOptions() {
  const year = new Date().getFullYear();
  return [year + 1, year, year - 1, year - 2];
}

export default function PayslipPage() {
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeAction, setActiveAction] = useState({ id: null, type: '' });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    reason: ''
  });
  const [requesting, setRequesting] = useState(false);

  function loadPayslips() {
    setLoading(true);
    setError('');
    setMessage('');
    Promise.allSettled([
      payslipApi.getMyPayslips(),
      payslipApi.getMyPayslipRequests()
    ])
      .then(([payslipResult, requestResult]) => {
        if (payslipResult.status === 'rejected') {
          throw payslipResult.reason;
        }

        const payslipData = payslipResult.value;
        setItems(normalizeList(payslipData));

        const inlineRequests = normalizeList(payslipData?.requests || []);
        const requestData = requestResult.status === 'fulfilled' ? normalizeList(requestResult.value) : [];
        setRequests(requestData.length ? requestData : inlineRequests);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayslips();
  }, []);

  useEffect(() => {
    const unsub = wsService.on('payslip_generated', () => {
      showToast('New payslip generated!', 'success');
      loadPayslips();
    });
    return unsub;
  }, [showToast]);

  async function handleViewPdf(payslip) {
    setActiveAction({ id: payslip.id, type: 'view' });
    setError('');
    setMessage('');
    try {
      await viewPayslipPdf(payslip);
    } catch (err) {
      setError(await getPdfErrorMessage(err));
    } finally {
      setActiveAction({ id: null, type: '' });
    }
  }

  async function handleDownloadPdf(payslip) {
    setActiveAction({ id: payslip.id, type: 'download' });
    setError('');
    setMessage('');
    try {
      const fileName = await downloadPayslipPdf(payslip);
      setMessage(`Downloaded ${fileName}`);
    } catch (err) {
      setError(await getPdfErrorMessage(err));
    } finally {
      setActiveAction({ id: null, type: '' });
    }
  }

  async function handleRequestPayslip(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!requestForm.month || !requestForm.year || !requestForm.reason.trim()) {
      setError('Please select month, year, and enter a reason.');
      return;
    }

    setRequesting(true);
    try {
      await payslipApi.requestPayslip({
        month: requestForm.month,
        year: Number(requestForm.year),
        reason: requestForm.reason.trim()
      });
      setMessage('Payslip request submitted successfully.');
      setShowRequestForm(false);
      setRequestForm((next) => ({ ...next, reason: '' }));
      await loadPayslips();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <>
      <AppHeader
        title="Payslips"
        back
        action={(
          <button className="icon-button" type="button" onClick={loadPayslips} aria-label="Refresh payslips">
            <RefreshCw size={20} />
          </button>
        )}
      />
      {loading ? <LoadingSpinner /> : null}
      {message ? <p className="alert alert--success">{message}</p> : null}
      {error ? <p className="alert alert--error">{error}</p> : null}
      {error ? <AppButton variant="secondary" onClick={loadPayslips}>Retry</AppButton> : null}
      {!loading && !error && !items.length ? (
        <EmptyState
          title="No payslips generated yet"
          message="Your payslip will appear here once HR generates it."
          action={<AppButton onClick={() => setShowRequestForm(true)}>Request Payslip</AppButton>}
        />
      ) : null}

      {showRequestForm ? (
        <AppCard>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Request</p>
              <h2>Payslip</h2>
            </div>
          </div>
          <form className="form-stack" onSubmit={handleRequestPayslip}>
            <label className="field">
              <span>Month</span>
              <select className="input" value={requestForm.month} onChange={(event) => setRequestForm((next) => ({ ...next, month: event.target.value }))}>
                {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Year</span>
              <select className="input" value={requestForm.year} onChange={(event) => setRequestForm((next) => ({ ...next, year: event.target.value }))}>
                {getYearOptions().map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Reason</span>
              <textarea
                className="input textarea"
                value={requestForm.reason}
                placeholder={`Please generate my payslip for ${requestForm.month} ${requestForm.year}`}
                onChange={(event) => setRequestForm((next) => ({ ...next, reason: event.target.value }))}
                required
              />
            </label>
            <div className="button-row">
              <AppButton variant="secondary" onClick={() => setShowRequestForm(false)}>Cancel</AppButton>
              <AppButton type="submit" loading={requesting}><Send size={18} /> Submit</AppButton>
            </div>
          </form>
        </AppCard>
      ) : null}

      {items.map((item) => (
        <AppCard key={item.id || `${item.month}-${item.year}`}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">{item.month || item.pay_month || 'Month'}</p>
              <h2>{item.year || item.pay_year || '-'}</h2>
              {item.employee_code ? <p className="muted">{item.employee_code}</p> : null}
            </div>
            <StatusBadge status={item.status || 'processed'} />
          </div>
          <div className="salary-grid">
            <p><span>Basic salary</span><strong>{formatCurrency(item.basic_salary || item.gross_salary)}</strong></p>
            <p><span>Gross earnings</span><strong>{formatCurrency(item.gross_salary || item.earnings)}</strong></p>
            <p><span>PF</span><strong>{formatCurrency(item.pf)}</strong></p>
            <p><span>Gratuity</span><strong>{formatCurrency(item.gratuity)}</strong></p>
            <p><span>Total deductions</span><strong>{formatCurrency(item.total_deductions || item.deductions)}</strong></p>
            <p><span>Net salary</span><strong>{formatCurrency(item.net_salary)}</strong></p>
            <p><span>Generated</span><strong>{formatDate(item.generated_date)}</strong></p>
          </div>
          <div className="button-row">
            <AppButton
              variant="secondary"
              onClick={() => handleViewPdf(item)}
              loading={activeAction.id === item.id && activeAction.type === 'view'}
              disabled={Boolean(activeAction.id)}
            >
              <Eye size={18} /> View PDF
            </AppButton>
            <AppButton
              onClick={() => handleDownloadPdf(item)}
              loading={activeAction.id === item.id && activeAction.type === 'download'}
              disabled={Boolean(activeAction.id)}
            >
              <Download size={18} /> Download PDF
            </AppButton>
          </div>
        </AppCard>
      ))}

      {!loading && requests.length ? (
        <AppCard>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Requests</p>
              <h2>Payslip status</h2>
            </div>
            <button className="icon-button" type="button" onClick={loadPayslips} aria-label="Refresh payslip requests">
              <RefreshCw size={20} />
            </button>
          </div>
          {requests.map((request) => (
            <div className="request-card" key={request.id || `${request.month}-${request.year}-${request.status}`}>
              <div className="card-heading">
                <div>
                  <h2>{request.month || '-'} {request.year || ''}</h2>
                  {request.reason ? <p className="muted">{request.reason}</p> : null}
                </div>
                <StatusBadge status={request.status || 'PENDING'} />
              </div>
              {request.rejection_reason ? (
                <p className="alert alert--error">{request.rejection_reason}</p>
              ) : null}
            </div>
          ))}
        </AppCard>
      ) : null}
    </>
  );
}
