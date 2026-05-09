/* @nac-spec/test-runner -- TypeScript types. */

export interface NACScopeEntry {
  slug: string;
  role?: string | null;
  intent?: string | null;
  label_i18n?: Record<string, string> | null;
}

export interface NACSitemapPath {
  slug: string;
  label_i18n?: Record<string, string>;
  affordance_to_navigate?: Array<{ action: 'click' | 'focus' | 'navigate'; target: string }>;
  requires_permission?: string[];
  tags?: string[];
}

export interface NACSnapshot {
  nac_version: string;
  v2_scope_entries: NACScopeEntry[];
  v1_plugins?: Array<{ plugin_slug: string; elements: Array<{ id: string; role?: string; label_i18n?: Record<string, string>; actions?: Array<{ verb: string }> }> }>;
  sitemap?: { paths: NACSitemapPath[] } | null;
  [k: string]: any;
}

export interface ResolveResult {
  resolved_slug: string | null;
  resolved_source: 'tree' | 'sitemap' | null;
  confidence: number;
  reason: string;
  candidates: Array<{ slug: string; score: number; source: 'tree' | 'sitemap'; reason: string }>;
}

export interface PlanStep {
  action: 'click' | 'fill' | 'navigate' | 'focus';
  target_slug: string;
  value?: any;
  requires_page_break_guard?: boolean;
  carry_intent_via_query?: string;
  on_continuation?: boolean;
}

export interface Plan {
  strategy: 'tree_dispatch' | 'sitemap_navigate' | 'reject';
  resolved_slug: string | null;
  confidence: number;
  steps: PlanStep[];
  candidates_top3?: ResolveResult['candidates'];
  trace: string[];
}

export interface RunResult {
  passed: boolean;
  intent: string;
  resolved_slug: string | null;
  strategy: Plan['strategy'];
  confidence: number;
  steps: Array<{
    action: PlanStep['action'];
    target_slug: string;
    started_at: number;
    ended_at: number;
    latency_ms: number;
    status: 'ok' | 'fail' | 'skipped';
    error?: string;
  }>;
  latency_ms_total: number;
  log: string[];
  dispatched_slugs: string[];
  error?: string;
}

export interface PlanArgs {
  intent: string | { resolved_slug: string };
  snapshot: NACSnapshot;
  locale?: string;
  preferred_source?: 'tree' | 'sitemap';
  fill_values?: Record<string, any>;
  continuation_query?: string;
  continuation_value?: string;
}

export function plan(args: PlanArgs): Plan;
export function resolveIntent(args: { intent: string; snapshot: NACSnapshot; preferred_source?: 'tree' | 'sitemap' }): ResolveResult;
export function runIntent(page: any, opts: {
  intent: string;
  fill_values?: Record<string, any>;
  expected_terminal_slug?: string;
  timeout_ms?: number;
  step_delay_ms?: number;
  continuation_query?: string;
  continuation_value?: string;
  onLog?: (msg: string) => void;
}): Promise<RunResult>;
export function snapshot(page: any): Promise<NACSnapshot>;
export function dispatchByNacId(page: any, slug: string, opts?: { action?: string; value?: any }): Promise<{ ok: boolean; error?: string }>;
export function clickAnchorWithContinuation(page: any, slug: string, query: string): Promise<{ ok: boolean; page_break: boolean; error?: string }>;

export interface SitemapCoverageReport {
  total_paths: number;
  reached_paths: number;
  percent: number;
  reached: string[];
  missing: Array<{ slug: string; label_i18n: any }>;
  by_tag: Array<{ tag: string; total: number; reached: number; percent: number }>;
}
export function sitemapCoverageReport(args: { sitemap_paths: NACSitemapPath[]; reached_slugs: string[] }): SitemapCoverageReport;
export function treeCoverageReport(args: { tree_entries: NACScopeEntry[]; dispatched_slugs: string[] }): {
  total_slugs: number;
  reached_slugs: number;
  percent: number;
  reached: string[];
  missing: Array<{ slug: string; role: string | null; label_i18n: any }>;
};

export function assertNavigationCompletes(result: RunResult, expectedTerminalSlug: string): true;
export function assertPlanShape(plan: Plan, expected: { strategy?: Plan['strategy']; slug?: string; step_count?: number; has_page_break?: boolean }): true;
export function assertConfidence(result: { confidence: number }, threshold: number): true;
export class NACAssertionError extends Error { details: any; }

export const version: string;
