import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { getPageById } from "./getPageById.js";

export const getSlidesInfo = async (lang) => {
  try {
    const response = await fetch(`${apiURL}/slides?order=asc&_fields=acf,slug`);
    if (!response.ok) {
      throw new Error("Error al obtener los slides");
    }
    const data = await response.json();

    // Filtrar los slides según el idioma (usando el slug)
    const slidesFiltrados = data.filter(slide => slide.slug.includes(`-${lang}`));

    // Procesar los slides en paralelo
    const slidesConDatos = await Promise.all(
      slidesFiltrados.map(async (slide) => {
        const { acf } = slide;

        // Validar que `acf` exista antes de acceder a sus propiedades
        if (!acf) {
          console.warn(`Slide sin datos ACF: ${slide.slug}`);
          return null;
        }

        // Obtener información de la imagen si está disponible
        const imageData = acf.slide_imagen ? await getImageInfo(acf.slide_imagen) : null;

        // Obtener información de la página asociada al botón
        const pageData = acf.slide_boton_link ? await getPageById(acf.slide_boton_link) : null;

        // Retornar el slide procesado
        return {
          title: acf.slide_titulo || "Sin título",
          subtitle: acf.slide_subtitulo || "",
          text: acf.slide_texto || "",
          buttonText: acf.slide_boton_texto || "Más información",
          buttonUrl: pageData ? `/${pageData.lang}/${pageData.baseSlug}` : "#",
          imageUrl: imageData?.source_url || "",
          imageAlt: imageData?.alt_text || "Slide image",
        };
      })
    );

    // Filtrar slides nulos (en caso de errores)
    return slidesConDatos.filter(slide => slide !== null);
  } catch (error) {
    console.error("Error obteniendo slides:", error);
    return [];
  }
};
