import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

let volunteersRawCache = null;
let volunteersProcessedCache = null;

export const getAllVolunteersInfo = async () => {
  if (volunteersProcessedCache) {
    console.log('✅ [VOLUNTEERS] Cache hit for processed volunteers.');
    return volunteersProcessedCache;
  }
  
  console.log('📡 [VOLUNTEERS] Processing all volunteers for all languages...');
  const startTime = Date.now();
  
  if (!volunteersRawCache) {
    console.log('📡 [VOLUNTEERS] Fetching raw volunteers from API.');
    // Note: CPT endpoint is usually plural 'volunteers'
    const response = await fetch(`${apiURL}/volunteer?order=asc&_fields=acf,slug&per_page=500`);
    volunteersRawCache = await response.json();
    console.log(`✅ [VOLUNTEERS] Fetched ${volunteersRawCache.length} raw volunteers.`);
  }
  
  const allImageIds = [];
  const allPageIds = [];
  
  volunteersRawCache.forEach(item => {
    if (item.acf?.volunteer_imagen) allImageIds.push(item.acf.volunteer_imagen);
    if (item.acf?.volunteer_link) allPageIds.push(item.acf.volunteer_link);
  });
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),
    getPagesByIds(allPageIds)
  ]);
  
  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const itemsFiltrados = volunteersRawCache.filter(item => {
      const extracted = extractLang(item.slug);
      return extracted && extracted.lang === lang;
    });
    
    result[lang] = itemsFiltrados.map(item => {
      const { acf } = item;
      const imageData = imageMap.get(acf.volunteer_imagen);
      const pageData = pageMap.get(acf.volunteer_link);
      
      return {
        title: acf.volunteer_titulo || '',
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Volunteer image',
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#',
      };
    });
  });
  
  volunteersProcessedCache = result;
  return result;
};

/**
 * Get volunteer page content and its cards (from CPT).
 */
export const getVolunteerInfo = async (lang, slug) => {
  console.log(`📡 [VOLUNTEER] Request for language: ${lang}, slug: ${slug}`);
  
  // 1. Get processed cards for this language
  const allVolunteers = await getAllVolunteersInfo();
  const volunteerCards = allVolunteers[lang] || [];
  
  // 2. Get the specific page content
  const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
  let pageContent = '';
  let pageACF = {};
  
  if (responsePage.ok) {
    const [pageData] = await responsePage.json();
    if (pageData) {
      pageContent = pageData.content.rendered || '';
      pageACF = pageData.acf || {};
    }
  }

  // Structure the result to be returned as an array of 1 element (matching other files pattern)
  return [{
    pageContent,
    cards: volunteerCards,
    acf: pageACF
  }];
};

export const resetVolunteersCache = () => {
  volunteersRawCache = null;
  volunteersProcessedCache = null;
  console.log('🔄 [VOLUNTEERS] Cache cleared');
};
