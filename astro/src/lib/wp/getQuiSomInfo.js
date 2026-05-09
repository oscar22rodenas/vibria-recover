import { apiURL } from "./config.js";
import { getPagesByIds } from "./getPageById.js";

let quiSomRawCache = null;
let quiSomProcessedCache = null;

export const getAllQuiSomInfo = async () => {
  console.log('📡 [QUI-SOM] Starting processing for all qui-som data...');
  if (quiSomProcessedCache) {
    console.log('✅ [QUI-SOM] Cache hit for processed qui-som data.');
    return quiSomProcessedCache;
  }
  
  console.log('📡 [QUI-SOM] Processing all qui-som for all languages...');
  const startTime = Date.now();
  
  if (!quiSomRawCache) {
    console.log('📡 [QUI-SOM] Fetching raw team and voluntaries data from API.');
    const [teamRes, volRes] = await Promise.all([
      fetch(`${apiURL}/qui-som?order=asc&per_page=500&_fields=content,slug`),
      fetch(`${apiURL}/qui-som-voluntaries?order=asc&per_page=500&_fields=content,slug`)
    ]);

    let fetchedTeam = [];
    if (teamRes.ok) {
      fetchedTeam = await teamRes.json();
      if (!Array.isArray(fetchedTeam)) {
        console.warn(`⚠️ [QUI-SOM] API for team did not return an array. Received:`, fetchedTeam);
        fetchedTeam = [];
      }
    } else {
      console.error(`❌ [QUI-SOM] Failed to fetch team data (status: ${teamRes.status})`);
    }

    let fetchedVoluntaries = [];
    if (volRes.ok) {
      fetchedVoluntaries = await volRes.json();
      if (!Array.isArray(fetchedVoluntaries)) {
        console.warn(`⚠️ [QUI-SOM] API for voluntaries did not return an array. Received:`, fetchedVoluntaries);
        fetchedVoluntaries = [];
      }
    } else {
      console.error(`❌ [QUI-SOM] Failed to fetch voluntaries data (status: ${volRes.status})`);
    }
    
    quiSomRawCache = {
      team: fetchedTeam,
      voluntaries: fetchedVoluntaries
    };
    
    console.log(`✅ [QUI-SOM] Fetched ${quiSomRawCache.team.length} raw team members + ${quiSomRawCache.voluntaries.length} raw voluntaries.`);
  } else {
    console.log('✅ [QUI-SOM] Raw qui-som data found in cache.');
  }
  
  const result = {};
  
  ['ca', 'es', 'en'].forEach(lang => {
    const teamFiltrados = quiSomRawCache.team.filter(item => item.slug?.includes(`-${lang}`));
    const voluntariesFiltrados = quiSomRawCache.voluntaries.filter(item => item.slug?.includes(`-${lang}`));
    console.log(`   [QUI-SOM] Found ${teamFiltrados.length} team members and ${voluntariesFiltrados.length} voluntaries for language: ${lang}`);
    
    result[lang] = {
      teamMembers: teamFiltrados.map(item => item.content.rendered),
      voluntaries: voluntariesFiltrados.map(item => item.content.rendered)
    };
  });
  
  quiSomProcessedCache = result;
  const duration = Date.now() - startTime;
  console.log(`✅ [QUI-SOM] All qui-som processed in ${duration}ms. Final structure:`, Object.keys(result).map(key => `${key}: team(${result[key].teamMembers.length}), voluntaries(${result[key].voluntaries.length})`).join(', '));
  
  return result;
};

export const getQuiSomInfo = async (lang, slug) => {
  console.log(`📡 [QUI-SOM] Getting qui-som for language: ${lang}, slug: ${slug}`);
  const startTime = Date.now();
  
  const allData = await getAllQuiSomInfo();
  console.log(`   [QUI-SOM] Received processed qui-som data for all languages.`);

  const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
  let pageDataInfo = null;
  if (responsePage.ok) {
    [pageDataInfo] = await responsePage.json();
    console.log(`   [QUI-SOM] Fetched page content for slug: ${slug}. Content present: ${!!pageDataInfo?.content?.rendered}`);
  } else {
    console.error(`❌ [QUI-SOM] Failed to fetch page content for slug: ${slug} (status: ${responsePage.status})`);
  }
  
  const buttonPageId = pageDataInfo?.acf?.qui_som_boton_link;
  let pageData = null;
  if (buttonPageId) {
    pageData = (await getPagesByIds([buttonPageId]))[0];
    console.log(`   [QUI-SOM] Resolved button page data for ID ${buttonPageId}:`, JSON.stringify(pageData));
  } else {
    console.log(`   [QUI-SOM] No button page ID found.`);
  }
  
  const duration = Date.now() - startTime;
  const result = [{
    quisom: allData[lang].teamMembers,
    voluntaries: allData[lang].voluntaries,
    pageContent: pageDataInfo?.content?.rendered || '',
    titol1: pageDataInfo?.acf?.qui_som_titulo_1 || '',
    titol2: pageDataInfo?.acf?.qui_som_titulo_2 || '',
    text: pageDataInfo?.acf?.qui_som_texto || '',
    buttonText: pageDataInfo?.acf?.qui_som_boton_texto || '',
    buttonUrl: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : '#'
  }];
  
  return result;
};

export const resetQuiSomCache = () => {
  quiSomRawCache = null;
  quiSomProcessedCache = null;
  console.log('🔄 [QUI-SOM] Cache cleared');
};
