import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { getPageById } from "./getPageById.js";

export async function getVolunteerDetalladaInfo(slug) {
  try {
    const responseOferta = await fetch(`${apiURL}/volunteers?slug=${slug}&_fields=acf`);
    if (!responseOferta.ok) {
      throw new Error("Error al obtener los voluntarios");
    }
    const [volunteerData] = await responseOferta.json();
    
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=acf,content`);
    if (!responsePage.ok) {
      throw new Error("Error al obtener la página");
    }
    const [pageData] = await responsePage.json();

    const imageData = volunteerData.acf.volunteer_imagen ? await getImageInfo(volunteerData.acf.volunteer_imagen) : null;

    const pageId = pageData.acf.volunteer_boton_link ? await getPageById(pageData.acf.volunteer_boton_link) : null;

        return {
          title: volunteerData.acf.volunteer_titulo || "",
          ubicacion: volunteerData.acf.volunteer_ubicacion || "",
          fechas: volunteerData.acf.volunteer_fechas || "",
          imageUrl: imageData?.source_url || "",
          imageAlt: imageData?.alt_text || "volunteer image",
          content: pageData.content.rendered || "",
          buttonText: pageData.acf.volunteer_boton_texto || "Más información",
          buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
        };
  } catch (error) {
    console.error("Error obteniendo voluntarios:", error);
    return null;
  }
}
