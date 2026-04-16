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

export interface SiteContent {
  html: string;
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
  custom: [],
  photos: [],
};
