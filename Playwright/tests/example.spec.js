// @ts-check
import { test, expect } from '@playwright/test';

// Configuration
const baseURL =
  process.env.BASE_URL ||
  'https://4.186.12.176:90/account/devlogin';

const username =
  process.env.EMAIL ||
  'jayant.x.jhanwar@haleon.com';

const password =
  process.env.PASSWORD ||
  '123456';

const role =
  process.env.ROLE ||
  'HOAdmin';

const activityPlanningURL =
  'https://4.186.12.176:90/ActivityPlan/Index';

test('Login successfully and navigate to Activity Planning page', async ({ page, context }) => {
  // Open login page
  await page.goto(baseURL, {
    waitUntil: 'networkidle',
  });

  // Fill Email
  await page.fill(
    'input[type="email"], input[name="Email"], input[placeholder*="email" i]',
    username
  );

  // Fill Password
  await page.fill(
    'input[type="password"], input[name="Password"], input[placeholder*="password" i]',
    password
  );

  // Select Role if dropdown exists
  const roleSelector = page.locator(
    'select, [role="combobox"], input[placeholder*="Role" i]'
  );

  if (await roleSelector.count()) {
    if (await roleSelector.first().isVisible().catch(() => false)) {
      await roleSelector.first().selectOption({ label: role }).catch(async () => {
        await roleSelector.first().selectOption(role);
      });
    }
  }

  // Click Login button
  await page.getByRole('button', {
    name: /login|submit|sign in/i,
  }).click();

  // Wait for page to load after login
  await page.waitForLoadState('networkidle');

  // Verify user is redirected to Dashboard
  await expect(page).toHaveURL(/Dashboard/i);

  // Small wait to ensure menus are rendered
  await page.waitForTimeout(2000);

  // ==========================================
  // Click on "Activity Plans" Main Menu
  // ==========================================
  const activityPlansMenu = page.getByRole('link', {
    name: /activity plans?/i,
  });

  await expect(activityPlansMenu).toBeVisible({
    timeout: 10000,
  });

  await activityPlansMenu.click();

  // Wait for submenu to expand
  await page.waitForTimeout(1000);

  // ==========================================
  // Click on "Activity Planning" Sub Menu
  // ==========================================
  const activityPlanningSubMenu = page.getByRole('link', {
    name: /^Activity Planning$/i,
  });

  await expect(activityPlanningSubMenu).toBeVisible({
    timeout: 10000,
  });

  await activityPlanningSubMenu.click();

  // Wait for Activity Planning page to load
  await page.waitForLoadState('networkidle');

  // Verify exact URL
  await expect(page).toHaveURL(activityPlanningURL);

  // Alternative URL verification
  await expect(page).toHaveURL(/ActivityPlan\/Index/i);

  // Optional: Verify page heading
  // await expect(
  //   page.getByRole('heading', { name: /activity planning/i })
  // ).toBeVisible();

  // Pause for debugging
  await page.pause();
});