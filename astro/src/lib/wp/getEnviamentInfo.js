import { apiURL } from "./config.js";
import { getPagesByIds } from "./getPageById.js";

export const getEnviamentInfo = async (lang, slug) => {
  try {    
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
    if (!responsePage.ok) {
      throw new Error("Error al obtener la página");
    }
    const [pageData] = await responsePage.json();
    
    const buttonPageId = pageData?.acf?.enviament_boton_link;
    let buttonData = null;
    if (buttonPageId) {
      buttonData = (await getPagesByIds([buttonPageId]))[0];
    }

    return [{
      content: pageData.content.rendered || "",
      titolPrincipal: pageData.acf?.enviament_titulo_principal || "",
      titol1: pageData.acf?.enviament_titulo_1 || "",
      titol2: pageData.acf?.enviament_titulo_2 || "",
      titol3: pageData.acf?.enviament_titulo_3 || "",
      buttonText: pageData.acf?.enviament_boton_texto || "",
      buttonUrl: buttonData ? `/${buttonData.lang}${buttonData.categoriaSlug}/${buttonData.baseSlug}` : "#"
    }];
  } catch (error) {
    console.error("Error obteniendo enviament:", error);
    return [];
  }
};
