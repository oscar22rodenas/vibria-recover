import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";
import { extractLang } from "./extractLang.js";

export async function getExperienciesInfo(lang, slugCompleto) {
    // Fetchear la página base
    const pageRes = await fetch(
        `${apiURL}/pages?slug=${slugCompleto}&_fields=content,acf`
    );
    const [pageData] = await pageRes.json();
    
    if (!pageData) {
        console.error(`❌ Page not found: ${slugCompleto}`);
        return [];
    }
    
    // Obtener todas las experiencias de la categoría
    const categorySlug = pageData.acf.categoria_experiencias || "experiencies";
    const experienciesRes = await fetch(
        `${apiURL}/pages?categories=${categorySlug}&per_page=100&_fields=acf,slug,content`
    );
    const experienciesRaw = await experienciesRes.json();
    
    // ✅ PARALELIZAR: Resolver TODAS las imágenes en paralelo
    const experienciesPromises = experienciesRaw.map(async (exp) => {
        const extracted = extractLang(exp.slug);
        if (!extracted || extracted.lang !== lang) {
            return null;
        }
        
        // Resolver imagen en paralelo
        let imageUrl = "";
        let imageAlt = "";
        
        if (exp.acf.imagen) {
            try {
                const imgData = await getImageInfo(exp.acf.imagen);
                imageUrl = imgData.source_url || "";
                imageAlt = imgData.alt_text || exp.acf.titulo || "";
            } catch (error) {
                console.error(`❌ Error fetching image for ${exp.slug}:`, error.message);
            }
        }
        
        return {
            title: exp.acf.titulo || "",
            text: exp.acf.descripcion || "",
            imageUrl,
            imageAlt,
            link: `/${lang}/experiencies/${extracted.baseSlug}`,
            ubicacion: exp.acf.ubicacion || "",
            fechas: exp.acf.fechas || "",
            dataLimit: exp.acf.data_limit || "",
            pinVoluntariat: exp.acf.pin_voluntariat || "",
            pinPais: exp.acf.pin_pais || "",
            content: pageData.content?.rendered || "" // Content de la página base
        };
    });
    
    const experiencies = (await Promise.all(experienciesPromises)).filter(Boolean);
    
    return experiencies;
}
