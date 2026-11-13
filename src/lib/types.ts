export type Visibility = "draft" | "published" | "archived";
export type ProjectStatus = "idea" | "prototype" | "in_progress" | "released" | "maintained";
export type FileRole = "thumbnail" | "screenshot" | "video" | "attachment";

export interface ExtraLink { label: string; url: string }

export interface Project {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  features: string[];
  category: string;
  technologies: string[];
  tags: string[];
  status: ProjectStatus;
  visibility: Visibility;
  thumbnail_file_id: string | null;
  live_demo_url: string | null;
  video_url: string | null;
  extra_links: ExtraLink[];
  is_featured: boolean;
  created_on: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  public_repository_url: string | null;
}

/** Owner-only view adds the private repository fields. */
export interface OwnerProject extends Project {
  repository_url: string | null;
  repository_is_public: boolean;
}

export interface HubFile {
  id: string;
  project_id: string | null;
  folder?: string;
  role: FileRole;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  checksum: string | null;
  visibility: "private" | "public";
  sort_order: number;
  created_at: string;
}

export interface Release {
  id: string;
  project_id: string;
  version: string;
  release_notes: string;
  release_date: string;
  visibility: "private" | "public";
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string;
  bio: string;
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  prototype: "Prototype",
  in_progress: "In progress",
  released: "Released",
  maintained: "Maintained",
};

export const DEFAULT_CATEGORIES = [
  "Android Applications",
  "Websites",
  "Games",
  "AI Projects",
  "Experiments",
  "Other Innovations",
];
