import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { getPageById } from "./getPageById.js";

function resolveContent(pageData) {
  if (!pageData) return "";
  if (typeof pageData.content === "string") return pageData.content;
  return pageData.content?.rendered || "";
}

/**
 * Crea un getter de detalle que combina un CPT + los datos de su página WP.
 * La página (acf + content) se pasa desde las rutas para evitar re-fetchearla.
 *
 * - fieldsSource: "cpt" (title/ubicacion/... salen del CPT) o "page" (caso volunteer)
 * - onError: valor devuelto ante cualquier error (null para los completos, [] para los simples)
 */
export function createDetallada({
  endpoint,
  prefix,
  fieldsSource = "cpt",
  imageAlt = `${prefix} image`,
  fallbackButton = "Més informació",
  onError = null
}) {
  return async function getDetalladaInfo(slug, pageDataFromRoutes) {
    try {
      const pageData = pageDataFromRoutes || {};
      const pageAcf = pageData.acf || {};
      const pageContent = resolveContent(pageData);

      let cptAcf = {};
      if (endpoint) {
        const response = await fetch(`${apiURL}/${endpoint}?slug=${slug}&_fields=acf`);
        if (!response.ok) {
          throw new Error(`Error al obtenir ${endpoint}`);
        }
        const [postData] = await response.json();
        if (!postData) {
          throw new Error(`No s'ha trobat ${endpoint} amb slug ${slug}`);
        }
        cptAcf = postData.acf || {};
      }

      const imageData = cptAcf[`${prefix}_imagen`] ? await getImageInfo(cptAcf[`${prefix}_imagen`]) : null;
      const pageId = pageAcf[`${prefix}_boton_link`] ? await getPageById(pageAcf[`${prefix}_boton_link`]) : null;

      const source = fieldsSource === "page" ? pageAcf : cptAcf;

      return {
        title: source[`${prefix}_titulo`] || "",
        subtitle: source[`${prefix}_subtitulo`] || "",
        ubicacion: source[`${prefix}_ubicacion`] || "",
        fechas: source[`${prefix}_fechas`] || "",
        imageUrl: imageData?.source_url || "",
        imageAlt: imageData?.alt_text || imageAlt,
        content: pageContent,
        buttonText: pageAcf[`${prefix}_boton_texto`] || fallbackButton,
        buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
      };
    } catch (error) {
      console.error(`Error obtenint ${prefix}:`, error);
      return onError;
    }
  };
}

/**
 * Crea un getter de detalle simple (solo content + botón, sin CPT).
 */
export function createSimpleDetallada({
  prefix,
  fallbackButton = "Més informació",
  onError = []
}) {
  return async function getSimpleDetalladaInfo(slug, pageDataFromRoutes) {
    try {
      const pageData = pageDataFromRoutes || {};
      const pageAcf = pageData.acf || {};
      const pageContent = resolveContent(pageData);

      const pageId = pageAcf[`${prefix}_boton_link`] ? await getPageById(pageAcf[`${prefix}_boton_link`]) : null;

      return {
        content: pageContent,
        buttonText: pageAcf[`${prefix}_boton_texto`] || fallbackButton,
        buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
      };
    } catch (error) {
      console.error(`Error obtenint ${prefix}:`, error);
      return onError;
    }
  };
}