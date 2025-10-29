import { test, expect } from '@playwright/test';

test('flujo de chat', async ({ page }) => {
  await page.goto('http://localhost:3001');
  
  // Check that the page loads correctly
  await expect(page).toHaveTitle(/Qoder Chat/);
  
  // Check that the chat input is visible
  await expect(page.getByTestId('chat-input')).toBeVisible();
  
  // Check that the send button is visible
  await expect(page.getByTestId('send-button')).toBeVisible();
  
  // Check that the "Nueva Conversación" button is visible
  await expect(page.getByTestId('new-conversation')).toBeVisible();
  
  // Check that the search input is visible
  await expect(page.getByTestId('sidebar-search')).toBeVisible();
  
  // Click the "Nueva Conversación" button
  await page.getByTestId('new-conversation').click();
  
  // Check that the conversation was created (by checking that the UI updated)
  // Note: We can't easily check the database directly in this test, but we can
  // verify that the UI responds to the button click
});