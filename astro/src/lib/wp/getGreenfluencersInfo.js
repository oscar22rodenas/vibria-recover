import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";

let greenfluencersRawCache = null;
let greenfluencersProcessedCache = null;

export const getAllGreenfluencersInfo = async () => {
  if (greenfluencersProcessedCache) {
    return greenfluencersProcessedCache;
  }

  const startTime = Date.now();

  if (!greenfluencersRawCache) {
    const [anysRes, newsRes] = await Promise.all([
      fetch(`${apiURL}/anys-greenfluencers?_fields=id,name,slug&per_page=100&orderby=name&order=desc`),
      fetch(`${apiURL}/greenfluencers?_fields=id,slug,title,acf,anys-greenfluencers&per_page=500`)
    ]);

    let fetchedAnys = [];
    if (anysRes.ok) {
      fetchedAnys = await anysRes.json();
      if (!Array.isArray(fetchedAnys)) fetchedAnys = [];
    }

    let fetchedNews = [];
    if (newsRes.ok) {
      fetchedNews = await newsRes.json();
      if (!Array.isArray(fetchedNews)) fetchedNews = [];
    }

    greenfluencersRawCache = {
      anys: fetchedAnys,
      news: fetchedNews
    };
  }

  const allImageIds = [];
  greenfluencersRawCache.news.forEach(item => {
    if (item.acf?.greenfluencers_noticia_imagen) allImageIds.push(item.acf.greenfluencers_noticia_imagen);
  });

  const allImages = await getImagesByIds(allImageIds);

  const imageMap = new Map();
  allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));

  const result = {};
  ['ca', 'es', 'en'].forEach(lang => {
    const anysProcessed = greenfluencersRawCache.anys.map(any => ({
      id: any.id,
      name: any.name,
      slug: any.slug
    }));

    const newsFiltered = greenfluencersRawCache.news.filter(item => {
      return item.slug.includes(`-${lang}`);
    });

    const newsProcessed = newsFiltered.map(item => {
      const acf = item.acf || {};
      const imageData = imageMap.get(acf.greenfluencers_noticia_imagen);
      return {
        title: item.title?.rendered || '',
        slug: item.slug.replace(`-${lang}`, ''),
        imageUrl: imageData?.source_url || '',
        imageAlt: imageData?.alt_text || '',
        description: acf.greenfluencers_noticia_descripcion || '',
        anyIds: item['anys-greenfluencers'] || []
      };
    });

    result[lang] = {
      anys: anysProcessed,
      news: newsProcessed
    };
  });

  greenfluencersProcessedCache = result;
  return result;
};

export const getGreenfluencersInfo = async (lang, slug) => {
  const allData = await getAllGreenfluencersInfo();
  const langData = allData[lang] || { anys: [], news: [] };

  const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
  let pageDataInfo = null;
  if (responsePage.ok) {
    [pageDataInfo] = await responsePage.json();
  }

  const result = [{
    pageContent: pageDataInfo?.content?.rendered || '',
    acf: pageDataInfo?.acf || {},
    anys: langData.anys,
    news: langData.news
  }];
  return result;
};

export const resetGreenfluencersCache = () => {
  greenfluencersRawCache = null;
  greenfluencersProcessedCache = null;
};
