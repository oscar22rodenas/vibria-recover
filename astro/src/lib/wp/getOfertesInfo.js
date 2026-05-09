import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

let ofertesRawCache = null;
let ofertesProcessedCache = null;

export const getAllOfertesInfo = async () => {
  if (ofertesProcessedCache) {
    console.log('✅ [OFERTES] Cache hit for processed ofertes.');
    return ofertesProcessedCache;
  }
  
  console.log('📡 [OFERTES] Processing all ofertes for all languages...');
  const startTime = Date.now();
  
  if (!ofertesRawCache) {
    console.log('📡 [OFERTES] Fetching raw ofertes from API.');
    const response = await fetch(`${apiURL}/ofertes?order=asc&_fields=acf,slug&per_page=500`);
    ofertesRawCache = await response.json();
    console.log(`✅ [OFERTES] Fetched ${ofertesRawCache.length} raw ofertes.`);
  } else {
    console.log('✅ [OFERTES] Raw ofertes found in cache.');
  }
  
  const allImageIds = [];
  const allPageIds = [];
  
  ofertesRawCache.forEach(oferta => {
    if (oferta.acf?.oferta_imagen) allImageIds.push(oferta.acf.oferta_imagen);
    if (oferta.acf?.oferta_link) allPageIds.push(oferta.acf.oferta_link);
  });
  console.log(`   [OFERTES] Collected ${allImageIds.length} image IDs and ${allPageIds.length} page IDs.`);
  
  console.log(`📡 [OFERTES] Fetching ${allImageIds.length} images and ${allPageIds.length} pages in 2 batch requests...`);
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),
    getPagesByIds(allPageIds)
  ]);
  console.log(`✅ [OFERTES] Received ${allImages.length} images and ${allPages.length} pages from batch fetches.`);
  
  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  console.log(`   [OFERTES] Constructed imageMap with ${imageMap.size} entries.`);
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  console.log(`   [OFERTES] Constructed pageMap with ${pageMap.size} entries.`);
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const ofertesFiltrados = ofertesRawCache.filter(oferta => {
      const extracted = extractLang(oferta.slug);
      return extracted && extracted.lang === lang;
    });
    console.log(`   [OFERTES] Found ${ofertesFiltrados.length} ofertes for language: ${lang}`);
    
    result[lang] = ofertesFiltrados.map(oferta => {
      const { acf } = oferta;
      const imageData = imageMap.get(acf.oferta_imagen);
      const pageData = pageMap.get(acf.oferta_link);
      
      const processedOferta = {
        title: acf.oferta_titulo || '',
        text: acf.oferta_texto || '',
        ubicacion: acf.oferta_ubicacion || '',
        fechas: acf.oferta_fechas || '',
        dataLimit: acf.oferta_data_limit || '',
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#',
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Oferta image',
        content: '',
      };
      // console.log(`      [OFERTES] Processed oferta for ${lang}:`, JSON.stringify(processedOferta)); // Too verbose, uncomment if really needed
      return processedOferta;
    });
  });
  
  ofertesProcessedCache = result;
  const duration = Date.now() - startTime;
  console.log(`✅ [OFERTES] All ofertes processed in ${duration}ms. Final structure:`, Object.keys(result).map(key => `${key}: ${result[key].length} ofertes`).join(', '));
  
  return result;
};

export const getOfertesInfo = async (lang) => {
  console.log(`📡 [OFERTES] Request for ofertes for language: ${lang}`);
  const allOfertes = await getAllOfertesInfo();
  return allOfertes[lang] || [];
};

export const resetOfertesCache = () => {
  ofertesRawCache = null;
  ofertesProcessedCache = null;
  console.log('🔄 [OFERTES] Cache cleared');
};