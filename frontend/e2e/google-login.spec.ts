import { expect, test } from "@playwright/test";

const googleSdk = `
window.google={accounts:{id:{
 initialize(options){window.googleTestCallback=options.callback;},
 renderButton(parent){const button=document.createElement('button');button.type='button';button.textContent='Continue with Google';button.addEventListener('click',()=>window.googleTestCallback({credential:'signed-google-fixture'}));parent.replaceChildren(button);}
}}};`;
const user = {
  id: 42,
  username: "google-learner",
  email: "learner@gmail.com",
  phone: "",
  first_name: "Asha",
  last_name: "",
  date_joined: "2026-01-01T00:00:00Z",
};

test("Google button signs a new user in and opens the account dashboard", async ({
  page,
}) => {
  let sent: unknown;
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({ contentType: "text/javascript", body: googleSdk }),
  );
  await page.route("**/api/auth/google/", async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({
        json: { client_id: "test.apps.googleusercontent.com" },
      });
    else {
      sent = route.request().postDataJSON();
      await route.fulfill({
        json: {
          user,
          access: "site-access-token",
          refresh: "site-refresh-token",
        },
      });
    }
  });
  await page.route("**/api/auth/me/", (route) => route.fulfill({ json: user }));
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(sent).toEqual({
    credential: "signed-google-fixture",
    persistent: true,
  });
});

test("existing non-Gmail accounts confirm their password before Google linking", async ({
  page,
}) => {
  const sent: unknown[] = [];
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({ contentType: "text/javascript", body: googleSdk }),
  );
  await page.route("**/api/auth/google/", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: { client_id: "test.apps.googleusercontent.com" },
      });
      return;
    }
    const payload = route.request().postDataJSON();
    sent.push(payload);
    if (!payload.password)
      await route.fulfill({
        status: 409,
        json: {
          code: "account_link_required",
          email: "learner@example.com",
          detail:
            "Enter your existing Coding Hubs password once to connect this Google account.",
        },
      });
    else
      await route.fulfill({
        json: {
          user: { ...user, email: "learner@example.com" },
          access: "site-access-token",
          refresh: "site-refresh-token",
        },
      });
  });
  await page.route("**/api/auth/me/", (route) =>
    route.fulfill({ json: { ...user, email: "learner@example.com" } }),
  );
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "existing Coding Hubs password",
  );
  await expect(page.locator("#username")).toHaveValue("learner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("existing-password");
  await page.getByRole("button", { name: "Link Google & log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(sent).toEqual([
    { credential: "signed-google-fixture", persistent: true },
    {
      credential: "signed-google-fixture",
      password: "existing-password",
      persistent: true,
    },
  ]);
});

test("missing Google configuration has a clear state and preserves password login", async ({
  page,
}) => {
  await page.route("**/api/auth/google/", (route) =>
    route.fulfill({ json: { client_id: "" } }),
  );
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("textbox", { name: "Email or username" }),
  ).toBeVisible();
});

test("a failed Google SDK load can be retried without duplicating the sign-in button", async ({
  page,
}) => {
  let loads = 0;
  await page.route("**/api/auth/google/", (route) =>
    route.fulfill({ json: { client_id: "test.apps.googleusercontent.com" } }),
  );
  await page.route("https://accounts.google.com/gsi/client", async (route) => {
    loads++;
    if (loads === 1) await route.abort();
    else
      await route.fulfill({ contentType: "text/javascript", body: googleSdk });
  });
  await page.goto("/login");
  await expect(page.getByRole("alert")).toContainText("could not load");
  await page.getByRole("button", { name: "Try Google again" }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
});

test("blue call-to-action buttons preserve readable text contrast", async ({
  page,
}) => {
  await page.goto("/");
  for (const button of [
    page.locator(".site-header .sh-demo").last(),
    page.locator(".join-actions .btn-yellow"),
  ]) {
    const ratio = await button.evaluate((element) => {
      const styles = getComputedStyle(element);
      const luminance = (color: string) => {
        const components = (color.match(/[\d.]+/g) || [])
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return (
          components[0] * 0.2126 +
          components[1] * 0.7152 +
          components[2] * 0.0722
        );
      };
      const foreground = luminance(styles.color),
        background = luminance(styles.backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
});
