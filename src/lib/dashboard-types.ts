import type { HubFile, OwnerProject, Profile, Release } from "./types";

export interface ActivityRow { id: number; operation: string; resource_type: string; detail: string | null; created_at: string }

export interface DashboardData {
  profile: Profile & { is_owner: boolean };
  email: string;
  projects: OwnerProject[];
  files: HubFile[];
  releases: Release[];
  thumbs: Record<string, string>;
  activity: ActivityRow[];
  mfaEnrolled: boolean;
}
