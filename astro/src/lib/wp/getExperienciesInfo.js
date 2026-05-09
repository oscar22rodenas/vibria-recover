import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

let experienciesRawCache = null;
let experienciesProcessedCache = null;

export const getAllExperienciesInfo = async () => {
  if (experienciesProcessedCache) {
    console.log('✅ [EXPERIENCIES] Cache hit for processed experiencies.');
    return experienciesProcessedCache;
  }
  
  console.log('📡 [EXPERIENCIES] Processing all experiencies for all languages...');
  const startTime = Date.now();
  
  if (!experienciesRawCache) {
    console.log('📡 [EXPERIENCIES] Fetching raw experiencies from API.');
    const response = await fetch(`${apiURL}/experiencies-ve?order=asc&_fields=acf,slug&per_page=500`);
    experienciesRawCache = await response.json();
    console.log(`✅ [EXPERIENCIES] Fetched ${experienciesRawCache.length} raw experiencies.`);
  } else {
    console.log('✅ [EXPERIENCIES] Raw experiencies found in cache.');
  }
  
  const allImageIds = [];
  const allPageIds = [];
  
  experienciesRawCache.forEach(exp => {
    if (exp.acf?.experiencia_imagen) allImageIds.push(exp.acf.experiencia_imagen);
    if (exp.acf?.experiencia_link) allPageIds.push(exp.acf.experiencia_link);
  });
  console.log(`   [EXPERIENCIES] Collected ${allImageIds.length} image IDs and ${allPageIds.length} page IDs.`);
  
  console.log(`📡 [EXPERIENCIES] Fetching ${allImageIds.length} images and ${allPageIds.length} pages in 2 batch requests...`);
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),
    getPagesByIds(allPageIds)
  ]);
  console.log(`✅ [EXPERIENCIES] Received ${allImages.length} images and ${allPages.length} pages from batch fetches.`);
  
  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  console.log(`   [EXPERIENCIES] Constructed imageMap with ${imageMap.size} entries.`);
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  console.log(`   [EXPERIENCIES] Constructed pageMap with ${pageMap.size} entries.`);
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const experienciesFiltrados = experienciesRawCache.filter(exp => {
      const extracted = extractLang(exp.slug);
      return extracted && extracted.lang === lang;
    });
    console.log(`   [EXPERIENCIES] Found ${experienciesFiltrados.length} experiencies for language: ${lang}`);
    
    result[lang] = experienciesFiltrados.map(exp => {
      const { acf } = exp;
      const imageData = imageMap.get(acf.experiencia_imagen);
      const pageData = pageMap.get(acf.experiencia_link);
      
      const processedExperiencia = {
        title: acf.experiencia_titulo || '',
        text: acf.experiencia_texto || '',
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#',
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Experiencia image',
        pinVoluntariat: acf.experiencia_pin_voluntariat || '',
        pinPais: acf.experiencia_pin_pais || '',
        content: '',
      };
      // console.log(`      [EXPERIENCIES] Processed experiencia for ${lang}:`, JSON.stringify(processedExperiencia)); // Too verbose, uncomment if really needed
      return processedExperiencia;
    });
  });
  
  experienciesProcessedCache = result;
  const duration = Date.now() - startTime;
  console.log(`✅ [EXPERIENCIES] All experiencies processed in ${duration}ms. Final structure:`, Object.keys(result).map(key => `${key}: ${result[key].length} experiencies`).join(', '));
  
  return result;
};

export const getExperienciesInfo = async (lang) => {
  console.log(`📡 [EXPERIENCIES] Request for experiencies for language: ${lang}`);
  const allExperiencies = await getAllExperienciesInfo();
  return allExperiencies[lang] || [];
};

export const resetExperienciesCache = () => {
  experienciesRawCache = null;
  experienciesProcessedCache = null;
  console.log('🔄 [EXPERIENCIES] Cache cleared');
};