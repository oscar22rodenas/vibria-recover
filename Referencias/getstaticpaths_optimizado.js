// ==========================================
// src/pages/[lang]/[slug].astro
// getStaticPaths() OPTIMIZADO COMPLETO
// ==========================================

import { extractLang } from "@wp/extractLang.js";
import { apiURL } from "@wp/config.js";
import { 
    getPostsInfo, 
    getImageInfo, 
    getCategoriesInfo, 
    getRRSSInfo,
    getSlidesInfo,
    getExperienciesInfo,
    getOfertesInfo,
    getExperienciesErasmusInfo,
    getIntercanvisJuvenilInfo
    // Importa todas las funciones de fetch necesarias
} from "@wp/index.js";

export async function getStaticPaths() {
    const languages = ["ca", "es", "en"];
    
    console.log("🚀 Iniciando build optimizado...");
    const startTime = Date.now();
    
    // ============================================
    // PASO 1: FETCHEAR DATOS GLOBALES (1 vez por idioma)
    // ============================================
    console.log("📡 Fetching global data...");
    
    const globalDataPromises = languages.map(async (lang) => {
        // Fetchear ACF de header, footer, categorías y RRSS en paralelo
        const [headerACF, footerACF, categories, rrssRaw] = await Promise.all([
            getPostsInfo("header", lang),
            getPostsInfo("footer", lang),
            getCategoriesInfo(lang),
            getRRSSInfo()
        ]);
        
        // Resolver imagen del header
        const headerImage = headerACF.header_imagen 
            ? await getImageInfo(headerACF.header_imagen)
            : null;
        
        // Resolver imágenes del footer en paralelo
        const footerImageIds = [
            footerACF.ubicacion_imagen,
            footerACF.telefono_imagen,
            footerACF.correo_imagen
        ].filter(Boolean);
        
        const footerImages = await Promise.all(
            footerImageIds.map(id => getImageInfo(id))
        );
        
        // Resolver imágenes de RRSS en paralelo
        const rrssWithImages = await Promise.all(
            rrssRaw.map(async (red) => {
                if (red.imageId) {
                    const img = await getImageInfo(red.imageId);
                    return {
                        link: red.link,
                        imageUrl: img.source_url || "",
                        imageAlt: img.alt_text || red.title || "Red social"
                    };
                }
                return {
                    link: red.link,
                    imageUrl: red.imageUrl || "",
                    imageAlt: red.imageAlt || red.title || "Red social"
                };
            })
        );
        
        return {
            lang,
            header: {
                ...headerACF,
                imageUrl: headerImage?.source_url || "",
                imageAlt: headerImage?.alt_text || "Logo Vibria"
            },
            footer: {
                ...footerACF,
                ubicacionImage: { 
                    url: footerImages[0]?.source_url || "", 
                    alt: footerImages[0]?.alt_text || "Ubicación" 
                },
                telefonoImage: { 
                    url: footerImages[1]?.source_url || "", 
                    alt: footerImages[1]?.alt_text || "Teléfono" 
                },
                correoImage: { 
                    url: footerImages[2]?.source_url || "", 
                    alt: footerImages[2]?.alt_text || "Correo" 
                }
            },
            categories,
            rrss: rrssWithImages
        };
    });
    
    const globalDataArray = await Promise.all(globalDataPromises);
    
    // Convertir array a objeto indexado por idioma
    const globalData = Object.fromEntries(
        globalDataArray.map(data => [data.lang, data])
    );
    
    console.log(`✅ Global data fetched in ${Date.now() - startTime}ms`);
    
    // ============================================
    // PASO 2: FETCHEAR TODAS LAS PÁGINAS
    // ============================================
    console.log("📡 Fetching all pages...");
    
    const pagesRes = await fetch(
        `${apiURL}/pages?per_page=100&_fields=slug,acf,content`
    );
    const allPages = await pagesRes.json();
    
    console.log(`✅ ${allPages.length} pages fetched`);
    
    // ============================================
    // PASO 3: RESOLVER DATOS ESPECÍFICOS POR TIPO DE PÁGINA
    // ============================================
    console.log("📡 Resolving page-specific data in parallel...");
    
    const pathsPromises = allPages.map(async (page) => {
        const extracted = extractLang(page.slug);
        if (!extracted || !languages.includes(extracted.lang)) {
            return null;
        }
        
        const { lang, baseSlug } = extracted;
        const slugCompleto = page.slug;
        
        // Páginas con categoría son detalladas (ofertes/*, experiencies/*)
        if (page.acf.categoria) {
            return null; // Las manejaremos en [subslug].astro
        }
        
        // Determinar tipo de página y resolver sus datos específicos
        let typeSpecificData = null;
        
        try {
            switch (baseSlug) {
                case 'home': {
                    // Resolver slides con imágenes
                    const slidesRaw = await getSlidesInfo(lang);
                    typeSpecificData = { slides: slidesRaw };
                    break;
                }
                
                case 'experiencies': {
                    // Resolver experiencias con imágenes
                    const experiencias = await getExperienciesInfo(lang, slugCompleto);
                    typeSpecificData = { experiencias };
                    break;
                }
                
                case 'ofertes': {
                    // Resolver ofertas con imágenes
                    const ofertas = await getOfertesInfo(lang);
                    typeSpecificData = { ofertas };
                    break;
                }
                
                case 'erasmus-experiencies': {
                    // Resolver experiencias Erasmus
                    const experiencias = await getExperienciesErasmusInfo(lang);
                    typeSpecificData = { experiencias };
                    break;
                }
                
                case 'intercanvis-juvenil': {
                    // Resolver intercambios juveniles
                    const experiencias = await getIntercanvisJuvenilInfo(lang);
                    typeSpecificData = { experiencias };
                    break;
                }
                
                case 'qui-som': {
                    // QuiSom tiene estructura especial con equipo
                    const quiSomData = await getQuiSomInfo(lang, slugCompleto);
                    typeSpecificData = { 
                        pageContent: quiSomData[0]?.pageContent || '',
                        teamMembers: quiSomData.map(item => item.content).filter(Boolean)
                    };
                    break;
                }
                
                // Páginas simples: solo necesitan su content
                // No necesitan typeSpecificData adicional
                default:
                    break;
            }
        } catch (error) {
            console.error(`❌ Error resolving data for ${baseSlug}:`, error.message);
        }
        
        return {
            params: { lang, slug: baseSlug },
            props: {
                globalData: globalData[lang],
                pageData: {
                    acf: page.acf,
                    content: page.content?.rendered || "",
                    slug: baseSlug
                },
                typeSpecificData
            }
        };
    });
    
    const paths = (await Promise.all(pathsPromises)).filter(Boolean);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Build completed: ${paths.length} pages in ${duration}s`);
    console.log(`⚡ Average: ${(duration / paths.length).toFixed(2)}s per page`);
    
    return paths;
}


// ==========================================
// src/pages/[lang]/[slug]/[subslug].astro
// getStaticPaths() PARA PÁGINAS DETALLADAS
// ==========================================

import { extractLang } from "@wp/extractLang.js";
import { apiURL } from "@wp/config.js";
import { 
    getPostsInfo, 
    getImageInfo, 
    getCategoriesInfo, 
    getRRSSInfo,
    getOfertaDetalladaInfo,
    getExperienciaDetalladaInfo
} from "@wp/index.js";

export async function getStaticPaths() {
    const languages = ["ca", "es", "en"];
    
    console.log("🚀 Building detailed pages...");
    const startTime = Date.now();
    
    // ============================================
    // PASO 1: FETCHEAR DATOS GLOBALES (igual que antes)
    // ============================================
    const globalDataPromises = languages.map(async (lang) => {
        const [headerACF, footerACF, categories, rrssRaw] = await Promise.all([
            getPostsInfo("header", lang),
            getPostsInfo("footer", lang),
            getCategoriesInfo(lang),
            getRRSSInfo()
        ]);
        
        const headerImage = headerACF.header_imagen 
            ? await getImageInfo(headerACF.header_imagen)
            : null;
        
        const footerImageIds = [
            footerACF.ubicacion_imagen,
            footerACF.telefono_imagen,
            footerACF.correo_imagen
        ].filter(Boolean);
        
        const footerImages = await Promise.all(
            footerImageIds.map(id => getImageInfo(id))
        );
        
        const rrssWithImages = await Promise.all(
            rrssRaw.map(async (red) => {
                if (red.imageId) {
                    const img = await getImageInfo(red.imageId);
                    return {
                        link: red.link,
                        imageUrl: img.source_url || "",
                        imageAlt: img.alt_text || "Red social"
                    };
                }
                return {
                    link: red.link,
                    imageUrl: red.imageUrl || "",
                    imageAlt: red.imageAlt || "Red social"
                };
            })
        );
        
        return {
            lang,
            header: {
                ...headerACF,
                imageUrl: headerImage?.source_url || "",
                imageAlt: headerImage?.alt_text || "Logo Vibria"
            },
            footer: {
                ...footerACF,
                ubicacionImage: { 
                    url: footerImages[0]?.source_url || "", 
                    alt: footerImages[0]?.alt_text || "Ubicación" 
                },
                telefonoImage: { 
                    url: footerImages[1]?.source_url || "", 
                    alt: footerImages[1]?.alt_text || "Teléfono" 
                },
                correoImage: { 
                    url: footerImages[2]?.source_url || "", 
                    alt: footerImages[2]?.alt_text || "Correo" 
                }
            },
            categories,
            rrss: rrssWithImages
        };
    });
    
    const globalDataArray = await Promise.all(globalDataPromises);
    const globalData = Object.fromEntries(
        globalDataArray.map(data => [data.lang, data])
    );
    
    // ============================================
    // PASO 2: FETCHEAR PÁGINAS CON CATEGORÍA
    // ============================================
    const pagesRes = await fetch(
        `${apiURL}/pages?per_page=100&_fields=slug,acf,content`
    );
    const allPages = await pagesRes.json();
    
    // Filtrar solo páginas detalladas (con categoría)
    const detailedPages = allPages.filter(page => page.acf.categoria);
    
    console.log(`📄 Found ${detailedPages.length} detailed pages`);
    
    // ============================================
    // PASO 3: RESOLVER DATOS DETALLADOS
    // ============================================
    const pathsPromises = detailedPages.map(async (page) => {
        const extracted = extractLang(page.slug);
        if (!extracted || !languages.includes(extracted.lang)) {
            return null;
        }
        
        const { lang, baseSlug } = extracted;
        const categoria = page.acf.categoria;
        const slugCompleto = page.slug;
        
        let detailedData = null;
        
        try {
            if (categoria === 'ofertes') {
                detailedData = await getOfertaDetalladaInfo(slugCompleto);
            } else if (categoria === 'experiencies') {
                detailedData = await getExperienciaDetalladaInfo(slugCompleto);
            }
        } catch (error) {
            console.error(`❌ Error fetching ${categoria}/${baseSlug}:`, error.message);
        }
        
        return {
            params: { 
                lang, 
                slug: categoria, 
                subslug: baseSlug 
            },
            props: {
                globalData: globalData[lang],
                pageData: {
                    acf: page.acf,
                    content: page.content?.rendered || ""
                },
                detailedData
            }
        };
    });
    
    const paths = (await Promise.all(pathsPromises)).filter(Boolean);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Detailed pages built: ${paths.length} in ${duration}s`);
    
    return paths;
}


// ==========================================
// Layout.astro OPTIMIZADO
// ==========================================

---
// src/layouts/Layout.astro
import "@styles/global.css";
import Header from "@components/Header.astro";
import Footer from "@components/Footer.astro";

const { lang } = Astro.params;
const { globalData } = Astro.props;

// Determinar categoría actual para el Header
const { slug } = Astro.params;
const lastSegment = slug?.toLowerCase() ?? "";

let currentCategory = null;
for (const parent of globalData.categories.parent) {
  const baseSlug = parent.slug.toLowerCase();
  if (lastSegment === baseSlug) {
    currentCategory = parent.title;
    break;
  }
  
  const subcategories = globalData.categories.children[parent.id] || [];
  for (const sub of subcategories) {
    if (sub.slug.toLowerCase() === lastSegment) {
      currentCategory = parent.title;
      break;
    }
  }
  if (currentCategory) break;
}
---

<!doctype html>
<html lang={lang || "ca"}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>La Víbria Intercultural</title>
    <meta name="description" content="Projectes de voluntariat europeu i mobilitat internacional per a joves." />
    <meta name="keywords" content="voluntariat, europeu, joves, mobilitat internacional, ESC, solidaritat" />
    <meta name="author" content="La Víbria Intercultural" />
    <meta name="robots" content="index, follow" />
    
    <meta property="og:type" content="website" />
    <meta property="og:title" content="La Víbria Intercultural" />
    <meta property="og:description" content="Descobreix projectes de voluntariat europeu i oportunitats de mobilitat internacional per a joves." />
    <meta property="og:url" content="https://vibria.org" />
    <meta property="og:image" content="https://vibria.org/images/og-image.jpg" />
    <meta property="og:site_name" content="La Víbria Intercultural" />
    <meta property="og:locale" content="ca_CA" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="La Víbria Intercultural" />
    <meta name="twitter:description" content="Voluntariat europeu i oportunitats internacionals per a joves." />
    <meta name="twitter:image" content="https://vibria.org/images/og-image.jpg" />
    
    <link rel="canonical" href="https://vibria.org" />
  </head>
  <body class="prose">
    <div class="layout-container">
      <Header 
        headerData={globalData.header}
        categories={globalData.categories}
        rrssData={globalData.rrss}
        currentCategory={currentCategory}
      />
      <main>
        <slot />
      </main>
      <Footer 
        footerData={globalData.footer}
        rrssData={globalData.rrss}
      />
    </div>
  </body>
</html>

<style>
  html, body {
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    font-family: "Poppins", sans-serif;
  }
  .layout-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  main {
    flex-grow: 1;
  }
</style>