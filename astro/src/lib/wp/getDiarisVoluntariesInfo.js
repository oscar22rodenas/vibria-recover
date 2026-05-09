import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";

let diarisRawCache = null;
let diarisProcessedCache = null;

export const getAllDiarisInfo = async () => {
  console.log('📡 [DIARIS] Starting processing for all diaris...');
  if (diarisProcessedCache) {
    console.log(diarisProcessedCache);
    console.log('✅ [DIARIS] Cache hit for processed diaris.');
    return diarisProcessedCache;
  }
  
  console.log('📡 [DIARIS] Processing all diaris for all languages...');
  const startTime = Date.now();
  
  if (!diarisRawCache) {
    console.log('📡 [DIARIS] Fetching raw anys and diaris from API (anys per_page=100).');
    const [anysRes, diarisRes] = await Promise.all([
      fetch(`${apiURL}/anys?_fields=id,name,slug,description&per_page=100&orderby=name&order=desc`),
      fetch(`${apiURL}/diaris?_fields=id,slug,title,anys,acf&per_page=500`)
    ]);

    let fetchedAnys = [];
    if (anysRes.ok) {
      fetchedAnys = await anysRes.json();
      if (!Array.isArray(fetchedAnys)) {
        console.warn(`⚠️ [DIARIS] API for anys did not return an array. Received:`, fetchedAnys);
        fetchedAnys = [];
      }
    } else {
      console.error(`❌ [DIARIS] Failed to fetch anys (status: ${anysRes.status})`);
    }
    console.log(`✅ [DIARIS] Fetched ${fetchedAnys.length} anys.`);

    let fetchedDiaris = [];
    if (diarisRes.ok) {
      fetchedDiaris = await diarisRes.json();
      if (!Array.isArray(fetchedDiaris)) {
        console.warn(`⚠️ [DIARIS] API for diaris did not return an array. Received:`, fetchedDiaris);
        fetchedDiaris = [];
      }
    } else {
      console.error(`❌ [DIARIS] Failed to fetch diaris (status: ${diarisRes.status})`);
    }
    console.log(`✅ [DIARIS] Fetched ${fetchedDiaris.length} diaris.`);

    diarisRawCache = {
      anys: fetchedAnys,
      diaris: fetchedDiaris
    };
    
    console.log(`✅ [DIARIS] Fetched ${diarisRawCache.anys.length} raw anys + ${diarisRawCache.diaris.length} raw diaris.`);
  } else {
    console.log('✅ [DIARIS] Raw anys and diaris found in cache.');
  }
  
  // Colectar todos los IDs de imágenes y páginas de los ACF
  const allImageIds = [];
  const allPageIds = [];
  
  diarisRawCache.diaris.forEach(diari => {
    if (diari.acf?.diari_imagen) allImageIds.push(diari.acf.diari_imagen);
    if (diari.acf?.diari_link) allPageIds.push(diari.acf.diari_link);
  });
  console.log(`   [DIARIS] Collected ${allImageIds.length} image IDs and ${allPageIds.length} page IDs.`);
  
  console.log(`📡 [DIARIS] Fetching ${allImageIds.length} images and ${allPageIds.length} pages in 2 batch requests...`);
  
  const [allImages, allPages] = await Promise.all([
    getImagesByIds(allImageIds),
    getPagesByIds(allPageIds)
  ]);
  console.log(`✅ [DIARIS] Received ${allImages.length} images and ${allPages.length} pages from batch fetches.`);
  
  // Crear mapas para acceso rápido por ID
  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));
  console.log(`   [DIARIS] Constructed imageMap with ${imageMap.size} entries.`);
  
  const pageMap = new Map();
  allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));
  console.log(`   [DIARIS] Constructed pageMap with ${pageMap.size} entries.`);
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    // Los años no se filtran por idioma
    const anysProcessed = diarisRawCache.anys.map(any => ({
      id: any.id,
      name: any.name,
      slug: any.slug,
      description: any.description
    }));
    console.log(`   [DIARIS] Processed ${anysProcessed.length} anys (language-agnostic) for lang: ${lang}`);
    
    // Filtrar diaris por idioma
    const diarisFiltrados = diarisRawCache.diaris.filter(diari => {
      console.log(`      [DIARIS] Checking diari slug "${diari.slug}" against lang "${lang}"`);
      return diari.slug.includes(`-${lang}`);
    });
    console.log(`   [DIARIS] Found ${diarisFiltrados.length} diaris for language: ${lang}`);
    
    // Procesar cada diari con sus imágenes y links
    const diarisProcessed = diarisFiltrados.map(diari => {
      const { acf } = diari;
      const imageData = imageMap.get(acf?.diari_imagen);
      const pageData = pageMap.get(acf?.diari_link);
      
      const processedDiari = {
        title: diari.title?.rendered || '',
        slug: diari.slug.replace(`-${lang}`, ''),
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || 'Diari image',
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#',
        anyIds: diari.anys || []
      };
      
      return processedDiari;
    });
    
    result[lang] = {
      anys: anysProcessed,
      diaris: diarisProcessed
    };
  });
  
  diarisProcessedCache = result;
  const duration = Date.now() - startTime;
  
  return result;
};

export const getDiarisVoluntariesInfo = async (lang, slug) => {
  try {    
    // 1. Obtener el contenido de la página principal (el texto de arriba)
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content`);
    const [pageData] = await responsePage.json();

    // 2. Obtener los Años (Taxonomía 'anys')
    const responseAnys = await fetch(`${apiURL}/anys?_fields=id,name,slug`);
    const anys = await responseAnys.json();

    // 3. Obtener todos los Diarios (CPT 'diaris')
    // Usamos _embed para que traiga la imagen destacada
    const responseDiaris = await fetch(`${apiURL}/diaris?_embed&_fields=id,slug,title,anys,_links,_embedded`);
    const diaris = await responseDiaris.json();

    return {
      content: pageData?.content?.rendered || "",
      anys: anys || [],
      diaris: diaris || []
    };
  } catch (error) {
    console.error("Error obteniendo diaris voluntaries:", error);
    return { content: "", anys: [], diaris: [] };
  }
};