import { apiURL } from "./config.js";
import { getPageById } from "./getPageById.js";

export const getExperienciaDetalladaInfo = async (slug) => {
  try {    
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=acf,content`);
    if (!responsePage.ok) {
      throw new Error("Error al obtener la página");
    }
    const [pageData] = await responsePage.json();

    const pageId = pageData.acf.experiencia_boton_link ? await getPageById(pageData.acf.experiencia_boton_link) : null;

        return {
          content: pageData.content.rendered || "",
          buttonText: pageData.acf.experiencia_boton_texto || "Más información",
          buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
        };
  } catch (error) {
    console.error("Error obteniendo experiencies:", error);
    return [];
  }
};
