import { apiURL } from "./config.js";
import { extractLang } from "./extractLang.js";

// ✅ CACHE para evitar fetchear la misma página múltiples veces
const pageCache = new Map();

export const getPageById = async (id) => {
  // ✅ OPTIMIZACIÓN: Verificar cache primero
  if (pageCache.has(id)) {
    return pageCache.get(id);
  }

  try {
    const response = await fetch(`${apiURL}/pages/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch page info");
    }
    const data = await response.json();

    const extracted = extractLang(data.slug, data.acf.categoria);
    
    // ✅ Guardar en cache
    pageCache.set(id, extracted);
    
    return extracted;

  } catch (error) {
    console.error("Error fetching page info:", error);
    
    // ✅ Cachear también los errores para evitar reintentos
    pageCache.set(id, null);
    
    return null;
  }
};

// ✅ NUEVA FUNCIÓN: Fetchear múltiples páginas en paralelo
export const getPagesByIds = async (ids) => {
  // Filtrar IDs ya cacheados vs. nuevos
  const uncachedIds = ids.filter(id => !pageCache.has(id));
  
  if (uncachedIds.length > 0) {
    // Fetchear todos los IDs nuevos en paralelo
    await Promise.all(
      uncachedIds.map(id => getPageById(id))
    );
  }
  
  // Devolver todos desde cache
  return ids.map(id => pageCache.get(id));
};