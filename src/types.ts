export interface UserData {
  name: string;
  role: string;
  location: string;
  bio: string;
  hobbies: string;
  experience: string;
  projects: string;
  skills: string;
  goals: string;
  socials: string;
  vibe: string;
  availability: string;
  photos?: string[];
}

export type SiteGenerationMode = 'html' | 'nextjs';

export interface SiteProjectFile {
  path: string;
  content: string;
}

export interface SiteContent {
  html: string;
  generationMode: SiteGenerationMode;
  framework: string | null;
  projectFiles?: SiteProjectFile[] | null;
}

export interface SiteAnalyticsPoint {
  date: string;
  views: number;
}

export interface SiteAnalyticsReferrer {
  source: string;
  views: number;
}

export interface SiteAnalyticsOverviewItem {
  page_id: string;
  total_views: number;
  unique_visitors: number;
  views_last_7_days: number;
  last_viewed_at: string | null;
}

export interface SiteAnalytics {
  page_id: string;
  total_views: number;
  unique_visitors: number;
  views_last_7_days: number;
  last_viewed_at: string | null;
  trend: SiteAnalyticsPoint[];
  top_referrers: SiteAnalyticsReferrer[];
}

export type AutoMaintainScope =
  | 'bio_intro'
  | 'featured_projects'
  | 'portfolio_updates'
  | 'testimonials'
  | 'blog_news'
  | 'seo_metadata'
  | 'design_refresh'
  | 'call_to_action';

export type AutoMaintainMode = 'suggest_only' | 'smart_approve' | 'fully_automatic';

export interface AutoMaintainTriggerRules {
  profile_updates: boolean;
  project_changes: boolean;
  testimonial_changes: boolean;
  blog_news_changes: boolean;
  seo_drift: boolean;
  design_review_window: boolean;
}

export interface SiteAutoMaintainSettings {
  page_id: string;
  user_id: string;
  enabled: boolean;
  allowed_scopes: AutoMaintainScope[];
  maintenance_mode: AutoMaintainMode;
  trigger_rules: AutoMaintainTriggerRules;
  last_evaluated_at: string | null;
  last_applied_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Profile / Data Tree ───────────────────────────────────────────────────

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  duration: string;
  description: string;
  achievements: string;
  url: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field: string;
  year: string;
  gpa: string;
  highlights: string;
}

export interface SkillEntry {
  id: string;
  name: string;
  level: string; // Beginner | Intermediate | Advanced | Expert
  category: string; // Language | Framework | Tool | Soft Skill | Other
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  url: string;
  stack: string;
  status: string; // Active | Completed | Archived
  highlights: string;
}

export interface AchievementEntry {
  id: string;
  title: string;
  organization: string;
  year: string;
  description: string;
}

export interface CustomField {
  id: string;
  key: string;
  value: string;
}

export interface LinkedInConnection {
  connected: boolean;
  provider: string;
  connectedAt: string;
  lastSyncedAt: string;
  email: string;
  name: string;
  headline: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface ProfileTree {
  identity: {
    name: string;
    role: string;
    location: string;
    bio: string;
    tagline: string;
    availability: string;
    email: string;
  };
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  projects: ProjectEntry[];
  achievements: AchievementEntry[];
  social: {
    github: string;
    linkedin: string;
    twitter: string;
    portfolio: string;
    youtube: string;
    instagram: string;
    other: string;
  };
  personal: {
    interests: string;
    languages: string;
    values: string;
    funFacts: string;
    personalityType: string;
  };
  goals: {
    shortTerm: string;
    longTerm: string;
    currentlyLearning: string;
    openTo: string;
  };
  linkedinConnection: LinkedInConnection;
  custom: CustomField[];
  /** Base64 data-URL strings for photos the user uploaded */
  photos?: string[];
}

export const defaultProfileTree: ProfileTree = {
  identity: { name: '', role: '', location: '', bio: '', tagline: '', availability: '', email: '' },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  achievements: [],
  social: { github: '', linkedin: '', twitter: '', portfolio: '', youtube: '', instagram: '', other: '' },
  personal: { interests: '', languages: '', values: '', funFacts: '', personalityType: '' },
  goals: { shortTerm: '', longTerm: '', currentlyLearning: '', openTo: '' },
  linkedinConnection: {
    connected: false,
    provider: '',
    connectedAt: '',
    lastSyncedAt: '',
    email: '',
    name: '',
    headline: '',
    avatarUrl: '',
    profileUrl: '',
  },
  custom: [],
  photos: [],
};
