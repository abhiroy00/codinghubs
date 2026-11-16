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

test("home has no course grid and Explore courses opens the courses page", async ({
  page,
}) => {
  await expect(page.locator("#courses")).toHaveCount(0);
  await expect(page.locator(".cc-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Explore courses" }).click();
  await expect(page).toHaveURL(/\/courses\/$/);
  await expect(page.locator("#catalogue .csx-list a")).toHaveCount(43);
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
  // Reduced motion: the redesigned home has no carousel in the hero and reveal content is visible.
  await expect(page.locator(".hs-slide")).toHaveCount(0);
  await expect(page.locator("#why .reveal").first()).toHaveCSS("opacity", "1");
});

test("Our Work showcase filters real projects and links to the full list", async ({
  page,
}) => {
  const work = page.locator("#our-work");
  await expect(work.locator(".hm-work")).toHaveCount(6);
  await work.getByRole("button", { name: /^E-Commerce/ }).click();
  await expect(work.locator(".hm-work h3")).toHaveText(["Gmart Fresh", "Sportswear9"]);
  await expect(work.getByRole("button", { name: /^E-Commerce/ })).toHaveAttribute("aria-pressed", "true");
  await work.getByRole("button", { name: /^All/ }).click();
  await expect(work.locator(".hm-work")).toHaveCount(6);
  await work.getByRole("link", { name: /See all 14 projects/ }).click();
  await expect(page).toHaveURL(/\/our-work$/);
});

test("AI tools search, category filter, reset and empty state work together", async ({
  page,
}) => {
  const tools = page.locator("#ai-tools");
  const cards = tools.locator(".hm-tool");
  await expect(cards).toHaveCount(12);
  await tools.getByRole("button", { name: "Coding", exact: true }).click();
  await expect(cards).toHaveCount(2);
  await tools.getByRole("searchbox", { name: "Search AI tools" }).fill("cursor");
  await expect(cards).toHaveCount(1);
  await expect(cards.locator("h3")).toHaveText("Cursor");
  await tools.getByRole("searchbox", { name: "Search AI tools" }).fill("no such tool");
  await expect(tools.getByText(/No tools match/)).toBeVisible();
  await tools.getByRole("button", { name: "Show all tools" }).click();
  await expect(cards).toHaveCount(12);
  await expect(tools.getByRole("searchbox", { name: "Search AI tools" })).toHaveValue("");
  await expect(tools.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  const links = await cards.locator("a").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(links.every((href) => href.startsWith("https://"))).toBe(true);
});

test("Visit section keeps the head office details and a working directions link", async ({
  page,
}) => {
  const visit = page.locator("#contact");
  await expect(visit.locator("address")).toContainText("904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi");
  await expect(visit.getByRole("link", { name: /Get Directions/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=904/,
  );
  await expect(visit.locator('a[href="tel:+917464099059"]').first()).toBeVisible();
  await expect(visit.locator('a[href="mailto:info@codingnowai.in"]')).toBeVisible();
  const faq = page.locator("#faq details");
  await expect(faq).toHaveCount(7);
  await faq.nth(1).locator("summary").click();
  await expect(faq.nth(1)).toHaveAttribute("open", "");
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
