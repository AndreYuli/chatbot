// Detección temporal mejorada para Escuela Sabática en n8n
// Coloca este código en un nodo "Code" ANTES de Qdrant Vector Store
// Mode: Run Once for All Items

const now = new Date();

// Arrays en español (0=domingo en JavaScript)
const diasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Función para formatear fechas
function formatFecha(fecha) {
    const dia = diasCompletos[fecha.getDay()];
    const num = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    return `${dia} ${num} de ${mes}`;
}

// Procesar cada item
const items = $input.all();
for (const item of items) {
    let query = item.json.chatInput || item.json.body?.chatInput || '';
    const queryLower = query.toLowerCase();
    
    let enrichedQuery = query;
    let detectedDate = null;
    let targetDate = null;
    
    // Detección temporal (ORDEN IMPORTANTE: frases largas primero)
    if (queryLower.includes('pasado mañana') || queryLower.includes('pasado-mañana')) {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 2);
    }
    else if (queryLower.includes('antes de ayer') || queryLower.includes('anteayer')) {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() - 2);
    }
    else if (queryLower.includes('mañana')) {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 1);
    }
    else if (queryLower.includes('hoy')) {
        targetDate = new Date(now);
    }
    else if (queryLower.includes('ayer')) {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() - 1);
    }
    
    // Si se detectó una fecha temporal, crear filtro y query
    if (targetDate) {
        detectedDate = formatFecha(targetDate);
        const dia = diasCompletos[targetDate.getDay()];
        const num = targetDate.getDate();
        const mes = meses[targetDate.getMonth()];
        
        // Query simple para búsqueda semántica
        enrichedQuery = `lección escuela sabática ${query}`;
        
        // Filtro específico para la fecha
        item.json.searchFilter = {
            "should": [
                {
                    "key": "content",
                    "match": {
                        "text": `${dia} ${num} de ${mes}`
                    }
                },
                {
                    "key": "content", 
                    "match": {
                        "text": `Lección 6 | ${dia} ${num}`
                    }
                }
            ]
        };
    } else {
        // Sin filtro para consultas no temporales
        item.json.searchFilter = null;
    }
    
    // Guardar datos procesados
    item.json.enrichedQuery = enrichedQuery;
    item.json.detectedDate = detectedDate;
    item.json.originalQuery = query;
    
    console.log('✅ Query original:', query);
    console.log('✅ Query enriquecida:', enrichedQuery);
    console.log('✅ Filtro de búsqueda:', JSON.stringify(item.json.searchFilter, null, 2));
    console.log('✅ Fecha detectada:', detectedDate);
}

return items;
