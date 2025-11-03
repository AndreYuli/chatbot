/**
 * Script de debug para probar el flujo de conversaciones
 * Ejecutar en la consola del navegador para diagnosticar problemas
 */

// Función para probar la creación de conversaciones
async function testCreateConversation() {
  console.log('🧪 Testing conversation creation...');
  
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Conversation - ' + new Date().toISOString(),
        settings: { aiModel: 'n8n' }
      }),
    });
    
    const result = await response.json();
    console.log('✅ Conversation created:', result);
    return result;
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    return null;
  }
}

// Función para probar la obtención de conversaciones
async function testGetConversations() {
  console.log('🧪 Testing get conversations...');
  
  try {
    const response = await fetch('/api/conversations');
    const conversations = await response.json();
    console.log('✅ Conversations fetched:', conversations);
    return conversations;
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return [];
  }
}

// Función para probar el envío de mensajes
async function testSendMessage(conversationId) {
  console.log('🧪 Testing message sending...');
  
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message - ' + new Date().toISOString(),
        conversationId: conversationId,
        settings: { topK: 5, temperature: 0.7 }
      }),
    });
    
    if (response.ok) {
      console.log('✅ Message sent successfully');
      
      // Leer el stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        console.log('📥 Stream chunk:', chunk);
      }
      
      return result;
    } else {
      console.error('❌ Error sending message:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return null;
  }
}

// Función para probar el cambio de modelo
async function testModelChange() {
  console.log('🧪 Testing model change flow...');
  
  // 1. Crear conversación con modelo n8n
  const conversation = await testCreateConversation();
  if (!conversation) return;
  
  console.log('📝 Created conversation with n8n model:', conversation.id);
  
  // 2. Enviar mensaje
  await testSendMessage(conversation.id);
  
  // 3. Simular cambio de modelo - verificar que la conversación se actualiza
  console.log('🔄 Simulating model change...');
  
  // Disparar evento de actualización de conversación
  window.dispatchEvent(new CustomEvent('conversation:updated', {
    detail: {
      id: conversation.id,
      lastMessageAt: new Date().toISOString(),
    },
  }));
  
  console.log('✅ Model change simulation complete');
  
  // 4. Verificar que la conversación sigue existiendo
  const updatedConversations = await testGetConversations();
  const foundConversation = updatedConversations.find(c => c.id === conversation.id);
  
  if (foundConversation) {
    console.log('✅ Conversation persisted after model change:', foundConversation);
  } else {
    console.error('❌ Conversation lost after model change!');
  }
  
  return conversation;
}

// Función para probar localStorage para usuarios invitados
function testGuestStorage() {
  console.log('🧪 Testing guest storage...');
  
  // Simular conversación de invitado
  const guestConversation = {
    id: `temp_${Date.now()}_test`,
    title: 'Guest Test Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'guest',
    settings: JSON.stringify({ aiModel: 'n8n' })
  };
  
  // Guardar en localStorage
  const existingConversations = JSON.parse(localStorage.getItem('guest_conversations') || '[]');
  existingConversations.unshift(guestConversation);
  localStorage.setItem('guest_conversations', JSON.stringify(existingConversations));
  
  console.log('✅ Guest conversation saved to localStorage');
  
  // Verificar que se puede recuperar
  const savedConversations = JSON.parse(localStorage.getItem('guest_conversations') || '[]');
  const foundConversation = savedConversations.find(c => c.id === guestConversation.id);
  
  if (foundConversation) {
    console.log('✅ Guest conversation retrieved from localStorage:', foundConversation);
  } else {
    console.error('❌ Guest conversation not found in localStorage!');
  }
  
  return guestConversation;
}

// Función para probar todo el flujo
async function runFullTest() {
  console.log('🚀 Starting full conversation flow test...');
  console.log('════════════════════════════════════════');
  
  // Test 1: Creación básica
  console.log('\n1️⃣ Testing basic conversation creation...');
  await testCreateConversation();
  
  // Test 2: Obtener conversaciones
  console.log('\n2️⃣ Testing conversation retrieval...');
  await testGetConversations();
  
  // Test 3: Cambio de modelo
  console.log('\n3️⃣ Testing model change flow...');
  await testModelChange();
  
  // Test 4: Storage de invitados
  console.log('\n4️⃣ Testing guest storage...');
  testGuestStorage();
  
  console.log('\n✅ Full test completed!');
  console.log('════════════════════════════════════════');
}

// Export functions to global scope for console usage
window.testCreateConversation = testCreateConversation;
window.testGetConversations = testGetConversations;
window.testSendMessage = testSendMessage;
window.testModelChange = testModelChange;
window.testGuestStorage = testGuestStorage;
window.runFullTest = runFullTest;

console.log('🔧 Debug functions loaded! Available functions:');
console.log('- testCreateConversation()');
console.log('- testGetConversations()');
console.log('- testSendMessage(conversationId)');
console.log('- testModelChange()');
console.log('- testGuestStorage()');
console.log('- runFullTest()');
console.log('\nRun runFullTest() to test everything!');