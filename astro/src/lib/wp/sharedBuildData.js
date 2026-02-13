import { apiURL } from "@wp/config.js";
import { 
    getPostsInfo, 
    getImagesByIds,  // ✅ Usar batch version
    getCategoriesInfo, 
    getRRSSInfo,
    getCategoriesHeaderInfo
} from "@wp/index.js";

// ============================================
// CACHE GLOBAL (persiste entre [slug] y [subslug])
// ============================================
let globalDataCache = null;
let allPagesCache = null;

/**
 * ✅ OPTIMIZACIÓN 1 y 2:
 * - Paraleliza todos los fetches de datos globales
 * - Cachea el resultado para no repetir en el segundo archivo
 */
export async function getGlobalData() {
    console.log('📡 [getGlobalData] Starting fetch for global data...');
    if (globalDataCache) {
        console.log("✅ [getGlobalData] Cache hit for global data.");
        return globalDataCache;
    }
    
    const languages = ["ca", "es", "en"];
    const startTime = Date.now();
    
    console.log("📡 [getGlobalData] Fetching basic global data (headers, footers, categories, links, rrss) in parallel...");
    
    // ============================================
    // PASO 1: Fetchear TODO lo básico en paralelo
    // ============================================
    const [
        allHeaders,      // 3 headers (uno por idioma)
        allFooters,      // 3 footers
        allCategories,   // 3 arrays de categorías
        allHeaderLinks,  // 3 arrays de links
        rrssRaw          // 1 array de RRSS (sin idioma)
    ] = await Promise.all([
        Promise.all(languages.map(lang => getPostsInfo("header", lang))),
        Promise.all(languages.map(lang => getPostsInfo("footer", lang))),
        Promise.all(languages.map(lang => getCategoriesInfo(lang))),
        Promise.all(languages.map(lang => getCategoriesHeaderInfo(lang))),
        getRRSSInfo()
    ]);
    
    console.log(`✅ [getGlobalData] Basic data fetched in ${Date.now() - startTime}ms.`);
    
    // ============================================
    // PASO 2: Recopilar TODOS los IDs de imágenes
    // ============================================
    const allImageIds = [];
    
    // Headers (3 imágenes: una por idioma)
    allHeaders.forEach(header => {
        if (header?.header_imagen) {
            allImageIds.push(header.header_imagen);
        }
    });
    
    // Footers (hasta 9 imágenes: 3 por footer × 3 idiomas)
    allFooters.forEach(footer => {
        const ids = [
            footer?.ubicacion_imagen,
            footer?.telefono_imagen,
            footer?.correo_imagen
        ].filter(Boolean);
        
        allImageIds.push(...ids);
    });
    
    // RRSS (N imágenes compartidas)
    (rrssRaw || []).forEach(red => {
        if (red.imageId) {
            allImageIds.push(red.imageId);
        }
    });
    console.log(`   [getGlobalData] Collected ${allImageIds.length} image IDs for global data: [${allImageIds.join(', ')}]`);

    // ============================================
    // PASO 3: Fetchear TODAS las imágenes en UN SOLO FETCH
    // ============================================
    console.log(`📡 [getGlobalData] Fetching ${allImageIds.length} images in ONE batch request...`);
    
    const allImages = await getImagesByIds(allImageIds);
    
    console.log(`✅ [getGlobalData] All images resolved in ${Date.now() - startTime}ms.`);
    console.log(`   [getGlobalData] Received ${allImages.length} images from batch fetch.`);

    // ============================================
    // PASO 4: Distribuir imágenes a sus respectivos owners
    // ============================================
    let imageIndex = 0;
    
    // Headers: primeras N imágenes
    const headerImages = [];
    allHeaders.forEach(header => {
        if (header?.header_imagen) {
            headerImages.push(allImages[imageIndex++]);
        } else {
            headerImages.push(null);
        }
    });
    console.log(`   [getGlobalData] Distributed ${headerImages.length} header images. Current imageIndex: ${imageIndex}`);
    
    // Footers: siguientes N imágenes
    const footerImagesByLang = {};
    allFooters.forEach((footer, i) => {
        const lang = languages[i];
        const footerImgs = [];
        
        if (footer?.ubicacion_imagen) footerImgs.push(allImages[imageIndex++]);
        if (footer?.telefono_imagen) footerImgs.push(allImages[imageIndex++]);
        if (footer?.correo_imagen) footerImgs.push(allImages[imageIndex++]);
        
        footerImagesByLang[lang] = footerImgs;
    });
    
    // RRSS: últimas N imágenes
    const rrssImages = [];
    (rrssRaw || []).forEach(red => {
        if (red.imageId) {
            rrssImages.push(allImages[imageIndex++]);
        }
    });
    console.log(`   [getGlobalData] Distributed ${rrssImages.length} RRSS images. Current imageIndex: ${imageIndex}`);
    
    // ============================================
    // PASO 5: Construir RRSS con imágenes (compartidas)
    // ============================================
    const rrssWithImages = (rrssRaw || []).map((red, i) => {
        if (red.imageId) {
            const img = rrssImages[i];
            return {
                link: red.link,
                imageUrl: img?.source_url || "",
                imageAlt: img?.alt_text || red.title || "Red social"
            };
        }
        return {
            link: red.link,
            imageUrl: red.imageUrl || "",
            imageAlt: red.imageAlt || red.title || "Red social"
        };
    });
    
    // ============================================
    // PASO 6: Construir objeto final por idioma
    // ============================================
    const globalData = {};
    
    languages.forEach((lang, i) => {
        const headerACF = allHeaders[i] || {};
        const footerACF = allFooters[i] || {};
        const footerImgs = footerImagesByLang[lang] || [];
        
        globalData[lang] = {
            lang,
            header: {
                ...headerACF,
                imageUrl: headerImages[i]?.source_url || "",
                imageAlt: headerImages[i]?.alt_text || "Logo Vibria"
            },
            footer: {
                ...footerACF,
                ubicacionImage: { 
                    url: footerImgs[0]?.source_url || "", 
                    alt: footerImgs[0]?.alt_text || "Ubicación" 
                },
                telefonoImage: { 
                    url: footerImgs[1]?.source_url || "", 
                    alt: footerImgs[1]?.alt_text || "Teléfono" 
                },
                correoImage: { 
                    url: footerImgs[2]?.source_url || "", 
                    alt: footerImgs[2]?.alt_text || "Correo" 
                }
            },
            categories: allCategories[i],
            rrss: rrssWithImages, // ✅ Compartido entre idiomas
            headerLinks: allHeaderLinks[i]
        };
    });
    
    console.log(`✅ [getGlobalData] Global data ready in ${Date.now() - startTime}ms`);
    
    // ============================================
    // GUARDAR EN CACHE
    // ============================================
    globalDataCache = globalData;
    return globalData;
}

/**
 * ✅ OPTIMIZACIÓN 3:
 * - Cachea el fetch de páginas para no repetir
 */
export async function getAllPages() {
    console.log('📡 [getAllPages] Starting fetch for all pages...');
    if (allPagesCache) {
        console.log("✅ [getAllPages] Cache hit for all pages.");
        return allPagesCache;
    }
    
    const startTime = Date.now();
    
    const pagesRes = await fetch(
        `${apiURL}/pages?per_page=500&_fields=slug,acf,content`
    );
    const allPages = await pagesRes.json();
    
    console.log(`✅ [getAllPages] Fetched ${allPages.length} pages in ${Date.now() - startTime}ms`);
    
    // GUARDAR EN CACHE
    allPagesCache = allPages;
    return allPages;
}