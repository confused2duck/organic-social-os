import { test, expect } from "@playwright/test";

test.describe("Organic Social OS — smoke", () => {
  test("overview renders seeded company data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Northwind Analytics" })).toBeVisible();
    await expect(page.getByText("Weekly publishing slots")).toBeVisible();
    await expect(page.getByText("Seven agent systems")).toBeVisible();
  });

  test("sidebar navigation reaches each section", async ({ page }) => {
    await page.goto("/");
    for (const [href, heading] of [
      ["/brand", "Company & Brand Intelligence"],
      ["/calendar", "Publishing Calendar"],
      ["/creative", "Creative Studio"],
      ["/analytics", "Analytics"],
      ["/traceability", "Traceability"],
    ] as const) {
      await page.goto(href);
      // The section name appears in both the topbar (h1) and the page header (h2);
      // assert the page header specifically.
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
  });

  test("traceability shows 520 organic activities", async ({ page }) => {
    await page.goto("/traceability");
    await expect(page.getByText("Organic (in scope)")).toBeVisible();
    await expect(page.getByText("520", { exact: true })).toBeVisible();
  });

  test("calendar reflects config-driven slots", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByText(/slots\/week/)).toBeVisible();
  });

  test("company switcher isolates workspaces", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Northwind Analytics/ }).first().click();
    await page.getByRole("menuitem", { name: /Verde Botanicals/ }).click();
    await expect(page.getByRole("heading", { name: "Verde Botanicals" })).toBeVisible();
  });
});
