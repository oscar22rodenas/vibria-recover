import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { getPageById } from "./getPageById.js";
import { extractLang } from "./extractLang.js";

export async function getOfertesInfo(lang) {
  try {
    const response = await fetch(`${apiURL}/ofertes?order=asc&_fields=acf,slug`);
    if (!response.ok) {
      throw new Error("Error al obtener los ofertes");
    }
    const data = await response.json();
    const responsePage = await fetch(`${apiURL}/pages?slug=ofertes-${lang}&_fields=content`);
    if (!responsePage.ok) {
      throw new Error("Error al obtener la página");
    }
    const [pageDataInfo] = await responsePage.json();

    // Filtrar los ofertes según el idioma (usando el slug)
    const ofertesFiltrados = data.filter(oferta => {
        const extracted = extractLang(oferta.slug);
        return extracted && extracted.lang === lang;
    });
    
    // Obtener las imágenes de cada oferta en paralelo
    const ofertesConDatos = await Promise.all(
      ofertesFiltrados.map(async (oferta) => {
        const { acf } = oferta;
        // Validar que `acf` exista antes de acceder a sus propiedades
        if (!acf) {
          console.warn(`Oferta sin datos ACF: ${oferta.slug}`);
          return null;
        }

        const [imageData, pageData] = await Promise.all([
          acf.oferta_imagen ? getImageInfo(acf.oferta_imagen) : null,
          acf.oferta_link ? getPageById(acf.oferta_link) : null
        ]);

        return {
          title: acf.oferta_titulo,
          text: acf.oferta_texto,
          ubicacion: acf.oferta_ubicacion,
          fechas: acf.oferta_fechas,
          dataLimit: acf.oferta_data_limit,
          link: pageData ? `/${pageData.lang}${pageData.categoriaSlug}/${pageData.baseSlug}` : "#",
          imageUrl: imageData?.source_url || "",
          imageAlt: imageData?.alt_text || "oferta image",
          content: pageDataInfo.content.rendered || "",
        };
      })
    );    

    return ofertesConDatos.filter(Boolean);
  } catch (error) {
    console.error("Error obteniendo ofertes:", error);
    return [];
  }
}
