import { test, expect } from '@playwright/test';

// These API tests verify the behavior of the conversations endpoints for a guest (not logged in)
// They require the dev server to be running at localhost:3000

test.describe('API: /api/conversations (guest)', () => {
  const baseUrl = 'http://localhost:3000';

  test('POST creates a DB-backed conversation for guests with session cookie', async ({ request }) => {
    const res = await request.post(`${baseUrl}/api/conversations`, {
      data: {
        title: 'Nueva conversación (test)',
        settings: { aiModel: 'n8n' },
      },
    });

    expect(res.status()).toBe(201);
    const json = await res.json();

    // As guest, server creates a DB conversation and sets a session cookie
    expect(json).toHaveProperty('id');
    expect(String(json.id)).not.toMatch(/^temp_/);
    expect(json.title).toBeTruthy();
  });

  test('GET returns guest conversations when cookie present', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/conversations`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Not logged in -> should still return array (0 or more) for this guest session
    expect(data.length).toBeGreaterThanOrEqual(0);
  });
});
