export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface JobRoleInfo {
  required_skills: string[];
  description: string;
  sections: string[];
}

export type JobRolesMap = Record<string, Record<string, JobRoleInfo>>;

export interface KeywordMatch {
  score: number;
  found_skills: string[];
  missing_skills: string[];
}

export interface ResumeAnalysis {
  ats_score: number;
  document_type: string;
  keyword_match: KeywordMatch;
  section_score: number;
  format_score: number;
  suggestions: string[];
  contact_suggestions?: string[];
  summary_suggestions?: string[];
  skills_suggestions?: string[];
  experience_suggestions?: string[];
  education_suggestions?: string[];
  format_suggestions?: string[];
  section_scores?: Record<string, number>;
  name?: string;
  email?: string;
}

export interface JobListing {
  id: number | string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary: string;
  url: string;
  published_at: string;
  tags: string[];
  source: string;
}

export interface AiAnalysis {
  score: number;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  full_response: string;
  model_used: string;
  error?: string;
}

export interface DashboardSummary {
  total_resumes: number;
  average_ats_score: number;
  top_roles: Array<{ role: string; count: number }>;
  daily_submissions: Array<{ date: string; count: number }>;
  ai_stats: {
    total_analyses: number;
    average_score: number;
    model_usage: Array<{ model: string; count: number }>;
    top_job_roles: Array<{ role: string; count: number }>;
  };
}

export interface RecentSubmission {
  id: number;
  name: string;
  email: string;
  target_role: string;
  target_category: string;
  created_at: string;
  ats_score: number;
  keyword_match_score: number;
  format_score: number;
  section_score: number;
}

export interface JobSuggestion {
  text: string;
  icon: string;
}

export interface LocationSuggestion {
  text: string;
  icon: string;
  type: string;
}

export interface JobPortalResult {
  portal: string;
  icon: string;
  color: string;
  title: string;
  url: string;
}
