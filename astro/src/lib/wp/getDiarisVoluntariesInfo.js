import { apiURL } from "./config.js";

export const getDiarisVoluntariesInfo = async (lang, slug) => {
  try {    
    // 1. Obtener el contenido de la página principal (el texto de arriba)
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content`);
    const [pageData] = await responsePage.json();

    // 2. Obtener los Años (Taxonomía 'anys')
    const responseAnys = await fetch(`${apiURL}/anys?_fields=id,name,slug`);
    const anys = await responseAnys.json();

    // 3. Obtener todos los Diarios (CPT 'diaris')
    // Usamos _embed para que traiga la imagen destacada
    const responseDiaris = await fetch(`${apiURL}/diaris?_embed&_fields=id,slug,title,anys,_links,_embedded`);
    const diaris = await responseDiaris.json();

    return {
      content: pageData?.content?.rendered || "",
      anys: anys || [],
      diaris: diaris || []
    };
  } catch (error) {
    console.error("Error obteniendo diaris voluntaries:", error);
    return { content: "", anys: [], diaris: [] };
  }
};