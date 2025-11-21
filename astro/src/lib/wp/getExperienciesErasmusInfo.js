import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { extractLang } from "./extractLang.js"; // Assuming this is needed for filtering by language

export async function getExperienciesErasmusInfo(lang) {
  try {
    const response = await fetch(`${apiURL}/experiencies_erasmus?order=asc&_fields=acf,slug`);
    
    if (!response.ok) {
      console.error(`❌ Error fetching experiencies_erasmus: ${response.status} - ${response.statusText}`);
      return []; // Return empty array on fetch error
    }
    
    const data = await response.json();

    // Ensure data is an array before filtering
    if (!Array.isArray(data)) {
        console.warn(`⚠️ getExperienciesErasmusInfo: Expected an array from API, but received:`, data);
        return [];
    }

    const responsePage = await fetch(`${apiURL}/pages?slug=erasmus-experiencies-${lang}&_fields=content`);
    
    if (!responsePage.ok) {
      console.error(`❌ Error fetching erasmus-experiencies page for lang ${lang}: ${responsePage.status} - ${responsePage.statusText}`);
      return []; // Return empty array on fetch error for the page content
    }
    
    const [pageDataInfo] = await responsePage.json();

    const experienciaFiltrados = data.filter(experiencia => {
        const extracted = extractLang(experiencia.slug);
        return extracted && extracted.lang === lang;
    });
    
    const experienciaConDatos = await Promise.all(
      experienciaFiltrados.map(async (experiencia) => {
        const { acf } = experiencia;
        if (!acf) {
          console.warn(`Experiencia Erasmus sin datos ACF: ${experiencia.slug}`);
          return null;
        }

        const imageData = acf.experiencia_imagen ? await getImageInfo(acf.experiencia_imagen) : null;
        const pageData = acf.experiencia_link ? await getPageById(acf.experiencia_link) : null; // Assuming getPageById exists and works

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
      })
    );
  return experienciaConDatos.filter(Boolean); // Filter out any nulls
  } 
  catch (error) {
    console.error("❌ Global error in getExperienciesErasmusInfo:", error.message);
    return [];
  }
}
