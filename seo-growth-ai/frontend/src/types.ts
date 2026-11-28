export interface Site {
  id: string;
  name: string;
  base_url: string;
  kind: string;
  property_url: string;
}
export interface Session {
  username: string;
  role: string;
  csrf: string;
}
export interface Totals {
  clicks: number;
  impressions: number;
  ctr_pct: number | null;
  position_approx: number | null;
}
export interface Metric {
  key: string;
  position: number | null;
  clicks: number;
  impressions: number;
  ctr_pct: number | null;
}
export interface WindowData {
  start: string;
  end: string;
  observed_days: number;
  complete: boolean;
  totals: Totals | null;
}
export interface Summary {
  chart: Metric[];
  totals: Totals | null;
  windows: Record<string, WindowData>;
  dimensions: Record<
    string,
    { rows: Metric[]; totals: Totals | null; source_id: string | null }
  >;
  source: {
    id: string;
    created_at: number;
    observed_start?: string;
    observed_end?: string;
    filters?: Record<string, string>;
    freshness?: string;
  } | null;
  limitations: string[];
}
export interface Action {
  id: string;
  title: string;
  kind: string;
  severity: string;
  score: number;
  confidence: string;
  evidence: Record<string, unknown>;
  status: string;
}
export interface Job {
  id: string;
  kind: string;
  status: string;
  created_at: number;
  heartbeat: number;
  progress: Record<string, unknown>;
  result: Record<string, unknown>;
  error: string;
}
export interface Agent {
  agent: string;
  status: string;
  summary: string;
  evidence: Record<string, unknown>;
}
export interface Page {
  id: string;
  url: string;
  title: string;
  status: number;
  robots: string;
  canonical: string;
  word_count: number;
  checked_at: number;
}
export interface Report {
  id: string;
  kind: string;
  created_at: number;
  data: {
    totals?: Totals;
    source?: Summary["source"];
    agents?: Agent[];
    actions?: Action[];
    [key: string]: unknown;
  };
}
export interface System {
  os: string;
  architecture: string;
  logical_cpus: number;
  ram_total_bytes: number;
  ram_available_bytes: number;
  ram_used_pct: number;
  cpu_used_pct: number;
  process_rss_bytes: number;
  gpu_utilization_pct: number | null;
  disk_free_bytes: number;
  database_bytes: number;
  upload_storage_bytes: number;
  local_ai_requests: number;
  local_ai_processing_ms: number;
  profile: string;
  limits: { crawl_limit: number; concurrency: number };
  ai: {
    available: boolean;
    models: string[];
    default_model: string;
    embedding_model: string;
  };
  scheduler: string;
  cost_policy: {
    verified_external_expenditure_inr: number | null;
    limits: string;
  };
}
export interface Keyword extends Metric {
  intent: string;
  score: number;
  confidence: string;
  mapping: { url: string; method: string } | null;
  cluster: string;
  potential_clicks_scenario: number;
  scenario_assumption: string;
}
export interface Keywords {
  rows: Keyword[];
  overlap_candidates: unknown[];
  overlap_limit: string | null;
  ideas: { query: string; status: string }[];
}
export interface Technical {
  checked_pages: number;
  findings: {
    url: string;
    status: number;
    issues: string[];
    indexing_signal: string;
  }[];
  broken_internal_links: { source: string; target: string }[];
  duplicates: string[][];
  no_observed_inbound: string[];
  graph_limit: string;
}
export interface Document {
  id: string;
  title: string;
  source: string;
  verified: boolean;
  active: boolean;
  characters: number;
  version_hash: string;
}
export interface SearchResult {
  mode: string;
  results: {
    chunk_id: string;
    source: string;
    title: string;
    text: string;
    score: number;
    verified: boolean;
  }[];
  limitations: string;
}
export interface Schedule {
  id: string;
  name: string;
  kind: string;
  cadence: string;
  hour: number;
  minute: number;
  enabled: boolean;
  last_slot: string;
}
export interface Repository {
  id: string;
  name: string;
  frameworks: string[];
}
export interface Proposal {
  id: string;
  path: string;
  diff: string;
  status: string;
  branch: string;
  results: Record<string, unknown>;
}
export type Run = (
  work: () => Promise<unknown>,
  success?: string,
) => Promise<void>;
export interface PanelProps {
  site: Site;
  run: Run;
  refresh: () => void;
  jobs: Job[];
  pages: Page[];
  system: System | null;
}
