import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/courses/",
  "/interview-prep/",
  "/book-a-tutor/",
  "/latest-jobs/",
  "/blog",
  "/projects",
  "/locations/",
  "/login",
  "/policies",
  "/learn/ai-engineer/",
  "/interview-studio/",
  "/missing-page-check",
];

test("all site sections share the same header and place Locations inside Resources", async ({
  page,
}) => {
  let expectedStyle: Record<string, string> | undefined;
  for (const route of routes) {
    await page.goto(route);
    const header = page.locator(".site-header");
    await expect(header, route).toBeVisible();
    await expect(header).toHaveCount(1);
    const primary = header.getByRole("navigation", { name: "Primary" });
    await expect(primary.getByRole("link")).toHaveText([
      "Free Demo Classes",
      "Courses",
      "Interview Prep",
      "Tutor",
      "Jobs",
    ]);
    await expect(primary.locator(':scope > a[href="/locations/"]')).toHaveCount(
      0,
    );
    await expect(header.getByRole("link", { name: /Log in/ })).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Free Demo", exact: true }),
    ).toBeVisible();
    const style = await header.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        height: computed.height,
        font: computed.fontFamily,
      };
    });
    if (!expectedStyle) expectedStyle = style;
    expect(style, route).toEqual(expectedStyle);
    await primary
      .getByRole("button", { name: "Resources", exact: true })
      .hover();
    await expect(
      primary.getByRole("link", { name: "Locations", exact: true }),
    ).toBeVisible();
    await primary
      .getByRole("button", { name: "Resources", exact: true })
      .click();
    await expect(
      primary.getByRole("link", { name: "Locations", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      primary.getByRole("link", { name: "Locations", exact: true }),
    ).not.toBeVisible();
  }
});

test("mobile Resources navigation closes after choosing Locations and preserves the menu controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/courses/");
  const header = page.locator(".site-header");
  await header.getByRole("button", { name: "Open menu" }).click();
  const primary = header.getByRole("navigation", { name: "Primary" });
  await expect(primary).toBeVisible();
  await primary.getByRole("button", { name: "Resources", exact: true }).click();
  await primary.getByRole("link", { name: "Locations", exact: true }).click();
  await expect(page).toHaveURL(/\/locations\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(primary).not.toBeVisible();
  await expect(
    header.getByRole("button", { name: "Open menu" }),
  ).toHaveAttribute("aria-expanded", "false");
  await header.getByRole("button", { name: "Open menu" }).click();
  await page.keyboard.press("Escape");
  await expect(header.getByRole("button", { name: "Open menu" })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("Free Demo opens a styled, usable dialog on account pages", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Free Demo", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Free demo registration" });
  await expect(
    dialog.getByRole("textbox", { name: /Full Name/ }),
  ).toBeVisible();
  await expect(page.locator(".rp-overlay")).toHaveCSS("position", "fixed");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("the shared logo returns to the top of home from inner pages and home sections", async ({
  page,
}) => {
  await page.goto("/courses/");
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Coding Hubs School of AI home", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#home$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "AI learning",
  );
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Coding Hubs School of AI home", exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(200);
});
