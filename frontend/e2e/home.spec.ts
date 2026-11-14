import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "AI learning",
  );
  await expect(page.locator("#root")).toBeVisible();
});

test("home content and layout fit phone, tablet and desktop screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `Horizontal overflow at ${width}px`).toBe(false);
    await expect(
      page
        .locator(".join-actions")
        .getByRole("link", { name: /Book free demo class/ }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Explore Coding Hubs" })
        .getByRole("link"),
    ).toHaveCount(4);
  }
  const broken = await page
    .locator("img")
    .evaluateAll((images) =>
      images
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.src),
    );
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});

test("category, search and reset work together across the full catalogue", async ({
  page,
}) => {
  const courses = page.locator("#courses");
  await expect(courses.locator(".cc-card")).toHaveCount(13);
  await courses.getByRole("button", { name: /AI & Cyber Security/ }).click();
  await expect(courses.locator(".cc-card")).toHaveCount(6);
  await courses.getByRole("searchbox").fill("Agentic");
  await expect(courses.locator(".cc-card")).toHaveCount(1);
  await expect(courses.locator(".cc-card h3")).toHaveText("Agentic AI");
  await courses.getByRole("searchbox").fill("no matching course");
  await expect(
    courses.getByText("No course matches your search."),
  ).toBeVisible();
  await courses.getByRole("button", { name: "Show all courses" }).click();
  await expect(courses.locator(".cc-card")).toHaveCount(13);
  await expect(courses.getByRole("searchbox")).toHaveValue("");
});

test("every course card opens a demo with that exact course selected", async ({
  page,
}) => {
  const cards = page.locator("#courses .cc-card");
  const titles = await cards.locator("h3").allTextContents();
  for (let index = 0; index < titles.length; index++) {
    await cards
      .nth(index)
      .getByRole("button", { name: /Free demo/ })
      .click();
    const dialog = page.getByRole("dialog", { name: "Free demo registration" });
    await expect(
      dialog.getByRole("combobox", { name: /Select Your Interested Course/ }),
    ).toHaveValue(titles[index]);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
});

test("mobile menu, announcement and demo keyboard controls work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Dismiss announcement" }).click();
  await expect(
    page.getByRole("complementary", { name: "New batch announcement" }),
  ).toHaveCount(0);
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.click();
  await expect(page.locator("#nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#nav")).not.toBeVisible();
  await page
    .locator(".join-actions")
    .getByRole("link", { name: /Book free demo class/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: /Full Name/ }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("link", { name: "Privacy Policy" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .locator(".join-actions")
      .getByRole("link", { name: /Book free demo class/ }),
  ).toBeFocused();
});

test("registration validates, reports API failure, retries and sends all collected fields", async ({
  page,
}) => {
  let attempts = 0;
  let payload: Record<string, unknown> = {};
  await page.route("**/api/leads/", async (route) => {
    attempts++;
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: attempts === 1 ? 503 : 201,
      contentType: "application/json",
      body: attempts === 1 ? '{"detail":"Unavailable"}' : '{"id":123}',
    });
  });
  await page
    .locator(".join-actions")
    .getByRole("link", { name: /Book free demo class/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reserve My Free Seat" }).click();
  await expect(
    dialog.getByText("Please correct the highlighted fields."),
  ).toBeVisible();
  expect(attempts).toBe(0);
  await dialog.getByRole("textbox", { name: /Full Name/ }).fill("Test Learner");
  await dialog
    .getByRole("textbox", { name: /Mobile Number/ })
    .fill("9876543210");
  await dialog
    .getByRole("textbox", { name: /Email Address/ })
    .fill("learner@example.com");
  await dialog
    .getByRole("combobox", { name: /Select Your Interested Course/ })
    .selectOption("Vibe Coding with AI");
  await dialog
    .getByRole("combobox", { name: /Current Education/ })
    .selectOption("Graduate");
  await dialog
    .getByRole("checkbox", { name: /Send me session updates/ })
    .check();
  await dialog.getByRole("button", { name: "Reserve My Free Seat" }).click();
  await expect(
    dialog.getByText(
      "Something went wrong and your registration was not submitted. Please try again.",
    ),
  ).toBeVisible();
  // Storage restrictions must not turn a successful server submission into an error.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await dialog.getByRole("button", { name: "Reserve My Free Seat" }).click();
  await expect(
    dialog.getByRole("heading", { name: "You're registered!" }),
  ).toBeVisible();
  expect(payload).toEqual({
    name: "Test Learner",
    phone: "+919876543210",
    email: "learner@example.com",
    education: "Graduate",
    whatsapp_consent: true,
    course: "Vibe Coding with AI",
    mode: "demo",
    source_page: "/",
  });
  expect(attempts).toBe(2);
});

test("video playback and carousel controls use the existing demo media", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Play video: AI Challenge: Day 3" })
    .click();
  await expect(page.locator(".reel.is-playing")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".reel video")
        .first()
        .evaluate((video: HTMLVideoElement) => !video.paused && video.controls),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Next videos" }).click();
  await expect
    .poll(() => page.locator("#vlist").evaluate((list) => list.scrollLeft))
    .toBeGreaterThan(0);
});

test("late-loading published content reveals itself with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/projects/?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            title: "Published project",
            slug: "published-project",
            summary: "A published Coding Hubs project.",
          },
        ],
      }),
    });
  });
  await page.reload();
  await expect(page.locator("#projects h2")).toContainText("Projects with");
  await expect(page.locator("#projects .reveal")).toHaveClass(/in/);
  // Reduced motion: no slider controls and no automatic slide changes.
  const slider = page.getByRole("region", { name: "Coding Hubs in pictures" });
  await expect(slider.getByRole("button")).toHaveCount(0);
  await page.waitForTimeout(4000);
  await expect(slider.locator(".hs-slide.is-active")).toHaveAttribute("aria-label", /^1 of 5:/);
});

test("hero slider auto-advances through all five photos without controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const slider = page.getByRole("region", { name: "Coding Hubs in pictures" });
  const active = slider.locator(".hs-slide.is-active");
  const expected = [
    "classroom-live-coding-session",
    "gitm-student-group-photo",
    "team-festive-celebration",
    "gitm-aarambh-data-science-careers-talk",
    "gitm-aarambh-felicitation",
  ];
  await expect(slider.locator(".hs-slide")).toHaveCount(5);
  // The pause, previous/next, dot and counter controls are gone.
  await expect(slider.getByRole("button")).toHaveCount(0);
  await expect(slider.locator(".hs-count")).toHaveCount(0);
  await page.mouse.move(5, 5);
  // Autoplay walks every slide in order every 3 seconds and wraps around.
  for (let i = 0; i < expected.length; i++) {
    await expect(active).toHaveAttribute("aria-label", new RegExp(`^${i + 1} of 5:`), { timeout: 4500 });
    const img = active.locator("> picture img");
    await expect(img).toHaveAttribute("src", `/assets/hero/${expected[i]}.jpg`);
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
  }
  await expect(active).toHaveAttribute("aria-label", /^1 of 5:/, { timeout: 4500 });
  // Clicking a side card still moves to it.
  await slider.locator(".hs-slide.is-next").click();
  await expect(active).toHaveAttribute("aria-label", /^2 of 5:/);
  // Hovering pauses autoplay; leaving resumes it.
  await page.waitForTimeout(3600);
  await expect(active).toHaveAttribute("aria-label", /^2 of 5:/);
  await page.mouse.move(5, 5);
  await expect(active).toHaveAttribute("aria-label", /^3 of 5:/, { timeout: 4500 });
  expect(errors).toEqual([]);
});

test("hero slider supports touch swipe on phones", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  const frame = page.locator(".hs-stage");
  const active = page.locator(".hs-slide.is-active");
  await frame.scrollIntoViewIfNeeded();
  const box = (await frame.boundingBox())!;
  const swipe = (from: number, to: number) =>
    frame.evaluate(
      (el, [x1, x2, y]) => {
        const t = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [t(x1)], changedTouches: [t(x1)] }));
        el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t(x2)] }));
      },
      [from, to, box.y + box.height / 2],
    );
  await swipe(box.x + box.width - 30, box.x + 30);
  await expect(active).toHaveAttribute("aria-label", /^2 of 5:/);
  await swipe(box.x + 30, box.x + box.width - 30);
  await expect(active).toHaveAttribute("aria-label", /^1 of 5:/);
  await context.close();
});

test("all four learning and career pathways open their working pages", async ({
  page,
}) => {
  const paths = [
    ["Courses", "/courses/"],
    ["Interview Prep", "/interview-prep/"],
    ["Book a Tutor", "/book-a-tutor/"],
    ["Latest Jobs", "/latest-jobs/"],
  ];
  for (const [name, path] of paths) {
    await page
      .getByRole("navigation", { name: "Explore Coding Hubs" })
      .getByRole("link", { name: new RegExp(name) })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).not.toContainText("Page not found");
    await page.goto("/");
  }
});
