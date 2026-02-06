import { test, expect } from '@playwright/test';

test.describe('Dashboard App', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login or show login UI
    await expect(page.locator('text=로그인').or(page.locator('text=GitHub'))).toBeVisible({ timeout: 10000 });
  });

  test('login page has GitHub OAuth button', async ({ page }) => {
    await page.goto('/login');
    const githubButton = page.locator('text=GitHub');
    await expect(githubButton).toBeVisible({ timeout: 10000 });
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gary Agent Dashboard/);
  });
});
