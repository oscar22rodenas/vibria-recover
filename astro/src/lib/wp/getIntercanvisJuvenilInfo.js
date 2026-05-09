import { apiURL } from "./config.js";
import { getAllExperienciesErasmusInfo } from "./getExperienciesErasmusInfo.js";

export async function getIntercanvisJuvenilInfo(lang, slug) {
  console.log(`📡 [INTERCANVIS] Request for language: ${lang}, slug: ${slug}`);
  const startTime = Date.now();
  
  const allExperiencies = await getAllExperienciesErasmusInfo();
  console.log(`   [INTERCANVIS] Received ${Object.keys(allExperiencies).length} languages of Erasmus experiences.`);
  
  const experienciesLang = allExperiencies[lang] || [];
  console.log(`   [INTERCANVIS] Found ${experienciesLang.length} Erasmus experiences for language: ${lang}.`);
  
  const lastTwoExperiences = experienciesLang.slice(0, 2);
  console.log(`   [INTERCANVIS] Extracted ${lastTwoExperiences.length} latest Erasmus experiences.`);
  
  const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content`);
  const [pageDataInfo] = await responsePage.json();
  console.log(`   [INTERCANVIS] Fetched page content for slug: ${slug}. Content present: ${!!pageDataInfo?.content?.rendered}`);
  
  const duration = Date.now() - startTime;
  const result = [{
    pageContent: pageDataInfo?.content?.rendered || '',
    experiencesErasmus: lastTwoExperiences
  }];
  
  return result;
}