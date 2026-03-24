import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  ReceiptText,
  ShieldAlert,
  Wallet,
  Search,
  Filter,
  UserCircle2,
} from 'lucide-react';
import type {
  AuditLog,
  CreateRequestPayload,
  DashboardPayload,
  MetricsSummary,
  RequestRecord,
  RequestStatus,
} from './types';

const API_BASE = 'http://127.0.0.1:8000';

type Persona = 'Analyst' | 'Reviewer' | 'Admin';
type FormErrors = {
  title?: string;
  business_goal?: string;
  owner?: string;
  model?: string;
};

const initialForm: CreateRequestPayload = {
  title: '',
  business_goal: '',
  model: 'gpt-4o-mini',
  priority: 'medium',
  risk_level: 'medium',
  estimated_cost: 12,
  owner: 'Platform Team',
  latency_ms: 1800,
};

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [form, setForm] = useState<CreateRequestPayload>(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [reviewNote, setReviewNote] = useState('');
  const [reviewActor, setReviewActor] = useState('Reviewer');

  const [persona, setPersona] = useState<Persona>('Analyst');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [dashboardRes, requestsRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/metrics/dashboard`),
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/audit-logs`),
      ]);

      if (!dashboardRes.ok || !requestsRes.ok || !auditRes.ok) {
        throw new Error('Failed to load application data.');
      }

      const dashboardData: DashboardPayload = await dashboardRes.json();
      const requestsData: RequestRecord[] = await requestsRes.json();
      const auditData: AuditLog[] = await auditRes.json();

      setDashboard(dashboardData);
      setRequests(requestsData);
      setAuditLogs(auditData);
      setSelectedRequest((prev) => {
        if (!prev) return requestsData[0] ?? null;
        return requestsData.find((item) => item.id === prev.id) ?? requestsData[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (persona === 'Analyst') {
      setForm((prev) => ({ ...prev, owner: 'Platform Team' }));
      setReviewActor('Reviewer');
    }
    if (persona === 'Reviewer') {
      setReviewActor('Reviewer');
    }
    if (persona === 'Admin') {
      setReviewActor('Admin');
    }
  }, [persona]);

  function validateForm(payload: CreateRequestPayload): FormErrors {
    const errors: FormErrors = {};

    if (payload.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    }

    if (payload.business_goal.trim().length < 10) {
      errors.business_goal = 'Business goal must be at least 10 characters.';
    }

    if (payload.owner.trim().length < 2) {
      errors.owner = 'Owner must be at least 2 characters.';
    }

    if (payload.model.trim().length < 2) {
      errors.model = 'Model must be at least 2 characters.';
    }

    return errors;
  }

  async function createRequest() {
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    const validationErrors = validateForm(form);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError('Please fix the highlighted form fields before submitting.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Failed to create request.');
      }

      setForm(initialForm);
      setFormErrors({});
      setSuccessMessage('Request created successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewRequest(action: 'approve' | 'reject') {
    if (!selectedRequest) return;

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE}/requests/${selectedRequest.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: reviewActor, note: reviewNote }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} request.`);
      }

      setReviewNote('');
      setSuccessMessage(
        action === 'approve'
          ? 'Request approved successfully.'
          : 'Request rejected successfully.',
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request.`);
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesSearch =
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.request_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const pendingRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'pending'),
    [filteredRequests],
  );

  const metrics: MetricsSummary | undefined = dashboard?.metrics;

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div>
          <p className="sidebar-kicker">Project 002</p>
          <h1>AI Operations Control Center</h1>
          <p className="sidebar-copy">
            Internal platform for managing AI requests, review workflows, cost visibility, and operational oversight.
          </p>
        </div>

        <div className="persona-block">
          <div className="persona-header">
            <UserCircle2 size={16} />
            <span>Active Persona</span>
          </div>
          <div className="persona-row">
            <button
              className={`persona-pill ${persona === 'Analyst' ? 'active' : ''}`}
              onClick={() => setPersona('Analyst')}
            >
              Analyst
            </button>
            <button
              className={`persona-pill ${persona === 'Reviewer' ? 'active' : ''}`}
              onClick={() => setPersona('Reviewer')}
            >
              Reviewer
            </button>
            <button
              className={`persona-pill ${persona === 'Admin' ? 'active' : ''}`}
              onClick={() => setPersona('Admin')}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="sidebar-status">
          <span>FastAPI Backend</span>
          <span>React UI</span>
          <span>SQLite State</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations dashboard</p>
            <h2>Govern AI requests with approval flow and audit visibility</h2>
          </div>
          <button className="refresh-button" onClick={() => void loadData()}>
            Refresh data
          </button>
        </header>

        {error && (
          <div className="alert-box error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <section className="metrics-grid">
          <MetricCard icon={<ReceiptText size={18} />} label="Total Requests" value={String(metrics?.total_requests ?? 0)} />
          <MetricCard icon={<Clock3 size={18} />} label="Pending Reviews" value={String(metrics?.pending_reviews ?? 0)} />
          <MetricCard icon={<CheckCircle2 size={18} />} label="Approved" value={String(metrics?.approved_requests ?? 0)} />
          <MetricCard icon={<ShieldAlert size={18} />} label="Rejected" value={String(metrics?.rejected_requests ?? 0)} />
          <MetricCard icon={<Gauge size={18} />} label="Avg Latency" value={`${metrics?.average_latency_ms ?? 0} ms`} />
          <MetricCard icon={<Wallet size={18} />} label="Estimated Cost" value={`$${metrics?.total_estimated_cost ?? 0}`} />
        </section>

        <section className="content-grid">
          <div className="left-column">
            <Panel title="New Request" subtitle="Submit a new internal AI request for review.">
              <div className="form-grid">
                <label>
                  Title
                  <input
                    className={formErrors.title ? 'input-error' : ''}
                    value={form.title}
                    onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, title: value });
                    setFormErrors((prev) => ({ ...prev, title: undefined }));}}
                    placeholder="Proposal Drafting Assistant"
                  />
                  {formErrors.title && <span className="field-error">{formErrors.title}</span>}
                </label>

                <label>
                  Model
                  <input
                    className={formErrors.model ? 'input-error' : ''}
                    value={form.model}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, model: value });
                      setFormErrors((prev) => ({ ...prev, model: undefined }));
                    }}
                    placeholder="gpt-4o-mini"
                  />
                  {formErrors.model && <span className="field-error">{formErrors.model}</span>}
                </label>

                <label className="full-span">
                  Business goal
                  <textarea
                    className={formErrors.business_goal ? 'input-error' : ''}
                    value={form.business_goal}
                    onChange={(e) => {
                       const value = e.target.value;
                       setForm({ ...form, business_goal: value });
                       setFormErrors((prev) => ({ ...prev, business_goal: undefined }));
                      }}
                    placeholder="Accelerate first-draft proposal creation while keeping structure consistent and reviewable."
                  />
                  {formErrors.business_goal && (
                    <span className="field-error">{formErrors.business_goal}</span>
                  )}
                </label>

                <label>
                  Owner
                  <input
                    className={formErrors.owner ? 'input-error' : ''}
                    value={form.owner}
                    onChange={(e) => {
                       const value = e.target.value;
                       setForm({ ...form, owner: value });
                       setFormErrors((prev) => ({ ...prev, owner: undefined }));
}}
                    placeholder="Sales Enablement"
                  />
                  {formErrors.owner && <span className="field-error">{formErrors.owner}</span>}
                </label>

                <label>
                  Estimated cost ($)
                  <input
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) => setForm({ ...form, estimated_cost: Number(e.target.value) })}
                  />
                </label>

                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as CreateRequestPayload['priority'] })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Risk level
                  <select
                    value={form.risk_level}
                    onChange={(e) =>
                      setForm({ ...form, risk_level: e.target.value as CreateRequestPayload['risk_level'] })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Expected latency (ms)
                  <input
                    type="number"
                    value={form.latency_ms ?? 0}
                    onChange={(e) => setForm({ ...form, latency_ms: Number(e.target.value) })}
                  />
                </label>
              </div>

              <button className="primary-button" onClick={() => void createRequest()} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </Panel>

            <Panel title="Review Queue" subtitle="Pending requests that need reviewer action.">
              <div className="filter-toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, owner, or code"
                  />
                </div>

                <div className="status-filter">
                  <Filter size={16} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | RequestStatus)}
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {pendingRequests.length === 0 ? (
                <EmptyState message="No pending review items match the current filters." />
              ) : (
                <div className="queue-list">
                  {pendingRequests.map((request) => (
                    <button
                      key={request.id}
                      className={`queue-item ${selectedRequest?.id === request.id ? 'active' : ''}`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div>
                        <strong>{request.request_code}</strong>
                        <p>{request.title}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="right-column">
            <Panel title="Request Detail" subtitle="Inspect metadata, cost, risk, and reviewer note.">
              {selectedRequest ? (
                <div className="detail-grid">
                  <DetailItem label="Request Code" value={selectedRequest.request_code} />
                  <DetailItem label="Owner" value={selectedRequest.owner} />
                  <DetailItem label="Model" value={selectedRequest.model} />
                  <DetailItem label="Priority" value={selectedRequest.priority} />
                  <DetailItem label="Risk Level" value={selectedRequest.risk_level} />
                  <DetailItem label="Estimated Cost" value={`$${selectedRequest.estimated_cost}`} />
                  <DetailItem label="Latency" value={selectedRequest.latency_ms ? `${selectedRequest.latency_ms} ms` : '—'} />
                  <DetailItem label="Status" value={selectedRequest.status} />
                  <div className="detail-block full-span">
                    <span>Business goal</span>
                    <p>{selectedRequest.business_goal}</p>
                  </div>
                  <div className="detail-block full-span">
                    <span>Review note</span>
                    <p>{selectedRequest.review_note || 'No reviewer note yet.'}</p>
                  </div>
                </div>
              ) : (
                <EmptyState message="Select a request to inspect details." />
              )}
            </Panel>

            <Panel title="Review Actions" subtitle="Approve or reject the currently selected request.">
              <div className="review-form">
                <label>
                  Reviewer
                  <input value={reviewActor} onChange={(e) => setReviewActor(e.target.value)} />
                </label>
                <label>
                  Review note
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add rationale, controls, or next steps."
                  />
                </label>
                <div className="action-row">
                  <button
                    className="success-button"
                    onClick={() => void reviewRequest('approve')}
                    disabled={!selectedRequest}
                  >
                    Approve request
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => void reviewRequest('reject')}
                    disabled={!selectedRequest}
                  >
                    Reject request
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <section className="tables-grid">
          <Panel title="Run History" subtitle="Operational view across all requests.">
            <DataTable
              columns={['Code', 'Title', 'Owner', 'Status', 'Model', 'Cost', 'Latency']}
              rows={filteredRequests.map((request) => [
                request.request_code,
                request.title,
                request.owner,
                request.status,
                request.model,
                `$${request.estimated_cost}`,
                request.latency_ms ? `${request.latency_ms} ms` : '—',
              ])}
            />
          </Panel>

          <Panel title="Audit Log" subtitle="Recent events across request creation and reviewer actions.">
            <DataTable
              columns={['Time', 'Actor', 'Action', 'Request', 'Result']}
              rows={auditLogs.map((log) => [
                new Date(log.timestamp).toLocaleString(),
                log.actor,
                log.action,
                log.request_code,
                log.result,
              ])}
            />
          </Panel>
        </section>

        {loading && (
          <div className="loading-overlay">
            <Activity className="spin" /> Loading operational data...
          </div>
        )}
      </main>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Layers3 size={18} /> <span>{message}</span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-block">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cellIdx) => (
                <td key={`${idx}-${cellIdx}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}