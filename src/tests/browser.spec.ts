import { test, expect } from '@playwright/test';

test.describe('EyeControl Rebuild Browser Navigation & Accessibility', () => {
  test('loads setup page with camera preview and input method chooser', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/EyeControl/);

    // Setup page elements
    await expect(page.locator('text=EyeControl Setup')).toBeVisible();
    await expect(page.locator('#btn-start-camera')).toBeVisible();
    await expect(page.locator('#select-eye-mode')).toBeVisible();
    await expect(page.locator('#select-head-mode')).toBeVisible();
    await expect(page.locator('#btn-proceed-calibration')).toBeVisible();
  });

  test('switches input mode between eye gaze and head movement', async ({ page }) => {
    await page.goto('/');

    // Select head mode
    await page.click('#select-head-mode');
    await expect(page.locator('text=Head-Movement Mode')).toBeVisible();

    // Select eye mode
    await page.click('#select-eye-mode');
    await expect(page.locator('text=Eye-Gaze Mode')).toBeVisible();
  });

  test('opens and closes accessible settings drawer', async ({ page }) => {
    await page.goto('/');

    // Open settings drawer
    await page.click('#btn-open-settings');
    await expect(page.locator('#settings-drawer-title')).toBeVisible();
    await expect(page.locator('#setting-btn-recalibrate')).toBeVisible();

    // Close settings drawer
    await page.click('#btn-close-settings');
    await expect(page.locator('#settings-drawer-title')).not.toBeVisible();
  });
});
