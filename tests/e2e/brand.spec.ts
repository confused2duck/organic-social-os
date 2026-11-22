import { test, expect } from "@playwright/test";

// Priority 4 — full Company Intelligence flow in a single context (cookies must
// persist across the steps): create a company, confirm missing-info flagging,
// add structured brand data, verify persistence, and verify isolation.
test("Company Intelligence end-to-end via the UI", async ({ page }) => {
  const NAME = `E2E Brand Co ${Date.now()}`;

  // 1) Create a company from scratch.
  await page.goto("/onboarding");
  await page.getByLabel("Company name *").fill(NAME);
  await page.getByLabel("Industry").fill("B2B SaaS — Testing");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL("**/brand");
  await expect(page.getByRole("heading", { level: 2, name: "Company & Brand Intelligence" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(NAME) })).toBeVisible();

  // 2) New company flags missing essentials (no fabrication).
  await expect(page.getByText(/essential item\(s\) missing/)).toBeVisible();
  await expect(page.getByText(/products or services/)).toBeVisible();

  // 3) Add a product through the UI.
  await page.getByRole("tab", { name: "Products" }).click();
  await page.getByPlaceholder("Product / service name").fill("Test Analytics Suite");
  await page.getByPlaceholder("Short description").fill("A product entered through the UI during E2E testing.");
  await page.getByRole("button", { name: /Add product\/service/ }).click();
  await expect(page.getByText("Test Analytics Suite")).toBeVisible();

  // 4) Persists across reload, and completeness updates.
  await page.reload();
  await page.getByRole("tab", { name: "Products" }).click();
  await expect(page.getByText("Test Analytics Suite")).toBeVisible();
  await expect(page.getByText(/products or services/)).toHaveCount(0);

  // 5) Isolation: switch to a demo company — its data is intact, the E2E product is absent.
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(NAME) }).first().click();
  await page.getByRole("menuitem", { name: /Northwind Analytics/ }).click();
  await expect(page.getByRole("heading", { name: "Northwind Analytics" })).toBeVisible();
  await page.goto("/brand");
  await page.getByRole("tab", { name: "Products" }).click();
  await expect(page.getByText("Northwind Dashboards")).toBeVisible();
  await expect(page.getByText("Test Analytics Suite")).toHaveCount(0);
});
