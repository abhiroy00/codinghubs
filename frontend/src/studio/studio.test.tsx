import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { studioApi, type Catalog, type StudioSession } from "./api";
import { Configure } from "./configure";
import { Dashboard } from "./pages";
import { Roadmaps, WindowVisualization } from "./learning";
import { Workspace } from "./Workspace";

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: { username: "Learner", email: "learner@example.test" },
    loading: false,
    logout: vi.fn(),
  }),
}));
vi.mock("./Editor", () => ({
  StudioEditor: ({
    code,
    onChange,
    readOnly,
  }: {
    code: string;
    onChange: (value: string) => void;
    readOnly: boolean;
  }) => (
    <textarea
      aria-label="Interview code editor"
      value={code}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("./Diagram", () => ({ Diagram: () => <div>Architecture canvas</div> }));
vi.mock("./voice", () => ({
  VoiceControls: () => <div>Typed fallback available</div>,
}));
const catalog: Catalog = {
  topics: ["Arrays", "Sliding Window"],
  companies: ["Google"],
  roles: ["Software Engineer"],
  levels: ["New Graduate"],
  languages: ["python", "javascript"],
  patterns: [
    { title: "Sliding Window", lesson: "Maintain a contiguous range." },
  ],
  stages: ["Clarify the problem"],
  ai_available: true,
  execution_available: true,
  problem_count: 8,
};
const session: StudioSession = {
  id: "example-session",
  problem: {
    id: 1,
    slug: "quiet-signal-window",
    title: "Quiet signal window",
    kind: "coding",
    difficulty: "easy",
    topics: ["Sliding Window"],
    companies: [],
    description: "Find the quietest window.",
    constraints: "Nonnegative readings.",
    examples: [{ input: '{"readings":[1,2],"width":1}', output: "1" }],
    starters: { python: "pass" },
    version: 1,
    provenance: "Original material",
  },
  configuration: {
    kind: "coding",
    mode: "interview",
    persona: "balanced",
    experience: "New Graduate",
    difficulty: "easy",
    topics: [],
    company: "",
    role: "Software Engineer",
    duration: 45,
    language: "python",
    run_mode: "run",
  },
  status: "active",
  stage: 0,
  hint_level: 0,
  started_at: new Date().toISOString(),
  deadline: new Date(Date.now() + 45 * 60000).toISOString(),
  completed_at: null,
  revision: 0,
  code: "pass",
  diagram: {},
  messages: [{ role: "assistant", content: "Explain your approach." }],
  submissions: [],
  report: null,
};
function shell(ui: React.ReactNode, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(studioApi, "get").mockImplementation(
    async <T,>(path: string): Promise<T> => {
      if (path === "/catalog/") return structuredClone(catalog) as T;
      if (path.startsWith("/records/")) return [] as T;
      if (path === "/sessions/") return [] as T;
      if (path.startsWith("/sessions/")) return structuredClone(session) as T;
      if (path.startsWith("/analytics/"))
        return {
          total_interviews: 0,
          completed: 0,
          active: 0,
          average_score: null,
          problems_attempted: 0,
          problems_solved: 0,
          accuracy: null,
          activity: [],
          dimensions: {},
        } as T;
      throw new Error("Unexpected path " + path);
    },
  );
});
describe("Interview Studio workflows", () => {
  it("shows honest new-account metrics and an actionable empty state", async () => {
    shell(<Dashboard />);
    await screen.findByText("Your first session is a fresh start.");
    expect(
      screen.getByText("Complete an interview to see your score"),
    ).toBeTruthy();
    expect(screen.getAllByText("0").length).toBe(3);
    expect(
      screen
        .getByRole("link", { name: /Start your first interview/ })
        .getAttribute("href"),
    ).toContain("/coding-interviews/new");
  });
  it("persists selected configuration and navigates to the created session", async () => {
    const post = vi.spyOn(studioApi, "post").mockResolvedValue(session);
    shell(
      <Routes>
        <Route path="/" element={<Configure />} />
        <Route
          path="/interview-studio/coding-interviews/session/:sessionId"
          element={<p>Session opened</p>}
        />
      </Routes>,
    );
    await screen.findByRole("button", { name: "Begin session" });
    fireEvent.click(screen.getByRole("radio", { name: /strict/i }));
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Arrays" }));
    fireEvent.click(screen.getByRole("button", { name: "Begin session" }));
    await screen.findByText("Session opened");
    expect(post).toHaveBeenCalledWith(
      "/sessions/",
      expect.objectContaining({
        persona: "strict",
        duration: 30,
        topics: ["Arrays"],
      }),
    );
  });
  it("keeps configuration visible and reports selection errors", async () => {
    vi.spyOn(studioApi, "post").mockRejectedValue({
      response: {
        data: { detail: "No approved problem matches these filters." },
      },
    });
    shell(<Configure />);
    await screen.findByRole("button", { name: "Begin session" });
    fireEvent.click(screen.getByRole("button", { name: "Begin session" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "No approved problem matches these filters.",
    );
  });
  it("saves the current draft before queueing actual execution", async () => {
    const events: string[] = [];
    vi.spyOn(studioApi, "patch").mockImplementation(async <
      T,
    >(): Promise<T> => {
      events.push("saved");
      return { revision: 1 } as T;
    });
    vi.spyOn(studioApi, "post").mockImplementation(
      async <T,>(path: string): Promise<T> => {
        events.push("queued");
        expect(path).toContain("/runs/");
        return {
          id: "run-1",
          status: "finished",
          mode: "sample",
          results: [
            {
              hidden: false,
              passed: true,
              status: "ok",
              output: "1",
              duration_ms: 20,
            },
          ],
        } as T;
      },
    );
    shell(
      <Routes>
        <Route path="/session/:sessionId" element={<Workspace />} />
      </Routes>,
      "/session/example-session",
    );
    const editor = await screen.findByLabelText("Interview code editor");
    fireEvent.change(editor, { target: { value: "print(1)" } });
    fireEvent.click(screen.getByRole("button", { name: /Run samples/ }));
    await screen.findByText(/Test 1 · Passed/);
    expect(events).toEqual(["saved", "queued"]);
    expect(studioApi.patch).toHaveBeenCalledWith(
      "/sessions/example-session/",
      expect.objectContaining({ code: "print(1)", revision: 0 }),
    );
  });
  it("retains the edited draft when a newer server version causes conflict", async () => {
    vi.spyOn(studioApi, "patch").mockRejectedValue({
      response: {
        status: 409,
        data: { detail: "A newer draft exists. Reload before saving." },
      },
    });
    const post = vi.spyOn(studioApi, "post");
    shell(
      <Routes>
        <Route path="/session/:sessionId" element={<Workspace />} />
      </Routes>,
      "/session/example-session",
    );
    const editor = await screen.findByLabelText("Interview code editor");
    fireEvent.change(editor, { target: { value: "my unsaved work" } });
    fireEvent.click(screen.getByRole("button", { name: /Run samples/ }));
    await screen.findByRole("alert");
    expect((editor as HTMLTextAreaElement).value).toBe("my unsaved work");
    expect(post).not.toHaveBeenCalled();
  });
  it("persists reviewed roadmap concepts", async () => {
    const put = vi.spyOn(studioApi, "put").mockResolvedValue({});
    shell(<Roadmaps />);
    await screen.findByRole("checkbox", { name: "Reviewed" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed" }));
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/records/", {
        kind: "roadmap",
        key: "30",
        data: { completed: [0] },
      }),
    );
  });
  it("shows real window totals and teaches the space invariant", () => {
    shell(<WindowVisualization />);
    fireEvent.click(screen.getByRole("button", { name: "Next window" }));
    expect(screen.getByText("9", { selector: "strong" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "O(1)" }));
    expect(screen.getByRole("status").textContent).toContain("Correct");
  });
});
