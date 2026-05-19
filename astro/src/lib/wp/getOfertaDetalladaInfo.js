import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { getPageById } from "./getPageById.js";

export async function getOfertaDetalladaInfo(slug) {
  try {
    const responseOferta = await fetch(`${apiURL}/ofertes?slug=${slug}&_fields=acf`);
    if (!responseOferta.ok) {
      throw new Error("Error al obtener los ofertes");
    }
    const [ofertaData] = await responseOferta.json();
    
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=acf,content`);
    if (!responsePage.ok) {
      throw new Error("Error al obtener la página");
    }
    const [pageData] = await responsePage.json();

    const imageData = ofertaData.acf.oferta_imagen ? await getImageInfo(ofertaData.acf.oferta_imagen) : null;

    const pageId = pageData.acf.oferta_boton_link ? await getPageById(pageData.acf.oferta_boton_link) : null;

        return {
          title: ofertaData.acf.oferta_titulo || "",
          subtitle: ofertaData.acf.oferta_subtitulo || "",
          ubicacion: ofertaData.acf.oferta_ubicacion || "",
          fechas: ofertaData.acf.oferta_fechas || "",
          imageUrl: imageData?.source_url || "",
          imageAlt: imageData?.alt_text || "oferta image",
          content: pageData.content.rendered || "",
          buttonText: pageData.acf.oferta_boton_texto || "Más información",
          buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
        };
  } catch (error) {
    console.error("Error obteniendo ofertes:", error);
    return null;
  }
}
