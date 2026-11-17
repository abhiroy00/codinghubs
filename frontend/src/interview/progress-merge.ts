export type GuestCourse = {
  done?: number[];
  challenge?: number[];
  theory?: number[];
  questions?: number[];
  projects?: string[];
  scores?: Record<string, number>;
  currentDay?: number;
};
export function courseGuestPayload(value: GuestCourse) {
  return {
    completed_days: value.done || [],
    completed_challenges: value.challenge || [],
    completed_theory: value.theory || [],
    completed_questions: value.questions || [],
    completed_projects: value.projects || [],
    quiz_scores: value.scores || {},
    current_day: value.currentDay || 1,
  };
}
