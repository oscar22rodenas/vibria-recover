import { apiURL } from "./config.js";
import { imageCache } from './helpers.js';

// ============================================
// OPTIMIZACIÓN: Batch fetching de imágenes
// ============================================

/**
 * Obtiene UNA imagen (con cache)
 * Mantener para compatibilidad, pero usar getImagesByIds cuando sea posible
 */
export async function getImageInfo(imageId) {
    console.log(`📡 [getImageInfo] Request for single image ID: ${imageId}`);
    if (!imageId) {
        console.log(`❌ [getImageInfo] No imageId provided.`);
        return null;
    }
    
    // ✅ Verificar cache primero
    if (imageCache.has(imageId)) {
        console.log(`✅ [getImageInfo] Cache hit for image ID: ${imageId}`);
        return imageCache.get(imageId);
    }
    
    try {
        const res = await fetch(
            `${apiURL}/media/${imageId}?_fields=source_url,alt_text`
        );
        
        if (!res.ok) {
            console.error(`❌ [getImageInfo] Image ${imageId} not found (${res.status})`);
            return null;
        }
        
        const imageData = await res.json();
        
        // ✅ Guardar en cache
        imageCache.set(imageId, imageData);
        console.log(`➕ [getImageInfo] Added image ID ${imageId} to cache.`);
        
        return imageData;
    } catch (error) {
        console.error(`❌ [getImageInfo] Error fetching image ${imageId}:`, error.message);
        return null;
    }
}

/**
 * ✅ NUEVA FUNCIÓN: Obtiene MÚLTIPLES imágenes en UNA SOLA petición
 * Usa el parámetro 'include' de WordPress REST API
 */
export async function getImagesByIds(imageIds) {
    console.log(`📡 [getImagesByIds] Request for image IDs: [${imageIds.join(', ')}]`);
    if (!imageIds || imageIds.length === 0) {
        console.log(`❌ [getImagesByIds] No imageIds provided.`);
        return [];
    }
    
    // Filtrar nulls y duplicados
    const validIds = [...new Set(imageIds.filter(id => id))];
    console.log(`   [getImagesByIds] Valid (unique, non-null) IDs: [${validIds.join(', ')}]`);

    if (validIds.length === 0) {
        console.log(`❌ [getImagesByIds] No valid image IDs to fetch.`);
        return [];
    }
    
    // ✅ Separar IDs cacheados vs no cacheados
    const uncachedIds = validIds.filter(id => !imageCache.has(id));
    const cachedResults = validIds.filter(id => imageCache.has(id)).map(id => imageCache.get(id));
    console.log(`   [getImagesByIds] Cached IDs: ${validIds.length - uncachedIds.length} / ${validIds.length}. Uncached IDs to fetch: [${uncachedIds.join(', ')}]`);

    // Si todos están en cache, devolver desde cache
    if (uncachedIds.length === 0) {
        console.log(`✅ [getImagesByIds] All requested images found in cache.`);
        return imageIds.map(id => imageCache.get(id)); // Corrected: map over original imageIds
    }
    
    try {
        // ✅ UN SOLO FETCH para TODAS las imágenes no cacheadas
        const idsParam = uncachedIds.join(',');
        console.log(`📡 [getImagesByIds] Fetching ${uncachedIds.length} uncached images in batch: [${idsParam}]`);
        const res = await fetch(
            `${apiURL}/media?include=${idsParam}&_fields=id,source_url,alt_text&per_page=500`
        );
        
        if (!res.ok) {
            console.error(`❌ [getImagesByIds] Failed to fetch images (status: ${res.status}, IDs: [${idsParam}])`);
            // Marcar como null en cache para evitar reintentos
            uncachedIds.forEach(id => imageCache.set(id, null));
            return imageIds.map(id => imageCache.get(id)); // Corrected: map over original imageIds
        }
        
        const images = await res.json();
        console.log(`✅ [getImagesByIds] Fetched ${images.length} images from API for IDs: [${idsParam}]`);

        // ✅ Guardar TODAS en cache (indexadas por ID)
        images.forEach(img => {
            imageCache.set(img.id, {
                source_url: img.source_url,
                alt_text: img.alt_text || ''
            });
        });
        console.log(`➕ [getImagesByIds] Added ${images.length} new images to cache.`);
        
        // Marcar IDs que no vinieron en la respuesta como null
        const returnedIds = new Set(images.map(img => img.id));
        uncachedIds.forEach(id => {
            if (!returnedIds.has(id)) {
                imageCache.set(id, null);
                console.warn(`⚠️ [getImagesByIds] Image ID ${id} was requested but not returned by API. Set to null in cache.`);
            }
        });
        
        // ✅ Devolver en el MISMO ORDEN que los IDs originales
        const result = imageIds.map(id => imageCache.get(id)); // Corrected: map over original imageIds
        console.log(`✅ [getImagesByIds] Returning ${result.length} images.`);
        return result;
        
    } catch (error) {
        console.error(`❌ [getImagesByIds] Error fetching images for IDs [${validIds.join(', ')}]:`, error.message);
        // Marcar como null para evitar reintentos
        uncachedIds.forEach(id => imageCache.set(id, null));
        return imageIds.map(id => imageCache.get(id)); // Corrected: map over original imageIds
    }
}

/**
 * Helper: Wrapper para compatibilidad con Promise.all
 * Convierte array de IDs en array de promesas que se resuelven inmediatamente
 */
export async function getImagesInBatch(imageIds) {
    return getImagesByIds(imageIds);
}