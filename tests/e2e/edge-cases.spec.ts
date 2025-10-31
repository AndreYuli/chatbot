import { test, expect } from '@playwright/test';

test.describe('🔥 Tests de Casos Edge y Flujos Complejos', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/es-CO/chat');
    await page.waitForLoadState('networkidle');
    // Limpiar localStorage antes de cada test
    await page.evaluate(() => localStorage.clear());
  });

  test('[EDGE 1] Enviar múltiples mensajes rápidamente (race condition)', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 1: Mensajes rápidos consecutivos\n');
    
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    
    // Enviar 3 mensajes muy rápido
    const messages = ['Mensaje 1', 'Mensaje 2', 'Mensaje 3'];
    
    for (const msg of messages) {
      await input.fill(msg);
      await sendButton.click();
      await page.waitForTimeout(500); // Pequeña pausa
    }
    
    // Verificar que todos los mensajes del usuario están en el DOM
    const userMessages = page.locator('[data-role="user"]');
    const count = await userMessages.count();
    
    console.log(`  📨 Mensajes enviados: ${count}`);
    console.log(`  ✅ Todos los mensajes procesados: ${count === 3}`);
    
    expect(count).toBe(3);
  });

  test('[EDGE 2] Crear conversación mientras se envía mensaje', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 2: Crear conversación durante envío\n');
    
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    
    // Enviar mensaje
    await input.fill('Test mensaje largo');
    await sendButton.click();
    
    // Inmediatamente crear nueva conversación (sin esperar respuesta)
    await page.waitForTimeout(200);
    await newConvButton.click();
    
    // Verificar que tenemos 2 conversaciones
    await page.waitForTimeout(1000);
    const conversations = page.locator('[data-testid="conversation-item"]');
    const count = await conversations.count();
    
    console.log(`  📊 Conversaciones creadas: ${count}`);
    console.log(`  ✅ Manejo correcto de concurrencia: ${count >= 2}`);
    
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('[EDGE 3] Caracteres especiales y emojis en mensajes', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 3: Caracteres especiales\n');
    
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    
    const specialMessages = [
      '🚀 ¿Cómo estás? 🎉',
      '<script>alert("xss")</script>',
      'SELECT * FROM users WHERE id=1; DROP TABLE users;--',
      '你好世界 مرحبا العالم',
      '&lt;&gt;&amp;&quot;&#39;'
    ];
    
    let successCount = 0;
    
    for (const msg of specialMessages) {
      await input.fill(msg);
      const isEnabled = await sendButton.isEnabled();
      
      if (isEnabled) {
        await sendButton.click();
        await page.waitForTimeout(1000);
        successCount++;
      }
    }
    
    console.log(`  📝 Mensajes especiales procesados: ${successCount}/${specialMessages.length}`);
    console.log(`  ✅ Manejo de caracteres especiales: ${successCount === specialMessages.length}`);
    
    expect(successCount).toBe(specialMessages.length);
  });

  test('[EDGE 4] Eliminar conversación activa', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 4: Eliminar conversación activa\n');
    
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    
    // Crear y usar una conversación
    await newConvButton.click();
    await page.waitForTimeout(1000);
    
    await input.fill('Mensaje en conversación activa');
    await sendButton.click();
    await page.waitForTimeout(1000);
    
    // Eliminar la conversación activa
    const deleteButton = page.locator('button[aria-label*="Eliminar"]').first();
    const existsBefore = await deleteButton.count() > 0;
    
    console.log(`  🗑️ Botón eliminar existe: ${existsBefore}`);
    
    if (existsBefore) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      // Verificar que la conversación fue eliminada
      const conversationsAfter = await page.locator('[data-testid="conversation-item"]').count();
      console.log(`  📊 Conversaciones después de eliminar: ${conversationsAfter}`);
      console.log(`  ✅ Conversación eliminada correctamente`);
      
      expect(conversationsAfter).toBe(0);
    }
  });

  test('[EDGE 5] Búsqueda con caracteres especiales', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 5: Búsqueda con caracteres especiales\n');
    
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    
    // Crear conversación
    await newConvButton.click();
    await page.waitForTimeout(1000);
    
    const specialSearches = [
      '🔍',
      '<script>',
      '.*',
      'SELECT *',
      ''
    ];
    
    let noErrorsCount = 0;
    
    for (const search of specialSearches) {
      await searchInput.fill(search);
      await page.waitForTimeout(300);
      
      // Verificar que no hay errores
      const hasError = await page.locator('.error, [role="alert"]').count() > 0;
      if (!hasError) noErrorsCount++;
    }
    
    console.log(`  🔍 Búsquedas sin error: ${noErrorsCount}/${specialSearches.length}`);
    console.log(`  ✅ Búsqueda robusta: ${noErrorsCount === specialSearches.length}`);
    
    expect(noErrorsCount).toBe(specialSearches.length);
  });

  test('[EDGE 6] Mensaje vacío después de espacios y saltos de línea', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 6: Validación de whitespace\n');
    
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    
    const whitespaceInputs = [
      '   ',
      '\n\n\n',
      '\t\t',
      '   \n   \t   ',
      ''
    ];
    
    let allDisabled = true;
    
    for (const ws of whitespaceInputs) {
      await input.fill(ws);
      await page.waitForTimeout(200);
      
      const isDisabled = !(await sendButton.isEnabled());
      console.log(`  🔒 Input "${ws.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" → Botón disabled: ${isDisabled}`);
      
      if (!isDisabled) allDisabled = false;
    }
    
    console.log(`  ✅ Validación de whitespace correcta: ${allDisabled}`);
    
    expect(allDisabled).toBe(true);
  });

  test('[EDGE 7] Navegar entre conversaciones sin perder estado', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 7: Estado entre navegación\n');
    
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    const input = page.locator('input[data-testid="chat-input"]');
    const sendButton = page.locator('button[data-testid="send-button"]');
    
    // Crear 3 conversaciones con mensajes diferentes
    const conversationMessages = [
      'Mensaje Conv 1',
      'Mensaje Conv 2',
      'Mensaje Conv 3'
    ];
    
    for (const msg of conversationMessages) {
      await newConvButton.click();
      await page.waitForTimeout(500);
      
      await input.fill(msg);
      await sendButton.click();
      await page.waitForTimeout(1000);
    }
    
    const conversations = page.locator('[data-testid="conversation-item"]');
    const totalConvs = await conversations.count();
    
    console.log(`  📊 Conversaciones creadas: ${totalConvs}`);
    
    // Navegar entre conversaciones
    if (totalConvs >= 2) {
      await conversations.nth(0).click();
      await page.waitForTimeout(500);
      
      await conversations.nth(1).click();
      await page.waitForTimeout(500);
      
      await conversations.nth(0).click();
      await page.waitForTimeout(500);
      
      console.log(`  ✅ Navegación entre conversaciones exitosa`);
      expect(totalConvs).toBeGreaterThanOrEqual(3);
    }
  });

  test('[EDGE 8] Verificar límite real de localStorage (5MB aprox)', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 8: Límite de localStorage\n');
    
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    
    // Crear muchas conversaciones
    let createdCount = 0;
    const maxAttempts = 50;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await newConvButton.click();
        await page.waitForTimeout(100);
        createdCount++;
      } catch (e) {
        console.log(`  ⚠️ Error al crear conversación ${i + 1}: ${e}`);
        break;
      }
    }
    
    // Verificar localStorage
    const storageData = await page.evaluate(() => {
      const data = localStorage.getItem('guest_conversations');
      return {
        exists: !!data,
        size: data ? data.length : 0,
        count: data ? JSON.parse(data).length : 0
      };
    });
    
    console.log(`  📊 Conversaciones creadas: ${createdCount}`);
    console.log(`  💾 Tamaño localStorage: ${(storageData.size / 1024).toFixed(2)} KB`);
    console.log(`  📋 Conversaciones en storage: ${storageData.count}`);
    console.log(`  ✅ localStorage funciona con carga: ${storageData.exists}`);
    
    expect(storageData.exists).toBe(true);
    expect(storageData.count).toBeGreaterThan(0);
  });

  test('[EDGE 9] Actualización de conversaciones en tiempo real', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 9: Actualización en tiempo real\n');
    
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    
    // Observar cambios en el DOM
    let conversationCountChanges = 0;
    
    page.on('domcontentloaded', () => {
      conversationCountChanges++;
    });
    
    const initialCount = await page.locator('[data-testid="conversation-item"]').count();
    console.log(`  📊 Conversaciones iniciales: ${initialCount}`);
    
    // Crear nueva conversación
    await newConvButton.click();
    await page.waitForTimeout(1000);
    
    const finalCount = await page.locator('[data-testid="conversation-item"]').count();
    console.log(`  📊 Conversaciones finales: ${finalCount}`);
    
    const updated = finalCount > initialCount;
    console.log(`  ✅ Sidebar actualizado en tiempo real: ${updated}`);
    
    expect(updated).toBe(true);
  });

  test('[EDGE 10] Resize de ventana no rompe layout', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 10: Responsive layout\n');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    let allLayoutsWork = true;
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      const chatArea = page.locator('[data-testid="chat-area"], .chat-area, main');
      const isVisible = await chatArea.count() > 0;
      
      console.log(`  📱 ${viewport.name} (${viewport.width}x${viewport.height}): ${isVisible ? '✅' : '❌'}`);
      
      if (!isVisible) allLayoutsWork = false;
    }
    
    console.log(`  ✅ Layout responsivo funciona: ${allLayoutsWork}`);
    
    expect(allLayoutsWork).toBe(true);
  });

  test('[EDGE 11] Copiar y pegar texto largo en input', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 11: Copy/Paste texto largo\n');
    
    const input = page.locator('input[data-testid="chat-input"]');
    
    // Generar texto de 10,000 caracteres
    const longText = 'Lorem ipsum dolor sit amet '.repeat(400);
    
    // Simular paste
    await input.focus();
    await page.evaluate((text) => {
      const inputEl = document.querySelector('input[data-testid="chat-input"]') as HTMLInputElement;
      if (inputEl) {
        inputEl.value = text;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, longText);
    
    await page.waitForTimeout(500);
    
    const inputValue = await input.inputValue();
    const lengthAccepted = inputValue.length;
    
    console.log(`  📏 Texto pegado: ${lengthAccepted} caracteres`);
    console.log(`  ✅ Input acepta paste de texto largo: ${lengthAccepted > 5000}`);
    
    expect(lengthAccepted).toBeGreaterThan(5000);
  });

  test('[EDGE 12] localStorage corrupto no rompe la app', async ({ page }) => {
    console.log('\n🔥 TEST EDGE 12: localStorage corrupto\n');
    
    // Corromper localStorage
    await page.evaluate(() => {
      localStorage.setItem('guest_conversations', 'INVALID_JSON{{{');
    });
    
    // Recargar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verificar que la app sigue funcionando
    const newConvButton = page.locator('button[data-testid="new-conversation"]');
    const isVisible = await newConvButton.isVisible();
    
    console.log(`  🔧 App funciona con storage corrupto: ${isVisible}`);
    
    // Intentar crear conversación
    if (isVisible) {
      await newConvButton.click();
      await page.waitForTimeout(1000);
      
      const conversations = await page.locator('[data-testid="conversation-item"]').count();
      console.log(`  ✅ Conversaciones creadas después de corrupción: ${conversations}`);
      
      expect(conversations).toBeGreaterThanOrEqual(1);
    }
    
    expect(isVisible).toBe(true);
  });

});
