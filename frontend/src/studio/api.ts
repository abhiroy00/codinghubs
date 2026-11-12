import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export const ROOT = "/interview-studio";
export const studioApi = {
  get: async <T>(path: string): Promise<T> =>
    (await api.get<T>(`/studio/v1${path}`)).data,
  post: async <T>(path: string, value?: unknown): Promise<T> =>
    (await api.post<T>(`/studio/v1${path}`, value)).data,
  patch: async <T>(path: string, value: unknown): Promise<T> =>
    (await api.patch<T>(`/studio/v1${path}`, value)).data,
  put: async <T>(path: string, value: unknown): Promise<T> =>
    (await api.put<T>(`/studio/v1${path}`, value)).data,
  delete: async (path: string) => api.delete(`/studio/v1${path}`),
};
export function errorMessage(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "object" && data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    return Object.entries(data)
      .map(
        ([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(" ") : String(value)}`,
      )
      .join(" ");
  }
  return "Could not reach Interview Studio. Check your connection and retry.";
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await studioApi.get<T>(path));
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setData(null);
    studioApi
      .get<T>(path)
      .then((value) => {
        if (current) {
          setData(value);
          setError("");
        }
      })
      .catch((err) => {
        if (current) setError(errorMessage(err));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path]);
  return { data, error, loading, reload, setData };
}
export type Problem = {
  id: number;
  slug: string;
  title: string;
  kind: string;
  difficulty: string;
  topics: string[];
  companies: string[];
  description: string;
  constraints: string;
  examples: { input: string; output: string }[];
  starters: Record<string, string>;
  version: number;
  provenance: string;
};
export type Catalog = {
  topics: string[];
  companies: string[];
  roles: string[];
  levels: string[];
  languages: string[];
  patterns: { title: string; lesson: string }[];
  stages: string[];
  ai_available: boolean;
  execution_available: boolean;
  problem_count: number;
};
export type Configuration = {
  kind: string;
  mode: string;
  persona: string;
  experience: string;
  difficulty: string;
  topics: string[];
  company: string;
  role: string;
  duration: number;
  language: string;
  run_mode: string;
  problem_id?: number;
};
export type ChatMessage = {
  id?: number;
  role: string;
  content: string;
  sources?: { id: number; title: string }[];
};
export type TestResult = {
  hidden: boolean;
  passed: boolean | null;
  status: string;
  duration_ms?: number;
  output?: string;
  input?: string;
  expected?: string;
};
export type Submission = {
  id: string;
  mode: string;
  status: string;
  results: TestResult[];
};
export type Report = {
  score: number;
  dimensions: Record<string, { rating: number; explanation: string }>;
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  weights: Record<string, number>;
  evidence: { mode: string; status: string; results: TestResult[] }[];
  prompt_version: string;
};
export type StudioSession = {
  id: string;
  problem: Problem;
  configuration: Configuration;
  status: string;
  stage: number;
  stages?: string[];
  hint_level: number;
  started_at: string;
  deadline: string;
  completed_at: string | null;
  revision: number;
  code: string;
  diagram: { nodes?: unknown[]; edges?: unknown[] };
  messages: ChatMessage[];
  submissions: Submission[];
  report: Report | null;
  score?: number | null;
};
export type LearningRecord = {
  id: string;
  kind: string;
  key: string;
  data: Record<string, unknown>;
  updated_at: string;
};
export type Analytics = {
  total_interviews: number;
  completed: number;
  active: number;
  average_score: number | null;
  problems_attempted: number;
  problems_solved: number;
  accuracy: number | null;
  activity: { day: string; count: number }[];
  dimensions: Record<string, number | null>;
};
