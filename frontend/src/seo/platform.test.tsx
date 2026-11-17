import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NewsletterSignup from "../community/NewsletterSignup";
import { courseGuestPayload } from "../interview/progress-merge";
const post = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ api: { post } }));
beforeEach(() => {
  post.mockReset();
});
const form = () =>
  render(
    <MemoryRouter>
      <NewsletterSignup source="test" />
    </MemoryRouter>,
  );
describe("newsletter consent and honest request states", () => {
  it("requires explicit consent and sends a normalized email request without claiming delivery", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({
      data: { detail: "If eligible, a confirmation email will be queued." },
    });
    form();
    expect(
      (
        screen.getByRole("button", {
          name: "Subscribe free",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.type(
      screen.getByLabelText("Email address"),
      "reader@example.com",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Subscribe free" }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/newsletter/subscribe/",
        expect.objectContaining({
          email: "reader@example.com",
          consent: true,
          source: "test",
        }),
      ),
    );
    expect((await screen.findByRole("status")).textContent).toContain("queued");
    expect(
      screen.getByRole("link", { name: "Privacy policy" }).getAttribute("href"),
    ).toBe("/policies#privacy");
  });
  it("shows an honest outage and retains the email for retry", async () => {
    const user = userEvent.setup();
    post.mockRejectedValue({ response: { status: 503 } });
    form();
    await user.type(
      screen.getByLabelText("Email address"),
      "reader@example.com",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Subscribe free" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "not available yet",
    );
    expect(
      (screen.getByLabelText("Email address") as HTMLInputElement).value,
    ).toBe("reader@example.com");
  });
});
describe("guest import contract", () => {
  it("maps every stored completion dimension without introducing user IDs or extra fields", () => {
    expect(
      courseGuestPayload({
        done: [1],
        challenge: [2],
        theory: [3],
        questions: [8],
        projects: ["app"],
        scores: { 1: 5 },
        currentDay: 4,
      }),
    ).toEqual({
      completed_days: [1],
      completed_challenges: [2],
      completed_theory: [3],
      completed_questions: [8],
      completed_projects: ["app"],
      quiz_scores: { 1: 5 },
      current_day: 4,
    });
  });
});
