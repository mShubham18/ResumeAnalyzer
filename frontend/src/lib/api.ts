import axios from "axios";
import type {
  AiAnalysis,
  AuthResponse,
  DashboardSummary,
  JobListing,
  JobPortalResult,
  JobRolesMap,
  JobSuggestion,
  LocationSuggestion,
  RecentSubmission,
  ResumeAnalysis,
  User,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
}): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>("/api/auth/register", payload);
  return response.data;
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>("/api/auth/login", payload);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await http.post("/api/auth/logout");
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await http.get<{ success: boolean; user: User }>("/api/auth/me");
  return response.data.user;
}

export async function fetchJobRoles(): Promise<JobRolesMap> {
  const response = await http.get<{ success: boolean; roles: JobRolesMap }>("/api/job-roles");
  return response.data.roles;
}

export async function uploadResume(params: {
  file: File;
  target_category: string;
  target_role: string;
}): Promise<{
  success: boolean;
  filename: string;
  text: string;
  analytics: ResumeAnalysis;
  ai_analysis: AiAnalysis;
  suggested_jobs: JobListing[];
}> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("target_category", params.target_category);
  formData.append("target_role", params.target_role);

  const response = await http.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function analyzeWithAi(payload: {
  resume_text: string;
  target_role: string;
  target_category: string;
  model?: string;
}): Promise<{ success: boolean; analysis: AiAnalysis }> {
  const response = await http.post<{ success: boolean; analysis: AiAnalysis }>("/api/ai-analyze", payload);
  return response.data;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await http.get<{ success: boolean; summary: DashboardSummary }>("/api/dashboard/summary");
  return response.data.summary;
}

export async function fetchRecentSubmissions(): Promise<RecentSubmission[]> {
  const response = await http.get<{ success: boolean; items: RecentSubmission[] }>("/api/dashboard/recent");
  return response.data.items;
}

export async function fetchJobSuggestions(payload: {
  query: string;
  location_query: string;
}): Promise<{
  job_suggestions: JobSuggestion[];
  location_suggestions: LocationSuggestion[];
  experience_ranges: Array<{ id: string; text: string }>;
  salary_ranges: Array<{ id: string; text: string }>;
  job_types: Array<{ id: string; text: string }>;
}> {
  const response = await http.post("/api/jobs/suggestions", payload);
  return response.data;
}

export async function searchJobs(payload: {
  job_title: string;
  location: string;
  experience_id: string;
}): Promise<{ jobs: JobListing[]; portals: JobPortalResult[] }> {
  const response = await http.post<{ success: boolean; results: JobListing[]; portals: JobPortalResult[] }>(
    "/api/jobs/search",
    payload,
  );
  return {
    jobs: response.data.results,
    portals: response.data.portals || [],
  };
}
