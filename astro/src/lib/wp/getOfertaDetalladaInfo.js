import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getOfertaDetalladaInfo(slugCompleto) {
    // Fetchear la oferta específica
    const res = await fetch(
        `${apiURL}/pages?slug=${slugCompleto}&_fields=acf,content`
    );
    const [ofertaData] = await res.json();
    
    if (!ofertaData) {
        console.error(`❌ Oferta not found: ${slugCompleto}`);
        return null;
    }
    
    // Resolver imagen
    let imageUrl = "";
    let imageAlt = "";
    
    if (ofertaData.acf.imagen) {
        try {
            const imgData = await getImageInfo(ofertaData.acf.imagen);
            imageUrl = imgData.source_url || "";
            imageAlt = imgData.alt_text || ofertaData.acf.titulo || "";
        } catch (error) {
            console.error(`❌ Error fetching image:`, error.message);
        }
    }
    
    return {
        title: ofertaData.acf.titulo || "",
        imageUrl,
        imageAlt,
        ubicacion: ofertaData.acf.ubicacion || "",
        fechas: ofertaData.acf.fechas || "",
        content: ofertaData.content?.rendered || "",
        buttonText: ofertaData.acf.boton_texto || "Aplicar",
        buttonUrl: ofertaData.acf.boton_url || "#"
    };
}
