import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { extractLang } from "./extractLang.js";
import { getPagesByIds } from "./getPageById.js";

export async function getExperienciesErasmusInfo(lang) {
  try {
    // ============================================
    // PASO 1: Fetchear TODO en paralelo
    // ============================================
    const [experienciesResponse, pageResponse] = await Promise.all([
      fetch(`${apiURL}/experiencies_erasmus?order=asc&_fields=acf,slug`),
      fetch(`${apiURL}/pages?slug=erasmus-experiencies-${lang}&_fields=content`)
    ]);
    
    if (!experienciesResponse.ok) {
      console.error(`❌ Error fetching experiencies_erasmus: ${experienciesResponse.status}`);
      return [];
    }
    
    if (!pageResponse.ok) {
      console.error(`❌ Error fetching erasmus-experiencies page: ${pageResponse.status}`);
      return [];
    }
    
    const [data, pageDataArray] = await Promise.all([
      experienciesResponse.json(),
      pageResponse.json()
    ]);

    if (!Array.isArray(data)) {
      console.warn(`⚠️ getExperienciesErasmusInfo: Expected array, got:`, data);
      return [];
    }

    const [pageDataInfo] = pageDataArray;

    // ============================================
    // PASO 2: Filtrar por idioma
    // ============================================
    const experienciaFiltrados = data.filter(experiencia => {
      const extracted = extractLang(experiencia.slug);
      return extracted && extracted.lang === lang;
    });

    // ============================================
    // PASO 3: Recopilar TODOS los IDs
    // ============================================
    const imageIds = [];
    const pageIds = [];

    experienciaFiltrados.forEach((experiencia) => {
      const { acf } = experiencia;
      
      imageIds.push(acf?.experiencia_imagen || null);
      pageIds.push(acf?.experiencia_link || null);
    });

    // ============================================
    // PASO 4: Fetchear TODO en paralelo
    // ============================================
    const [images, pages] = await Promise.all([
      Promise.all(imageIds.map(id => id ? getImageInfo(id) : Promise.resolve(null))),
      getPagesByIds(pageIds.filter(Boolean)) // ✅ Usa la nueva función batch
    ]);

    // Reconstruir array completo de páginas (incluyendo nulls)
    let pageIndex = 0;
    const pagesWithNulls = pageIds.map(id => {
      if (id === null) return null;
      return pages[pageIndex++];
    });

    // ============================================
    // PASO 5: Construir resultado
    // ============================================
    const experienciaConDatos = experienciaFiltrados.map((experiencia, index) => {
      const { acf } = experiencia;
      
      if (!acf) {
        console.warn(`Experiencia Erasmus sin ACF: ${experiencia.slug}`);
        return null;
      }

      const imageData = images[index];
      const pageData = pagesWithNulls[index];

      return {
        title: acf.experiencia_titulo || "",
        text: acf.experiencia_texto || "",
        ubicacion: acf.experiencia_ubicacion || "",
        fechas: acf.experiencia_fechas || "",
        dataLimit: acf.experiencia_data_limit || "",
        link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : "#",
        imageUrl: imageData?.source_url || "",
        imageAlt: imageData?.alt_text || "Experiencia Erasmus image",
        content: pageDataInfo?.content?.rendered || "",
      };
    });

    return experienciaConDatos.filter(Boolean);
    
  } catch (error) {
    console.error("❌ Global error in getExperienciesErasmusInfo:", error.message);
    return [];
  }
}