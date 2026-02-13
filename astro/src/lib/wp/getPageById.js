import { apiURL } from "./config.js";
import { extractLang } from "./extractLang.js";

// ✅ CACHE para evitar fetchear la misma página múltiples veces
const pageCache = new Map();

/**
 * Obtiene UNA página por ID (con cache)
 * Mantener para compatibilidad, pero usar getPagesByIds cuando sea posible
 */
export const getPageById = async (id) => {
  console.log(`📡 [getPageById] Request for single page ID: ${id}`);
  if (!id) {
    console.log(`❌ [getPageById] No page ID provided.`);
    return null;
  }
  
  // ✅ OPTIMIZACIÓN: Verificar cache primero
  if (pageCache.has(id)) {
    console.log(`✅ [getPageById] Cache hit for page ID: ${id}`);
    return pageCache.get(id);
  }

  try {
    const response = await fetch(`${apiURL}/pages/${id}?_fields=slug,acf`);
    if (!response.ok) {
      console.error(`❌ [getPageById] Page ${id} not found (${response.status})`);
      pageCache.set(id, null);
      return null;
    }
    
    const data = await response.json();
    const extracted = extractLang(data.slug, data.acf?.categoria);
    
    // ✅ Guardar en cache
    pageCache.set(id, extracted);
    console.log(`➕ [getPageById] Added page ID ${id} to cache.`);
    
    return extracted;

  } catch (error) {
    console.error(`❌ [getPageById] Error fetching page ${id}:`, error.message);
    
    // ✅ Cachear también los errores para evitar reintentos
    pageCache.set(id, null);
    
    return null;
  }
};

/**
 * ✅ OPTIMIZADO: Fetchea múltiples páginas en UNA SOLA petición
 * Usa el parámetro 'include' de WordPress REST API
 */
export const getPagesByIds = async (ids) => {
  console.log(`📡 [getPagesByIds] Request for page IDs: [${ids.join(', ')}]`);
  if (!ids || ids.length === 0) {
    console.log(`❌ [getPagesByIds] No page IDs provided.`);
    return [];
  }
  
  // Filtrar nulls y duplicados
  const validIds = [...new Set(ids.filter(id => id))];
  console.log(`   [getPagesByIds] Valid (unique, non-null) IDs: [${validIds.join(', ')}]`);

  if (validIds.length === 0) {
    console.log(`❌ [getPagesByIds] No valid page IDs to fetch.`);
    return [];
  }
  
  // ✅ Separar IDs cacheados vs no cacheados
  const uncachedIds = validIds.filter(id => !pageCache.has(id));
  const cachedResults = validIds.filter(id => pageCache.has(id)).map(id => pageCache.get(id));
  console.log(`   [getPagesByIds] Cached IDs: ${validIds.length - uncachedIds.length} / ${validIds.length}. Uncached IDs to fetch: [${uncachedIds.join(', ')}]`);

      // Si todos están en cache, devolver desde cache
      if (uncachedIds.length === 0) {
          console.log(`✅ [getPagesByIds] All requested pages found in cache.`);
          return ids.map(id => pageCache.get(id)); // Corrected: map over original ids
      }
      
      try {
          // ✅ UN SOLO FETCH para TODAS las páginas no cacheadas
          const idsParam = uncachedIds.join(',');
          console.log(`📡 [getPagesByIds] Fetching ${uncachedIds.length} uncached pages in batch: [${idsParam}]`);
          const response = await fetch(
              `${apiURL}/pages?include=${idsParam}&_fields=id,slug,acf&per_page=500`
          );
          
          if (!response.ok) {
              console.error(`❌ [getPagesByIds] Failed to fetch pages (status: ${response.status}, IDs: [${idsParam}])`);
              // Marcar como null en cache para evitar reintentos
              uncachedIds.forEach(id => pageCache.set(id, null));
              return ids.map(id => pageCache.get(id)); // Corrected: map over original ids
          }
          
          const pages = await response.json();
          console.log(`✅ [getPagesByIds] Fetched ${pages.length} pages from API for IDs: [${idsParam}]`);
  
          // ✅ Guardar TODAS en cache (indexadas por ID)
          pages.forEach(page => {
            const extracted = extractLang(page.slug, page.acf?.categoria);
            pageCache.set(page.id, extracted);
          });
          console.log(`➕ [getPagesByIds] Added ${pages.length} new pages to cache.`);
          
          // Marcar IDs que no vinieron en la respuesta como null
          const returnedIds = new Set(pages.map(p => p.id));
          uncachedIds.forEach(id => {
              if (!returnedIds.has(id)) {
                  pageCache.set(id, null);
                  console.warn(`⚠️ [getPagesByIds] Page ID ${id} was requested but not returned by API. Set to null in cache.`);
              }
          });
          
          // ✅ Devolver en el MISMO ORDEN que los IDs originales
          const result = ids.map(id => pageCache.get(id)); // Corrected: map over original ids
          console.log(`✅ [getPagesByIds] Returning ${result.length} pages.`);
          return result;
          
      } catch (error) {
          console.error(`❌ [getPagesByIds] Error fetching pages for IDs [${validIds.join(', ')}]:`, error.message);
          // Marcar como null para evitar reintentos
          uncachedIds.forEach(id => pageCache.set(id, null));
          return ids.map(id => pageCache.get(id)); // Corrected: map over original ids
      }};
