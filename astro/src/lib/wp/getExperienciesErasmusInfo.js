import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

let experienciesErasmusRawCache = null;
let experienciesErasmusProcessedCache = null;

export const getAllExperienciesErasmusInfo = async () => {
  if (experienciesErasmusProcessedCache) {
    console.log('✅ [ERASMUS] Cache hit for processed experiencies Erasmus.');
    return experienciesErasmusProcessedCache;
  }
  
  console.log('📡 [ERASMUS] Processing all experiencies erasmus for all languages...');
  const startTime = Date.now();
  
  if (!experienciesErasmusRawCache) {
    console.log('📡 [ERASMUS] Fetching raw experiencies erasmus from API.');
    const response = await fetch(`${apiURL}/experiencies_erasmus?order=asc&_fields=acf,slug&per_page=500`);
    experienciesErasmusRawCache = await response.json();
    console.log(`✅ [ERASMUS] Fetched ${experienciesErasmusRawCache.length} raw experiencies erasmus.`);
  } else {
    console.log('✅ [ERASMUS] Raw experiencies erasmus found in cache.');
  }
  
  const allImageIds = [];
  const allPageIds = [];
  
  experienciesErasmusRawCache.forEach(exp => {
    if (exp.acf?.experiencia_imagen) allImageIds.push(exp.acf.experiencia_imagen);
    if (exp.acf?.experiencia_link) allPageIds.push(exp.acf.experiencia_link);
  });
  console.log(`   [ERASMUS] Collected ${allImageIds.length} image IDs and ${allPageIds.length} page IDs.`);
  
  console.log(`📡 [ERASMUS] Fetching ${allImageIds.length} images and ${allPageIds.length} pages in 2 batch requests...`);
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),
    getPagesByIds(allPageIds)
  ]);
  console.log(`✅ [ERASMUS] Received ${allImages.length} images and ${allPages.length} pages from batch fetches.`);
  
  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  console.log(`   [ERASMUS] Constructed imageMap with ${imageMap.size} entries.`);
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  console.log(`   [ERASMUS] Constructed pageMap with ${pageMap.size} entries.`);
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const experienciesFiltrados = experienciesErasmusRawCache.filter(exp => {
      const extracted = extractLang(exp.slug);
      return extracted && extracted.lang === lang;
    });
    console.log(`   [ERASMUS] Found ${experienciesFiltrados.length} experiencies Erasmus for language: ${lang}`);
    
    result[lang] = experienciesFiltrados.map(exp => {
      const { acf } = exp;
      const imageData = imageMap.get(acf.experiencia_imagen);
      const pageData = pageMap.get(acf.experiencia_link);
      
      const processedExperiencia = {
        title: acf.experiencia_titulo || '',
        text: acf.experiencia_texto || '',
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#',
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Experiencia Erasmus image',
        pinVoluntariat: acf.experiencia_pin_voluntariat || '',
        pinPais: acf.experiencia_pin_pais || '',
        content: '',
      };
      // console.log(`      [ERASMUS] Processed experiencia Erasmus for ${lang}:`, JSON.stringify(processedExperiencia)); // Too verbose, uncomment if really needed
      return processedExperiencia;
    });
  });
  
  experienciesErasmusProcessedCache = result;
  const duration = Date.now() - startTime;
  console.log(`✅ [ERASMUS] All experiencies erasmus processed in ${duration}ms. Final structure:`, Object.keys(result).map(key => `${key}: ${result[key].length} experiencies`).join(', '));
  
  return result;
};

export const getExperienciesErasmusInfo = async (lang) => {
  console.log(`📡 [ERASMUS] Request for experiencies Erasmus for language: ${lang}`);
  const allExperiencies = await getAllExperienciesErasmusInfo();
  return allExperiencies[lang] || [];
};

export const resetExperienciesErasmusCache = () => {
  experienciesErasmusRawCache = null;
  experienciesErasmusProcessedCache = null;
  console.log('🔄 [ERASMUS] Cache cleared');
};