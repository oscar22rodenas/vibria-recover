import { apiURL } from "@wp/config.js";
import { 
    getPostsInfo, 
    getImageInfo, 
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
    if (globalDataCache) {
        console.log("✅ [CACHE HIT] Using cached global data");
        return globalDataCache;
    }
    
    const languages = ["ca", "es", "en"];
    const startTime = Date.now();
    
    console.log("📡 [FETCH] Fetching global data...");
    
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
    
    console.log(`✅ [${Date.now() - startTime}ms] Basic data fetched`);
    
    // ============================================
    // PASO 2: Recopilar TODOS los IDs de imágenes
    // ============================================
    const imagePromises = [];
    
    // Headers (3 imágenes: una por idioma)
    allHeaders.forEach(header => {
        if (header?.header_imagen) {
            imagePromises.push(getImageInfo(header.header_imagen));
        } else {
            imagePromises.push(Promise.resolve(null));
        }
    });
    
    // Footers (hasta 9 imágenes: 3 por footer × 3 idiomas)
    allFooters.forEach(footer => {
        const ids = [
            footer?.ubicacion_imagen,
            footer?.telefono_imagen,
            footer?.correo_imagen
        ].filter(Boolean);
        
        ids.forEach(id => imagePromises.push(getImageInfo(id)));
    });
    
    // RRSS (N imágenes compartidas)
    const rrssImagePromises = (rrssRaw || [])
        .filter(red => red.imageId)
        .map(red => getImageInfo(red.imageId));
    
    // ============================================
    // PASO 3: Fetchear TODAS las imágenes en paralelo
    // ============================================
    const allImages = await Promise.all([...imagePromises, ...rrssImagePromises]);
    
    console.log(`✅ [${Date.now() - startTime}ms] All images resolved`);
    
    // ============================================
    // PASO 4: Distribuir imágenes a sus respectivos owners
    // ============================================
    let imageIndex = 0;
    
    // Headers: primeras 3 imágenes
    const headerImages = allImages.slice(0, languages.length);
    imageIndex += languages.length;
    
    // Footers: siguientes N imágenes
    const footerImagesByLang = {};
    allFooters.forEach((footer, i) => {
        const lang = languages[i];
        const count = [
            footer?.ubicacion_imagen,
            footer?.telefono_imagen,
            footer?.correo_imagen
        ].filter(Boolean).length;
        
        footerImagesByLang[lang] = allImages.slice(imageIndex, imageIndex + count);
        imageIndex += count;
    });
    
    // RRSS: últimas N imágenes
    const rrssImages = allImages.slice(imageIndex);
    
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
    
    console.log(`✅ [${Date.now() - startTime}ms] Global data ready`);
    
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
    if (allPagesCache) {
        console.log("✅ [CACHE HIT] Using cached pages");
        return allPagesCache;
    }
    
    console.log("📡 [FETCH] Fetching all pages...");
    
    const pagesRes = await fetch(
        `${apiURL}/pages?per_page=100&_fields=slug,acf,content`
    );
    const allPages = await pagesRes.json();
    
    console.log(`✅ ${allPages.length} pages fetched`);
    
    // GUARDAR EN CACHE
    allPagesCache = allPages;
    return allPages;
}