import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";

let slidesRawCache = null;
let slidesProcessedCache = null;

export const getAllSlidesInfo = async () => {
  if (slidesProcessedCache) {
    console.log('✅ [SLIDES] Cache hit for processed slides.');
    return slidesProcessedCache;
  }
  
  console.log('📡 [SLIDES] Processing all slides for all languages...');
  const startTime = Date.now();
  
  if (!slidesRawCache) {
    console.log('📡 [SLIDES] Fetching raw slides from API.');
    const response = await fetch(`${apiURL}/slides?order=asc&_fields=acf,slug&per_page=500`);
    slidesRawCache = await response.json();
    console.log(`✅ [SLIDES] Fetched ${slidesRawCache.length} raw slides.`);
  } else {
    console.log('✅ [SLIDES] Raw slides found in cache.');
  }
  
  const allImageIds = [];
  const allPageIds = [];
  
  slidesRawCache.forEach(slide => {
    if (slide.acf?.slide_imagen) allImageIds.push(slide.acf.slide_imagen);
    if (slide.acf?.slide_boton_link) allPageIds.push(slide.acf.slide_boton_link);
  });
  console.log(`   [SLIDES] Collected ${allImageIds.length} image IDs and ${allPageIds.length} page IDs.`);
  
  console.log(`📡 [SLIDES] Fetching ${allImageIds.length} images and ${allPageIds.length} pages in 2 batch requests...`);
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),   // ✅ 1 request para TODAS las imágenes
    getPagesByIds(allPageIds)      // ✅ 1 request para TODAS las páginas
  ]);
  console.log(`✅ [SLIDES] Received ${allImages.length} images and ${allPages.length} pages from batch fetches.`);

  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  console.log(`   [SLIDES] Constructed imageMap with ${imageMap.size} entries.`);
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  console.log(`   [SLIDES] Constructed pageMap with ${pageMap.size} entries.`);
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const slidesFiltrados = slidesRawCache.filter(slide => slide.slug.includes(`-${lang}`));
    console.log(`   [SLIDES] Found ${slidesFiltrados.length} slides for language: ${lang}`);
    
    result[lang] = slidesFiltrados.map(slide => {
      const { acf } = slide;
      const imageData = imageMap.get(acf.slide_imagen);
      const pageData = pageMap.get(acf.slide_boton_link);
      
      const processedSlide = {
        title: acf.slide_titulo || '',
        subtitle: acf.slide_subtitulo || '',
        text: acf.slide_texto || '',
        buttonText: acf.slide_boton_texto || '',
        buttonUrl: pageData ? `/${pageData.lang}/${pageData.baseSlug}` : '#',
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Slide image',
      };
      // console.log(`      [SLIDES] Processed slide for ${lang}:`, JSON.stringify(processedSlide)); // Too verbose, uncomment if really needed
      return processedSlide;
    });
  });
  
  slidesProcessedCache = result;
  const duration = Date.now() - startTime;
  console.log(`✅ [SLIDES] All slides processed in ${duration}ms. Final structure:`, Object.keys(result).map(key => `${key}: ${result[key].length} slides`).join(', '));
  
  return result;
};

export const getSlidesInfo = async (lang) => {
  console.log(`📡 [SLIDES] Request for slides for language: ${lang}`);
  const allSlides = await getAllSlidesInfo();
  return allSlides[lang] || [];
};

export const resetSlidesCache = () => {
  slidesRawCache = null;
  slidesProcessedCache = null;
  console.log('🔄 [SLIDES] Cache cleared');
};