import { expect, test } from "@playwright/test";
const user = {
  id: 42,
  username: "asha",
  first_name: "Asha",
  last_name: "Sharma",
  email: "asha@gmail.com",
  phone: "",
  date_joined: "",
  avatar_url: "https://lh3.googleusercontent.com/a/test-photo",
};
test.beforeEach(async ({ page, context }) => {
  await page.addInitScript((profile) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("ch_access", "expired-access");
      localStorage.setItem("ch_persistent_session", "1");
      localStorage.setItem("ch_user", JSON.stringify(profile));
      sessionStorage.setItem("seeded", "1");
    }
  }, user);
  await context.route(
    "https://lh3.googleusercontent.com/a/test-photo",
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="#2563eb"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="20">A</text></svg>',
      }),
  );
  await context.route("**/api/auth/session/", (route) =>
    route.fulfill({
      json: { user, access: "restored-access", persistent: true },
    }),
  );
  await context.route("**/api/auth/me/", (route) =>
    route.fulfill({ json: user }),
  );
  await context.route("**/api/enrollments/me/", (route) =>
    route.fulfill({ json: [] }),
  );
});
test("photo replaces Login and account disclosure navigates and closes with keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Account menu for Asha Sharma",
  });
  await expect(trigger.getByRole("img")).toBeVisible();
  await expect(
    page.locator(".site-header").getByRole("link", { name: "Log in" }),
  ).toHaveCount(0);
  await trigger.click();
  const panel = page.locator(".sh-account-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(user.email);
  await expect(panel.getByRole("link")).toHaveText([
    "Profile↗",
    "User Dashboard↗",
  ]);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await panel.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/my-account$/);
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await expect(panel).toBeHidden();
});
test("reload restores cookie session even without an access token", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("ch_access"));
  await page.reload();
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ch_access"))).toBe(
    "restored-access",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("ch_refresh")),
  ).toBeNull();
  await page.evaluate(() => localStorage.removeItem("ch_access"));
  await page.goto("/my-account");
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await expect(page).toHaveURL(/\/my-account$/);
});
test("temporary network errors preserve login", async ({ page }) => {
  await page.route("**/api/auth/session/", (route) =>
    route.fulfill({ status: 503, json: { detail: "Temporarily unavailable" } }),
  );
  await page.route("**/api/auth/me/", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/");
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ch_persistent_session")),
  ).toBe("1");
});
test("Logout clears account and revokes server session", async ({ page }) => {
  let logouts = 0;
  await page.route("**/api/auth/logout/", async (route) => {
    logouts++;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/");
  await page.locator(".sh-account-trigger").click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.locator(".sh-login")).toBeVisible();
  expect(logouts).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("ch_access")),
  ).toBeNull();
  await page.reload();
  await expect(page.locator(".sh-account-trigger")).toHaveCount(0);
});
test("mobile drawer fits and missing images use initials", async ({ page }) => {
  await page.route("https://lh3.googleusercontent.com/a/test-photo", (route) =>
    route.abort(),
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator('.site-header').getByRole('button', { name: 'Book Free Demo', exact: true })).toBeVisible();
    const trigger = page.locator(".sh-account-trigger");
    await trigger.click();
    const panel = page.locator(".sh-account-panel");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await expect(trigger).toContainText("AS");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.mouse.click(5, 220);
    await expect(panel).toBeHidden();
  }
});

test('navigation and account dropdowns are mutually exclusive', async ({ page }) => {
  await page.goto('/');
  const account = page.locator('.sh-account-trigger');
  const courses = page.locator('.site-header').getByRole('button', { name: 'Courses', exact: true });
  await account.click();
  await expect(page.locator('.sh-account-panel')).toBeVisible();
  await courses.hover();
  await expect(courses).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.sh-account-panel')).toBeHidden();
  await account.click();
  await expect(courses).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.sh-account-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
});

test("logout in another tab immediately removes the avatar", async ({
  page,
  context,
}) => {
  await page.route("**/api/auth/logout/", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/");
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  const other = await context.newPage();
  await other.goto("/login");
  await expect(other.locator(".sh-account-trigger")).toBeVisible();
  await page.locator(".sh-account-trigger").click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(other.locator(".sh-login")).toBeVisible();
  await expect(other.locator(".sh-account-trigger")).toHaveCount(0);
});

test("existing JWT users restore after access expiration and refresh rotation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem("ch_persistent_session");
    localStorage.setItem("ch_access", "expired-access");
    localStorage.setItem("ch_refresh", "legacy-refresh");
  });
  await page.route("**/api/auth/refresh/", (route) =>
    route.fulfill({
      json: { access: "new-access", refresh: "rotated-refresh" },
    }),
  );
  await page.route("**/api/auth/me/", (route) =>
    route.request().headers().authorization === "Bearer new-access"
      ? route.fulfill({ json: user })
      : route.fulfill({ status: 401, json: { detail: "Expired" } }),
  );
  await page.reload();
  await expect(page.locator(".sh-account-trigger")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ch_refresh"))).toBe(
    "rotated-refresh",
  );
});

test("offline logout stays signed out after reload and revokes on reconnect", async ({
  page,
}) => {
  await page.route("**/api/auth/logout/", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/");
  await page.locator(".sh-account-trigger").click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.locator(".sh-login")).toBeVisible();
  await page.reload();
  await expect(page.locator(".sh-login")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ch_pending_logout")),
  ).toBe("1");
  await page.unroute("**/api/auth/logout/");
  await page.route("**/api/auth/logout/", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("ch_pending_logout")))
    .toBeNull();
  await expect(page.locator(".sh-account-trigger")).toHaveCount(0);
});

test("Store and My Orders are removed from the menu, profile and old routes", async ({
  page,
}) => {
  await page.goto("/my-account");
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await page.locator(".sh-account-trigger").click();
  await expect(page.locator(".sh-account-panel").getByRole("link")).toHaveText([
    "Profile↗",
    "User Dashboard↗",
  ]);
  await expect(
    page.getByRole("navigation", { name: "Store", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: /My orders|My downloads|View my orders|Cart|All products/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Bought as a guest?" }),
  ).toHaveCount(0);
  for (const path of [
    "/store",
    "/store/old-product",
    "/cart",
    "/checkout",
    "/payment/success",
    "/my-account/orders",
    "/my-account/downloads",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We could not find that page" }),
    ).toBeVisible();
    await expect(page.locator(".sh-account-trigger")).toBeVisible();
  }
});
