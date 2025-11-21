import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getSlidesInfo(lang) {
    // Fetchear ACF de la página de slides
    const res = await fetch(
        `${apiURL}/pages?slug=home-${lang}&_fields=acf`
    );
    const [homeData] = await res.json();
    
    if (!homeData || !homeData.acf.slides) {
        console.error(`❌ Slides not found for lang: ${lang}`);
        return [];
    }
    
    const slidesRaw = homeData.acf.slides;
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes de slides en paralelo
    const slidesPromises = slidesRaw.map(async (slide) => {
        let imageUrl = "";
        
        if (slide.imagen) {
            try {
                const imgData = await getImageInfo(slide.imagen);
                imageUrl = imgData.source_url || "";
            } catch (error) {
                console.error(`❌ Error fetching slide image:`, error.message);
            }
        }
        
        return {
            title: slide.titulo || "",
            subtitle: slide.subtitulo || "",
            text: slide.texto || "",
            imageUrl,
            buttonText: slide.boton_texto || "",
            buttonUrl: slide.boton_url || "#"
        };
    });
    
    const slides = await Promise.all(slidesPromises);
    
    return slides;
}