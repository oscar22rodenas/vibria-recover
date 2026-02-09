import { apiURL } from "./config.js";

export async function getDiariDetallatInfo(slug) {
  try {
    const response = await fetch(`${apiURL}/diaris?slug=${slug}&_embed&_fields=id,slug,title,content,_embedded`);
    
    if (!response.ok) throw new Error("Error en la petición a WordPress");
    
    const data = await response.json();
    const diariData = data[0];

    if (!diariData) return null;

    return {
      title: diariData.title.rendered,
      content: diariData.content.rendered,
      imageUrl: diariData._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      imageAlt: diariData._embedded?.['wp:featuredmedia']?.[0]?.alt_text || diariData.title.rendered
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalle del diario "${slug}":`, error);
    return null;
  }
}