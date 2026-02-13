import { apiURL } from "./config.js";
import { getImageInfo } from "./getImageInfo.js";

export async function getRRSSInfo() {
    try {
        // Fetchear custom post type de RRSS
        const res = await fetch(
            `${apiURL}/redes_sociales?order=asc&per_page=500&_fields=acf`
        );
        
        if (!res.ok) {
            console.error(`❌ Error fetching RRSS: ${res.status} - ${res.statusText}`);
            return []; // Return empty array on fetch error
        }

        const rrssRaw = await res.json();
        
        // Ensure rrssRaw is an array before calling .map()
        if (!Array.isArray(rrssRaw)) {
            console.warn(`⚠️ getRRSSInfo: Expected an array from API, but received:`, rrssRaw);
            return [];
        }
        
        // ✅ PARALELIZAR: Resolver TODAS las imágenes de RRSS en paralelo
        const rrssPromises = rrssRaw.map(async (red) => {
            let imageUrl = "";
            let imageAlt = "";
            
            if (red.acf.rrss_imagen) {
                try {
                    const imgData = await getImageInfo(red.acf.rrss_imagen);
                    imageUrl = imgData.source_url || "";
                    imageAlt = imgData.alt_text || red.acf.nombre || "Red social";
                } catch (error) {
                    console.error(`❌ Error fetching RRSS icon for ${red.acf.nombre}:`, error.message);
                }
            }
            
            return {
                link: red.acf.rrss_link || "#",
                imageUrl,
                imageAlt
            };
        });
        
        const rrss = await Promise.all(rrssPromises);
        
        return rrss;
    } catch (error) {
        console.error(`❌ Global error in getRRSSInfo:`, error.message);
        return [];
    }
}
