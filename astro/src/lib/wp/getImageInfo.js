import { apiURL } from "./config.js";
import { imageCache } from './helpers.js';

export async function getImageInfo(imageId) {
    if (!imageId) return null;
    
    // ✅ Verificar cache primero
    if (imageCache.has(imageId)) {
        return imageCache.get(imageId);
    }
    
    try {
        const res = await fetch(
            `${apiURL}/media/${imageId}?_fields=source_url,alt_text`
        );
        
        if (!res.ok) {
            console.error(`❌ Image ${imageId} not found (${res.status})`);
            return null;
        }
        
        const imageData = await res.json();
        
        // ✅ Guardar en cache
        imageCache.set(imageId, imageData);
        
        return imageData;
    } catch (error) {
        console.error(`❌ Error fetching image ${imageId}:`, error.message);
        return null;
    }
}
