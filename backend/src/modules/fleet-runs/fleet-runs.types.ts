export type FleetRunStatus = 'running' | 'completed';

export type FleetRunTargetStatus =
  'pending' | 'running' | 'success' | 'failed' | 'offline' | 'error';

export interface FleetRun {
  id: string;
  user_id: string;
  template_id: string;
  template_slug: string;
  action: string;
  args: Record<string, unknown>;
  target_count: number;
  status: FleetRunStatus;
  created_at: Date;
  completed_at: Date | null;
}

export interface FleetRunTarget {
  id: string;
  fleet_run_id: string;
  app_id: string | null;
  app_name: string;
  job_id: string | null;
  status: FleetRunTargetStatus;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FleetRunWithTargets extends FleetRun {
  targets: FleetRunTarget[];
}
