// ==========================================
// src/wp/getExperienciesInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getExperienciesInfo(lang, slugCompleto) {
    // Fetchear la página base
    const pageRes = await fetch(
        `${apiURL}/pages?slug=${slugCompleto}&_fields=content,acf`
    );
    const [pageData] = await pageRes.json();
    
    if (!pageData) {
        console.error(`❌ Page not found: ${slugCompleto}`);
        return [];
    }
    
    // Obtener todas las experiencias de la categoría
    const categorySlug = pageData.acf.categoria_experiencias || "experiencies";
    const experienciesRes = await fetch(
        `${apiURL}/pages?categories=${categorySlug}&per_page=100&_fields=acf,slug,content`
    );
    const experienciesRaw = await experienciesRes.json();
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes en paralelo
    const experienciesPromises = experienciesRaw.map(async (exp) => {
        const extracted = extractLang(exp.slug);
        if (!extracted || extracted.lang !== lang) {
            return null;
        }
        
        // Resolver imagen en paralelo
        let imageUrl = "";
        let imageAlt = "";
        
        if (exp.acf.imagen) {
            try {
                const imgData = await getImageInfo(exp.acf.imagen);
                imageUrl = imgData.source_url || "";
                imageAlt = imgData.alt_text || exp.acf.titulo || "";
            } catch (error) {
                console.error(`❌ Error fetching image for ${exp.slug}:`, error.message);
            }
        }
        
        return {
            title: exp.acf.titulo || "",
            text: exp.acf.descripcion || "",
            imageUrl,
            imageAlt,
            link: `/${lang}/experiencies/${extracted.baseSlug}`,
            ubicacion: exp.acf.ubicacion || "",
            fechas: exp.acf.fechas || "",
            dataLimit: exp.acf.data_limit || "",
            pinVoluntariat: exp.acf.pin_voluntariat || "",
            pinPais: exp.acf.pin_pais || "",
            content: pageData.content?.rendered || "" // Content de la página base
        };
    });
    
    const experiencies = (await Promise.all(experienciesPromises)).filter(Boolean);
    
    return experiencies;
}


// ==========================================
// src/wp/getOfertesInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { extractLang } from "./extractLang.js";

export async function getOfertesInfo(lang) {
    // Fetchear todas las ofertas
    const res = await fetch(
        `${apiURL}/pages?categories=ofertes&per_page=100&_fields=acf,slug,content`
    );
    const ofertesRaw = await res.json();
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes en paralelo
    const ofertesPromises = ofertesRaw.map(async (oferta) => {
        const extracted = extractLang(oferta.slug);
        if (!extracted || extracted.lang !== lang) {
            return null;
        }
        
        // Resolver imagen
        let imageUrl = "";
        let imageAlt = "";
        
        if (oferta.acf.imagen) {
            try {
                const imgData = await getImageInfo(oferta.acf.imagen);
                imageUrl = imgData.source_url || "";
                imageAlt = imgData.alt_text || oferta.acf.titulo || "";
            } catch (error) {
                console.error(`❌ Error fetching image for ${oferta.slug}:`, error.message);
            }
        }
        
        return {
            title: oferta.acf.titulo || "",
            text: oferta.acf.descripcion_corta || "",
            imageUrl,
            imageAlt,
            link: `/${lang}/ofertes/${extracted.baseSlug}`,
            ubicacion: oferta.acf.ubicacion || "",
            fechas: oferta.acf.fechas || "",
            dataLimit: oferta.acf.data_limit || "",
            content: oferta.content?.rendered || ""
        };
    });
    
    const ofertes = (await Promise.all(ofertesPromises)).filter(Boolean);
    
    return ofertes;
}


// ==========================================
// src/wp/getOfertaDetalladaInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getOfertaDetalladaInfo(slugCompleto) {
    // Fetchear la oferta específica
    const res = await fetch(
        `${apiURL}/pages?slug=${slugCompleto}&_fields=acf,content`
    );
    const [ofertaData] = await res.json();
    
    if (!ofertaData) {
        console.error(`❌ Oferta not found: ${slugCompleto}`);
        return null;
    }
    
    // Resolver imagen
    let imageUrl = "";
    let imageAlt = "";
    
    if (ofertaData.acf.imagen) {
        try {
            const imgData = await getImageInfo(ofertaData.acf.imagen);
            imageUrl = imgData.source_url || "";
            imageAlt = imgData.alt_text || ofertaData.acf.titulo || "";
        } catch (error) {
            console.error(`❌ Error fetching image:`, error.message);
        }
    }
    
    return {
        title: ofertaData.acf.titulo || "",
        imageUrl,
        imageAlt,
        ubicacion: ofertaData.acf.ubicacion || "",
        fechas: ofertaData.acf.fechas || "",
        content: ofertaData.content?.rendered || "",
        buttonText: ofertaData.acf.boton_texto || "Aplicar",
        buttonUrl: ofertaData.acf.boton_url || "#"
    };
}


// ==========================================
// src/wp/getSlidesInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getSlidesInfo(lang) {
    // Fetchear ACF de la página de slides
    const res = await fetch(
        `${apiURL}/pages?slug=home-${lang}&_fields=acf`
    );
    const [homeData] = await res.json();
    
    if (!homeData || !homeData.acf.slides) {
        console.error(`❌ Slides not found for lang: ${lang}`);
        return [];
    }
    
    const slidesRaw = homeData.acf.slides;
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes de slides en paralelo
    const slidesPromises = slidesRaw.map(async (slide) => {
        let imageUrl = "";
        
        if (slide.imagen) {
            try {
                const imgData = await getImageInfo(slide.imagen);
                imageUrl = imgData.source_url || "";
            } catch (error) {
                console.error(`❌ Error fetching slide image:`, error.message);
            }
        }
        
        return {
            title: slide.titulo || "",
            subtitle: slide.subtitulo || "",
            text: slide.texto || "",
            imageUrl,
            buttonText: slide.boton_texto || "",
            buttonUrl: slide.boton_url || "#"
        };
    });
    
    const slides = await Promise.all(slidesPromises);
    
    return slides;
}


// ==========================================
// src/wp/getRRSSInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getRRSSInfo() {
    // Fetchear custom post type de RRSS
    const res = await fetch(
        `${apiURL}/redes-sociales?per_page=100&_fields=acf`
    );
    const rrssRaw = await res.json();
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes de RRSS en paralelo
    const rrssPromises = rrssRaw.map(async (red) => {
        let imageUrl = "";
        let imageAlt = "";
        
        if (red.acf.icono) {
            try {
                const imgData = await getImageInfo(red.acf.icono);
                imageUrl = imgData.source_url || "";
                imageAlt = imgData.alt_text || red.acf.nombre || "Red social";
            } catch (error) {
                console.error(`❌ Error fetching RRSS icon:`, error.message);
            }
        }
        
        return {
            link: red.acf.url || "#",
            imageUrl,
            imageAlt,
            title: red.acf.nombre || ""
        };
    });
    
    const rrss = await Promise.all(rrssPromises);
    
    return rrss;
}


// ==========================================
// src/wp/getImageInfo.js CON CACHE MEJORADO
// ==========================================

import { apiURL } from "./config.js";

// Cache en memoria para evitar fetchs duplicados
const imageCache = new Map();

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


// ==========================================
// src/wp/getCategoriesInfo.js OPTIMIZADO
// ==========================================

import { apiURL } from "./config.js";

// Cache para evitar fetchs repetidos
const categoriesCache = new Map();

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


// ==========================================
// src/wp/getPostsInfo.js CON CACHE
// ==========================================

import { apiURL } from "./config.js";

// Cache para páginas comunes (header, footer)
const postsCache = new Map();

export async function getPostsInfo(slug, lang) {
    const cacheKey = `${slug}-${lang}`;
    
    // ✅ Verificar cache
    if (postsCache.has(cacheKey)) {
        return postsCache.get(cacheKey);
    }
    
    try {
        const slugCompleto = `${slug}-${lang}`;
        const res = await fetch(
            `${apiURL}/pages?slug=${slugCompleto}&_fields=acf`
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


// ==========================================
// FUNCIÓN HELPER PARA BATCH FETCHING
// ==========================================

/**
 * Fetchea múltiples imágenes en paralelo con rate limiting
 * @param {number[]} imageIds - Array de IDs de imágenes
 * @param {number} batchSize - Tamaño del batch (por defecto 10)
 * @returns {Promise<Array>} Array de datos de imágenes
 */
export async function batchGetImages(imageIds, batchSize = 10) {
    const uniqueIds = [...new Set(imageIds)].filter(Boolean);
    
    const results = [];
    
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(id => getImageInfo(id))
        );
        results.push(...batchResults);
    }
    
    return results;
}


// ==========================================
// EJEMPLO DE USO DE BATCH FETCHING
// ==========================================

// En lugar de:
// for (const exp of experiencias) {
//     const img = await getImageInfo(exp.acf.imagen); // ❌ Secuencial
// }

// Hacer:
const imageIds = experiencias.map(exp => exp.acf.imagen).filter(Boolean);
const images = await batchGetImages(imageIds); // ✅ Paralelo

// Mapear resultados
experiencias.forEach((exp, index) => {
    exp.imageData = images[index];
});