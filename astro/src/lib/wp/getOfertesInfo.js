import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { extractLang } from "./extractLang.js";

export async function getOfertesInfo(lang) {
    // Fetchear todas las ofertas
    const res = await fetch(
        `${apiURL}/pages?categories=ofertes&per_page=100&_fields=acf,slug,content`
    );
    const ofertesRaw = await res.json();
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes en paralelo
    const ofertesPromises = ofertesRaw.map(async (oferta) => {
        const extracted = extractLang(oferta.slug);
        if (!extracted || extracted.lang !== lang) {
            return null;
        }
        
        // Resolver imagen
        let imageUrl = "";
        let imageAlt = "";
        
        if (oferta.acf.imagen) {
            try {
                const imgData = await getImageInfo(oferta.acf.imagen);
                imageUrl = imgData.source_url || "";
                imageAlt = imgData.alt_text || oferta.acf.titulo || "";
            } catch (error) {
                console.error(`❌ Error fetching image for ${oferta.slug}:`, error.message);
            }
        }
        
        return {
            title: oferta.acf.titulo || "",
            text: oferta.acf.descripcion_corta || "",
            imageUrl,
            imageAlt,
            link: `/${lang}/ofertes/${extracted.baseSlug}`,
            ubicacion: oferta.acf.ubicacion || "",
            fechas: oferta.acf.fechas || "",
            dataLimit: oferta.acf.data_limit || "",
            content: oferta.content?.rendered || ""
        };
    });
    
    const ofertes = (await Promise.all(ofertesPromises)).filter(Boolean);
    
    return ofertes;
}
