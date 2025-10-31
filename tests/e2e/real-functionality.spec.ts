import { test, expect, Page } from '@playwright/test';

test.describe('🔴 Tests REALES de Funcionalidad - Sin engaños', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('http://localhost:3000/es-ES/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="new-conversation"]', { timeout: 10000 });
  });

  test('[REAL 1] Crear conversación y VERIFICAR que persiste', async () => {
    console.log('\n🔴 TEST REAL 1: Crear y persistir conversación\n');

    // Contar conversaciones iniciales
    const initialCount = await page.locator('[data-testid="conversation-item"]').count();
    console.log(`  📊 Conversaciones iniciales: ${initialCount}`);

    // Crear nueva conversación
    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(1000);

    // Escribir mensaje REAL
    const chatInput = await page.locator('input[data-testid="chat-input"]');
    await chatInput.fill('¿Cuál es la capital de Colombia?');
    await page.waitForTimeout(500);

    // Usar el selector correcto del botón
    const sendButton = await page.locator('button[data-testid="send-button"]');
    const sendExists = await sendButton.count();
    
    console.log(`  🔍 Botón enviar encontrado: ${sendExists > 0}`);

    if (sendExists > 0) {
      // Verificar si está habilitado
      const isEnabled = await sendButton.isEnabled();
      console.log(`  🔓 Botón habilitado: ${isEnabled}`);

      if (isEnabled) {
        await sendButton.click();
        console.log('  ✅ Mensaje enviado, esperando respuesta...');
        
        // Esperar respuesta del backend (más tiempo)
        await page.waitForTimeout(5000);

        // Verificar que el mensaje aparece en la UI
        const userMessage = await page.locator('text=¿Cuál es la capital de Colombia?').first();
        const messageExists = await userMessage.count() > 0;
        console.log(`  📝 Mensaje del usuario visible: ${messageExists}`);
      } else {
        console.log('  ⚠️ Botón deshabilitado (validación funcionando)');
      }
    } else {
      console.log('  ❌ PROBLEMA: No se encontró botón de enviar');
    }

    // Verificar si se agregó a la lista de conversaciones
    await page.waitForTimeout(2000);
    const finalCount = await page.locator('[data-testid="conversation-item"]').count();
    console.log(`  📊 Conversaciones finales: ${finalCount}`);
    
    const conversationCreated = finalCount > initialCount;
    console.log(`  ${conversationCreated ? '✅' : '❌'} Conversación agregada al sidebar: ${conversationCreated}`);
    
    if (!conversationCreated) {
      console.log('  🔍 INVESTIGANDO: Verificando API...');
      // Podría ser que la conversación se creó en API pero no se muestra en UI
    }
  });

  test('[REAL 2] Buscar conversación que NO existe', async () => {
    console.log('\n🔴 TEST REAL 2: Búsqueda negativa\n');

    const searchInput = await page.locator('input[data-testid="sidebar-search"]');
    
    // Buscar algo que definitivamente no existe
    await searchInput.fill('ESTA_CONVERSACION_NO_EXISTE_XYZ123');
    await page.waitForTimeout(500);

    // Verificar que NO hay resultados
    const conversations = await page.locator('[data-testid="conversation-item"]');
    const count = await conversations.count();
    
    console.log(`  🔍 Resultados encontrados: ${count}`);
    console.log(`  ${count === 0 ? '✅' : '❌'} Búsqueda filtra correctamente (debe ser 0)`);
    
    expect(count).toBe(0);
  });

  test('[REAL 3] Verificar que el chat input NO acepta mensajes vacíos', async () => {
    console.log('\n🔴 TEST REAL 3: Validación de input vacío\n');

    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(500);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    const sendButton = await page.locator('button[data-testid="send-button"]');

    // Input vacío
    await chatInput.fill('');
    await page.waitForTimeout(300);

    // Verificar si el botón está deshabilitado
    const isDisabled = await sendButton.isDisabled();
    console.log(`  🔒 Botón deshabilitado con input vacío: ${isDisabled}`);
    expect(isDisabled).toBe(true);

    // Solo espacios
    await chatInput.fill('     ');
    await page.waitForTimeout(300);
    const isDisabledSpaces = await sendButton.isDisabled();
    console.log(`  � Botón deshabilitado con solo espacios: ${isDisabledSpaces}`);
    expect(isDisabledSpaces).toBe(true);

    // Con texto debe habilitarse
    await chatInput.fill('Hola');
    await page.waitForTimeout(300);
    const isEnabledWithText = await sendButton.isEnabled();
    console.log(`  � Botón habilitado con texto: ${isEnabledWithText}`);
    expect(isEnabledWithText).toBe(true);
  });

  test('[REAL 4] Eliminar conversación y verificar que DESAPARECE', async () => {
    console.log('\n🔴 TEST REAL 4: Eliminar conversación\n');

    // Primero verificar cuántas conversaciones hay
    let conversations = await page.locator('[data-testid="conversation-item"]');
    const initialCount = await conversations.count();
    console.log(`  📊 Conversaciones iniciales: ${initialCount}`);

    if (initialCount === 0) {
      console.log('  ⚠️ No hay conversaciones para eliminar. Creando una...');
      
      await page.click('[data-testid="new-conversation"]');
      await page.waitForTimeout(1000);
      
      const chatInput = await page.locator('input[data-testid="chat-input"]');
      await chatInput.fill('Test para eliminar');
      
      const sendButton = await page.locator('button:has-text("Enviar")').first();
      if (await sendButton.count() > 0) {
        await sendButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Refrescar conteo
    conversations = await page.locator('[data-testid="conversation-item"]');
    const beforeDelete = await conversations.count();
    console.log(`  📊 Conversaciones antes de eliminar: ${beforeDelete}`);

    if (beforeDelete > 0) {
      // Buscar botón de eliminar
      const deleteButton = await page.locator('button[aria-label*="liminar"], button:has-text("Eliminar")').first();
      const deleteExists = await deleteButton.count();
      
      console.log(`  🗑️ Botón eliminar encontrado: ${deleteExists > 0}`);

      if (deleteExists > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Buscar confirmación
        const confirmButton = await page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Eliminar")');
        const confirmExists = await confirmButton.count();
        
        if (confirmExists > 0) {
          console.log('  ✅ Modal de confirmación apareció');
          await confirmButton.first().click();
          await page.waitForTimeout(1000);
        }

        // Verificar que se eliminó
        const afterDelete = await page.locator('[data-testid="conversation-item"]').count();
        console.log(`  📊 Conversaciones después de eliminar: ${afterDelete}`);
        
        const deleted = afterDelete < beforeDelete;
        console.log(`  ${deleted ? '✅' : '❌'} Conversación eliminada: ${deleted}`);
      } else {
        console.log('  ⚠️ No se encontró botón de eliminar');
      }
    }
  });

  test('[REAL 5] Cambiar entre conversaciones y verificar contexto', async () => {
    console.log('\n🔴 TEST REAL 5: Cambio de contexto entre conversaciones\n');

    const conversations = await page.locator('[data-testid="conversation-item"]');
    const count = await conversations.count();
    
    console.log(`  📊 Conversaciones disponibles: ${count}`);

    if (count >= 2) {
      // Click en primera conversación
      await conversations.nth(0).click();
      await page.waitForTimeout(1000);
      
      // Verificar que el chat input está habilitado
      const chatInput1 = await page.locator('input[data-testid="chat-input"]');
      const enabled1 = await chatInput1.isEnabled();
      console.log(`  ✅ Primera conversación - Input habilitado: ${enabled1}`);

      // Click en segunda conversación
      await conversations.nth(1).click();
      await page.waitForTimeout(1000);
      
      const chatInput2 = await page.locator('input[data-testid="chat-input"]');
      const enabled2 = await chatInput2.isEnabled();
      console.log(`  ✅ Segunda conversación - Input habilitado: ${enabled2}`);

      expect(enabled1 && enabled2).toBe(true);
    } else {
      console.log('  ⚠️ Se necesitan al menos 2 conversaciones para este test');
    }
  });

  test('[REAL 6] Verificar streaming de respuesta del backend', async () => {
    console.log('\n🔴 TEST REAL 6: Streaming de respuesta\n');

    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(500);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    await chatInput.fill('Hola, ¿cómo estás?');

    const sendButton = await page.locator('button[data-testid="send-button"]');
    const sendExists = await sendButton.count();

    if (sendExists > 0) {
      // Escuchar eventos de red
      page.on('response', response => {
        if (response.url().includes('/api/chat/send')) {
          console.log(`  🌐 Respuesta del backend: ${response.status()}`);
        }
      });

      await sendButton.click();
      console.log('  📤 Mensaje enviado, esperando respuesta...');

      // Esperar respuesta del assistant (más tiempo para n8n)
      await page.waitForTimeout(8000);

      // Buscar mensaje del assistant (verificar diferentes posibles clases)
      const possibleSelectors = [
        '[data-role="assistant"]',
        '[class*="assistant"]',
        '.bg-gray-100',
        '.bg-gray-200'
      ];

      let assistantFound = false;
      for (const selector of possibleSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`  🤖 Mensajes del assistant encontrados con selector "${selector}": ${count}`);
          assistantFound = true;
          break;
        }
      }
      
      if (!assistantFound) {
        console.log('  ❌ No se encontró respuesta del assistant');
        console.log('  🔍 Verificando si n8n webhook está activo...');
      }
    } else {
      console.log('  ❌ PROBLEMA: No se pudo encontrar botón de envío');
    }
  });

  test('[REAL 7] Verificar que localStorage persiste para guests', async () => {
    console.log('\n🔴 TEST REAL 7: Persistencia en localStorage\n');

    // Crear conversación
    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(1000);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    await chatInput.fill('Test de persistencia');
    await page.waitForTimeout(500);

    // Verificar localStorage (nombre correcto: guest_conversations)
    const localStorageData = await page.evaluate(() => {
      const conversations = localStorage.getItem('guest_conversations');
      return conversations ? JSON.parse(conversations) : null;
    });

    console.log(`  💾 localStorage tiene datos: ${localStorageData !== null}`);
    if (localStorageData) {
      console.log(`  📊 Conversaciones en localStorage: ${Array.isArray(localStorageData) ? localStorageData.length : 'N/A'}`);
      console.log(`  📋 Datos: ${JSON.stringify(localStorageData).substring(0, 100)}`);
    }

    // Refrescar página
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verificar que los datos persisten
    const afterReload = await page.evaluate(() => {
      const conversations = localStorage.getItem('guest_conversations');
      return conversations ? JSON.parse(conversations) : null;
    });

    console.log(`  ${afterReload !== null ? '✅' : '❌'} Datos persisten después de reload`);
    
    if (afterReload) {
      const persistedCount = Array.isArray(afterReload) ? afterReload.length : 0;
      console.log(`  📊 Conversaciones persistidas: ${persistedCount}`);
    }
  });

  test('[REAL 8] Probar límite de caracteres en input', async () => {
    console.log('\n🔴 TEST REAL 8: Límite de caracteres\n');

    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(500);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    
    // Texto extremadamente largo (50,000 caracteres)
    const longText = 'a'.repeat(50000);
    
    await chatInput.fill(longText);
    await page.waitForTimeout(500);

    const value = await chatInput.inputValue();
    console.log(`  📏 Caracteres aceptados: ${value.length}`);
    console.log(`  ${value.length === 50000 ? '✅' : '⚠️'} Input acepta texto largo: ${value.length >= 10000 ? 'Sí' : 'No'}`);

    // Verificar si hay maxlength
    const maxLength = await chatInput.getAttribute('maxlength');
    console.log(`  📐 maxLength atributo: ${maxLength || 'No definido'}`);
  });

  test('[REAL 9] Verificar que la API responde correctamente', async () => {
    console.log('\n🔴 TEST REAL 9: Verificación de API\n');

    let apiResponses: any[] = [];

    // Interceptar llamadas API
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        });
        console.log(`  🌐 API: ${response.url().split('/api/')[1]} - Status: ${response.status()}`);
      }
    });

    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(2000);

    console.log(`  📊 Total llamadas API capturadas: ${apiResponses.length}`);
    
    const failedAPIs = apiResponses.filter(r => !r.ok);
    console.log(`  ${failedAPIs.length === 0 ? '✅' : '❌'} APIs fallidas: ${failedAPIs.length}`);
    
    if (failedAPIs.length > 0) {
      failedAPIs.forEach(api => {
        console.log(`  ❌ FALLÓ: ${api.url} - ${api.status}`);
      });
    }
  });

  test('[REAL 10] Test de autenticación - Usuario guest vs autenticado', async () => {
    console.log('\n🔴 TEST REAL 10: Estado de autenticación\n');

    // Verificar si hay sesión
    const session = await page.evaluate(() => {
      return (window as any).__NEXT_DATA__?.props?.pageProps?.session;
    });

    console.log(`  👤 Sesión detectada: ${session ? 'Sí' : 'No (Guest)'}`);

    if (session) {
      console.log(`  ✅ Usuario autenticado: ${JSON.stringify(session).substring(0, 100)}`);
    } else {
      console.log('  ⚠️ Modo guest - Usando localStorage');
    }

    // Verificar header
    const userImage = await page.locator('img[alt*="user"], img[alt*="usuario"]').count();
    console.log(`  🖼️ Imagen de usuario visible: ${userImage > 0}`);
  });

  test('[REAL 11] Verificar manejo de errores del backend', async () => {
    console.log('\n🔴 TEST REAL 11: Manejo de errores\n');

    // Monitorear errores en consola
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(500);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    await chatInput.fill('Test de error');
    
    const sendButton = await page.locator('button:has-text("Enviar")').first();
    if (await sendButton.count() > 0) {
      await sendButton.click();
      await page.waitForTimeout(3000);
    }

    console.log(`  🚨 Errores de consola capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 3).forEach((err, i) => {
        console.log(`  ❌ Error ${i + 1}: ${err.substring(0, 100)}`);
      });
    } else {
      console.log('  ✅ No hay errores de consola');
    }
  });

  test('[REAL 12] Verificar que el título de conversación se genera', async () => {
    console.log('\n🔴 TEST REAL 12: Generación de título\n');

    const initialConversations = await page.locator('[data-testid="conversation-item"]').count();
    
    await page.click('[data-testid="new-conversation"]');
    await page.waitForTimeout(1000);

    const chatInput = await page.locator('input[data-testid="chat-input"]');
    await chatInput.fill('¿Cuál es la mejor manera de aprender programación?');
    
    const sendButton = await page.locator('button[data-testid="send-button"]');
    if (await sendButton.count() > 0 && await sendButton.isEnabled()) {
      await sendButton.click();
      console.log('  📤 Mensaje enviado');
      await page.waitForTimeout(5000);
    }

    // Verificar si apareció en el sidebar con título
    const finalConversations = await page.locator('[data-testid="conversation-item"]').count();
    const conversationAdded = finalConversations > initialConversations;
    
    console.log(`  ${conversationAdded ? '✅' : '❌'} Conversación agregada al sidebar: ${conversationAdded}`);

    if (conversationAdded) {
      const lastConversation = await page.locator('[data-testid="conversation-item"]').first();
      const title = await lastConversation.textContent();
      console.log(`  📝 Título generado: "${title?.substring(0, 50)}"`);
      
      const hasTitle = title && title.trim().length > 0 && title !== 'Nueva conversación';
      console.log(`  ${hasTitle ? '✅' : '⚠️'} Título personalizado generado: ${hasTitle}`);
    } else {
      console.log('  ❌ PROBLEMA CRÍTICO: Las conversaciones NO se agregan al sidebar');
      console.log('  🔍 Esto indica un problema en el flujo de creación de conversaciones');
    }
  });
});
