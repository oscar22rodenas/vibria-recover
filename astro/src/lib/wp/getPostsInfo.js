import { apiURL } from "./config.js";
import { postsCache } from './helpers.js';

export async function getPostsInfo(slug, lang) {
    const cacheKey = `${slug}-${lang}`;
    
    // ✅ Verificar cache
    if (postsCache.has(cacheKey)) {
        return postsCache.get(cacheKey);
    }
    
    try {
        const slugCompleto = `${slug}-${lang}`;
        const res = await fetch(
            `${apiURL}/posts?slug=${slugCompleto}&_fields=acf`
        );
        const [pageData] = await res.json();
        
        if (!pageData) {
            console.error(`❌ Page not found: ${slugCompleto}`);
            return {};
        }
        
        // ✅ Guardar en cache
        postsCache.set(cacheKey, pageData.acf);
        
        return pageData.acf;
    } catch (error) {
        console.error(`❌ Error fetching ${slug}-${lang}:`, error.message);
        return {};
    }
}
