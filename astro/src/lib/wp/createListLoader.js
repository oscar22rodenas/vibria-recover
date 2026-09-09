import { apiURL } from "./config.js";
import { getImagesByIds } from "./getImageInfo.js";
import { getPagesByIds } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

const LANGS = ["ca", "es", "en"];

/**
 * Crea un cargador de listas por idioma a partir de un CPT.
 * Reparte en una única pasada por idioma (extractLang) y en el mismo orden
 * que devuelve la API, manteniendo la forma de salida de los loaders originales.
 *
 * - imageField / linkField: campos ACF de la imagen y de la página enlazada
 * - fields: { claveSalida: campoAcf }
 * - linkMode: "categoria" -> /{lang}{categoria-slug}/{base} | "simple" -> /{lang}/{base}
 */
export function createListLoader({
  endpoint,
  imageField,
  linkField,
  imageAlt,
  fields = {},
  linkMode = "categoria"
}) {
  let rawCache = null;
  let processedCache = null;

  const buildLink = (pageData) => {
    if (!pageData) return "#";
    if (linkMode === "simple") {
      return `/${pageData.lang}/${pageData.baseSlug}`;
    }
    return `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}`;
  };

  const getAll = async () => {
    if (processedCache) return processedCache;

    if (!rawCache) {
      const response = await fetch(`${apiURL}/${endpoint}?order=asc&_fields=acf,slug&per_page=500`);
      const data = await response.json();
      rawCache = Array.isArray(data) ? data : [];
    }

    const allImageIds = [];
    const allPageIds = [];

    rawCache.forEach(item => {
      if (item.acf?.[imageField]) allImageIds.push(item.acf[imageField]);
      if (item.acf?.[linkField]) allPageIds.push(item.acf[linkField]);
    });

    const [allImages, allPages] = await Promise.all([
      getImagesByIds(allImageIds),
      getPagesByIds(allPageIds)
    ]);

    const imageMap = new Map();
    allImageIds.forEach((id, index) => imageMap.set(id, allImages[index]));

    const pageMap = new Map();
    allPageIds.forEach((id, index) => pageMap.set(id, allPages[index]));

    const result = { ca: [], es: [], en: [] };

    rawCache.forEach(item => {
      const extracted = extractLang(item.slug);
      if (!extracted || !LANGS.includes(extracted.lang)) return;

      const acf = item.acf || {};
      const imageData = imageMap.get(acf[imageField]);
      const pageData = pageMap.get(acf[linkField]);

      const itemResult = {};
      Object.keys(fields).forEach(key => {
        itemResult[key] = acf[fields[key]] || "";
      });
      itemResult.link = buildLink(pageData);
      itemResult.imageUrl = imageData?.source_url || "";
      itemResult.imageAlt = imageData?.alt_text || imageAlt;

      result[extracted.lang].push(itemResult);
    });

    processedCache = result;
    return result;
  };

  const getByLang = async (lang) => {
    const all = await getAll();
    return all[lang] || [];
  };

  const reset = () => {
    rawCache = null;
    processedCache = null;
  };

  return { getAll, getByLang, reset };
}