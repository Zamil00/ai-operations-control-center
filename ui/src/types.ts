export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type RequestRecord = {
  id: number;
  request_code: string;
  title: string;
  business_goal: string;
  model: string;
  priority: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  estimated_cost: number;
  owner: string;
  status: RequestStatus;
  review_note?: string | null;
  latency_ms?: number | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: number;
  actor: string;
  action: string;
  request_code: string;
  result: string;
  details?: string | null;
  timestamp: string;
};

export type MetricsSummary = {
  total_requests: number;
  pending_reviews: number;
  approved_requests: number;
  rejected_requests: number;
  average_latency_ms: number;
  total_estimated_cost: number;
};

export type DashboardPayload = {
  metrics: MetricsSummary;
  recent_requests: RequestRecord[];
  recent_audit_logs: AuditLog[];
};

export type CreateRequestPayload = {
  title: string;
  business_goal: string;
  model: string;
  priority: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  estimated_cost: number;
  owner: string;
  latency_ms?: number | null;
};
