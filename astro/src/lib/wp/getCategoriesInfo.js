import { apiURL } from "./config.js";
import { categoriesCache } from './helpers.js';

export async function getCategoriesInfo(lang) {
    // ✅ Verificar cache
    if (categoriesCache.has(lang)) {
        return categoriesCache.get(lang);
    }
    
    try {
        const res = await fetch(
            `${apiURL}/categories?per_page=100&_fields=id,name,slug,parent`
        );
        const categories = await res.json();
        
        // Filtrar por idioma y estructurar
        const filteredCategories = categories.filter(cat => {
            return cat.slug.endsWith(`-${lang}`) || !cat.slug.includes('-ca') && !cat.slug.includes('-es') && !cat.slug.includes('-en');
        });
        
        const parent = filteredCategories.filter(cat => cat.parent === 0);
        const children = {};
        
        filteredCategories.forEach(cat => {
            if (cat.parent !== 0) {
                if (!children[cat.parent]) {
                    children[cat.parent] = [];
                }
                children[cat.parent].push({
                    id: cat.id,
                    title: cat.name,
                    slug: cat.slug.replace(`-${lang}`, '')
                });
            }
        });
        
        const result = {
            parent: parent.map(cat => ({
                id: cat.id,
                title: cat.name,
                slug: cat.slug.replace(`-${lang}`, '')
            })),
            children
        };
        
        // ✅ Guardar en cache
        categoriesCache.set(lang, result);
        
        return result;
    } catch (error) {
        console.error(`❌ Error fetching categories for ${lang}:`, error.message);
        return { parent: [], children: {} };
    }
}
