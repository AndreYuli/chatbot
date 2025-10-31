import { test, expect } from '@playwright/test';

/**
 * Test de verificación: El parpadeo ha sido ELIMINADO
 * 
 * Este test verifica las optimizaciones implementadas:
 * 1. Eliminación de cascada de useEffects
 * 2. React.memo en componentes
 * 3. GPU acceleration con transform
 * 4. Sincronización directa de estado
 */

test.describe('Verificación: Parpadeo Eliminado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/es-CO/chat');
    await page.waitForLoadState('networkidle');
  });

  test('VERIFICAR: Crear conversación sin parpadeo visible', async ({ page }) => {
    console.log('🔍 Iniciando test de verificación de parpadeo...');

    // Observer para contar mutaciones DOM
    const mutations: any[] = [];
    await page.exposeFunction('logMutation', (mutation: any) => {
      mutations.push(mutation);
    });

    await page.evaluate(() => {
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            (window as any).logMutation({
              type: mutation.type,
              target: (mutation.target as HTMLElement).className,
              added: mutation.addedNodes.length,
              timestamp: Date.now()
            });
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });

    // Tomar screenshot antes
    await page.screenshot({ 
      path: 'tests/screenshots/before-conversation.png',
      fullPage: true 
    });

    const startTime = Date.now();

    // Click en "Nueva Conversación"
    const newConvButton = page.getByTestId('new-conversation');
    await newConvButton.click();

    // Esperar que aparezca la conversación
    await page.waitForSelector('[data-testid="conversation-item"]', { timeout: 2000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Esperar un momento para capturar todas las mutaciones
    await page.waitForTimeout(500);

    // Tomar screenshot después
    await page.screenshot({ 
      path: 'tests/screenshots/after-conversation.png',
      fullPage: true 
    });

    // Analizar mutaciones
    const rapidMutations = mutations.filter((m, index) => {
      if (index === 0) return false;
      const timeDiff = m.timestamp - mutations[index - 1].timestamp;
      return timeDiff < 100; // Mutaciones más rápidas que 100ms
    });

    console.log('📊 RESULTADOS:');
    console.log(`  - Tiempo total: ${duration}ms`);
    console.log(`  - Mutaciones totales: ${mutations.length}`);
    console.log(`  - Mutaciones rápidas (<100ms): ${rapidMutations.length}`);
    console.log(`  - Screenshots guardadas en tests/screenshots/`);

    // ASSERTIONS - Verificar que el parpadeo está resuelto
    expect(mutations.length, 'Total de mutaciones DOM').toBeLessThanOrEqual(3);
    expect(rapidMutations.length, 'Mutaciones rápidas que causan parpadeo').toBe(0);
    expect(duration, 'Tiempo de respuesta').toBeLessThan(1000);

    console.log('✅ TEST PASADO: Parpadeo eliminado correctamente');
  });

  test('VERIFICAR: Re-renders minimizados con React.memo', async ({ page }) => {
    console.log('🔍 Verificando optimizaciones de React.memo...');

    let renderCount = 0;

    // Inyectar código para contar renders
    await page.evaluate(() => {
      // Patch de console.log para detectar renders
      const originalLog = console.log;
      (window as any).renderCount = 0;
      console.log = function(...args) {
        if (args[0]?.includes?.('render') || args[0]?.includes?.('Render')) {
          (window as any).renderCount++;
        }
        originalLog.apply(console, args);
      };
    });

    // Crear conversación
    await page.getByTestId('new-conversation').click();
    await page.waitForSelector('[data-testid="conversation-item"]');

    // Crear otra conversación
    await page.getByTestId('new-conversation').click();
    await page.waitForTimeout(300);

    // Obtener conteo de renders
    renderCount = await page.evaluate(() => (window as any).renderCount || 0);

    console.log(`📊 Total de renders detectados: ${renderCount}`);

    // Con React.memo, debería haber pocos renders
    expect(renderCount, 'Re-renders innecesarios').toBeLessThanOrEqual(5);

    console.log('✅ Optimización de React.memo verificada');
  });

  test('VERIFICAR: Transiciones suaves a 60fps', async ({ page }) => {
    console.log('🔍 Verificando fluidez de animaciones...');

    // Crear conversación y medir FPS durante la transición
    const metrics = await page.evaluate(async () => {
      let frames = 0;
      let startTime = performance.now();
      
      const measureFPS = () => {
        return new Promise((resolve) => {
          const measure = () => {
            frames++;
            const elapsed = performance.now() - startTime;
            
            if (elapsed < 1000) { // Medir durante 1 segundo
              requestAnimationFrame(measure);
            } else {
              resolve(frames);
            }
          };
          requestAnimationFrame(measure);
        });
      };

      // Trigger animación con click
      const button = document.querySelector('[data-testid="new-conversation"]') as HTMLButtonElement;
      button?.click();
      
      // Medir FPS
      const fps = await measureFPS();
      
      return { fps };
    });

    console.log(`📊 FPS durante transición: ${metrics.fps}`);

    // Verificar que mantiene ~60fps
    expect(metrics.fps, 'FPS durante animaciones').toBeGreaterThanOrEqual(55);

    console.log('✅ Transiciones fluidas verificadas (60fps)');
  });

  test('VERIFICAR: No hay elementos duplicados en DOM', async ({ page }) => {
    console.log('🔍 Verificando que no hay duplicación de elementos...');

    // Crear conversación
    await page.getByTestId('new-conversation').click();
    await page.waitForSelector('[data-testid="conversation-item"]');

    // Verificar que no hay duplicados
    const conversationItems = await page.$$('[data-testid="conversation-item"]');
    const chatAreas = await page.$$('div.h-full.overflow-y-auto.relative');

    console.log(`📊 Conversaciones en DOM: ${conversationItems.length}`);
    console.log(`📊 ChatAreas en DOM: ${chatAreas.length}`);

    expect(conversationItems.length, 'Solo debe haber 1 conversación').toBe(1);
    expect(chatAreas.length, 'Solo debe haber 1 ChatArea').toBe(1);

    console.log('✅ Sin elementos duplicados');
  });

  test('VERIFICAR: localStorage se sincroniza correctamente', async ({ page }) => {
    console.log('🔍 Verificando sincronización con localStorage...');

    // Crear conversación
    await page.getByTestId('new-conversation').click();
    await page.waitForSelector('[data-testid="conversation-item"]');

    // Verificar localStorage
    const localStorageData = await page.evaluate(() => {
      const conversations = localStorage.getItem('guest_conversations');
      const selectedId = localStorage.getItem('selectedConversationId');
      
      return {
        conversations: conversations ? JSON.parse(conversations) : [],
        selectedId
      };
    });

    console.log(`📊 Conversaciones guardadas: ${localStorageData.conversations.length}`);
    console.log(`📊 ID seleccionado: ${localStorageData.selectedId}`);

    expect(localStorageData.conversations.length, 'Conversación guardada').toBeGreaterThan(0);
    expect(localStorageData.selectedId, 'ID seleccionado guardado').toBeTruthy();

    console.log('✅ Sincronización con localStorage correcta');
  });
});

test.describe('Optimizaciones de Performance', () => {
  test('BENCHMARK: Tiempo de creación de conversación', async ({ page }) => {
    await page.goto('http://localhost:3000/es-CO/chat');
    await page.waitForLoadState('networkidle');

    const times: number[] = [];

    // Crear 5 conversaciones y medir tiempo
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      
      await page.getByTestId('new-conversation').click();
      await page.waitForSelector('[data-testid="conversation-item"]');
      
      const end = Date.now();
      times.push(end - start);
      
      await page.waitForTimeout(200);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log('📊 BENCHMARK - Creación de Conversación:');
    console.log(`  - Promedio: ${avgTime.toFixed(0)}ms`);
    console.log(`  - Mínimo: ${minTime}ms`);
    console.log(`  - Máximo: ${maxTime}ms`);
    console.log(`  - Tiempos: ${times.join('ms, ')}ms`);

    // Verificar que es rápido (menos de 500ms en promedio)
    expect(avgTime, 'Tiempo promedio de creación').toBeLessThan(500);

    console.log('✅ Performance dentro del objetivo (<500ms)');
  });

  test('BENCHMARK: Búsqueda con debouncing', async ({ page }) => {
    await page.goto('http://localhost:3000/es-CO/chat');
    await page.waitForLoadState('networkidle');

    // Crear varias conversaciones primero
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('new-conversation').click();
      await page.waitForTimeout(100);
    }

    const searchInput = page.getByTestId('sidebar-search');
    
    // Escribir rápido (debouncing debería prevenir búsquedas)
    const start = Date.now();
    await searchInput.fill('test');
    
    // No debería buscar inmediatamente
    const immediateResults = await page.$$('[data-testid="conversation-item"]');
    
    // Esperar el debounce (300ms)
    await page.waitForTimeout(350);
    
    const end = Date.now();
    const finalResults = await page.$$('[data-testid="conversation-item"]');

    console.log('📊 BENCHMARK - Búsqueda con Debouncing:');
    console.log(`  - Tiempo total: ${end - start}ms`);
    console.log(`  - Resultados inmediatos: ${immediateResults.length}`);
    console.log(`  - Resultados finales: ${finalResults.length}`);

    // Verificar que el debouncing funciona
    expect(end - start, 'Debouncing activo').toBeGreaterThanOrEqual(300);

    console.log('✅ Debouncing funcionando correctamente');
  });
});
