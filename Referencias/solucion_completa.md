# ✅ SOLUCIÓN COMPLETA Y DEFINITIVA

## 🎯 3. CAMBIOS EN LA ARQUITECTURA DE DATOS

### **Principio fundamental:**
> **TODOS los fetchs deben ejecutarse en `getStaticPaths()` o `get()`, NUNCA en componentes `.astro`**

---

### **A) Por qué mover TODAS las llamadas a WP a getStaticPaths()**

**Razón 1: Ejecución única vs ejecución por página**
```javascript
// ❌ ANTES: Se ejecuta 100 veces (1 por página)
// CategoryNav.astro
const categoriesMap = await getCategoriesInfo(lang);

// ✅ DESPUÉS: Se ejecuta 1 vez total
// getStaticPaths()
const categoriesMap = await getCategoriesInfo(lang);
// → Se pasa como prop a TODAS las páginas
```

**Razón 2: Paralelización total**
```javascript
// ✅ Todos los datos se fetchean en paralelo
const [header, footer, categories, rrss, slides] = await Promise.all([
    getPostsInfo("header", lang),
    getPostsInfo("footer", lang),
    getCategoriesInfo(lang),
    getRRSSInfo(),
    getSlidesInfo(lang)
]);
```

**Razón 3: Sin waterfall**
- En `getStaticPaths()`: fetchs ejecutados de forma masiva y paralela
- En componentes: solo rendering, sin I/O

---

### **B) Por qué los componentes .astro deben quedar sin fetchs**

Los componentes en Astro SSG son **templates puros**, no deben hacer I/O:

```astro
---
// ❌ ANTES: Componente con fetch
const acf = await getPostsInfo("footer", lang);
---

---
// ✅ DESPUÉS: Componente puro
const { footerData } = Astro.props;
---
<footer>
    <p>{footerData.ubicacion_texto}</p>
</footer>
```

**Ventajas:**
1. **Rendering instantáneo**: No espera red
2. **Predecible**: Mismo input → mismo output
3. **Cacheable**: Astro puede optimizar mejor
4. **Testable**: Props conocidas, sin side effects

---

### **C) Cómo pasar props con todo ya resuelto**

**Estructura de datos completa:**

```typescript
interface PageProps {
    // Datos globales (compartidos por todas las páginas)
    globalData: {
        header: HeaderData;
        footer: FooterData;
        categories: CategoriesMap;
        rrss: RRSSData[];
    };
    
    // Datos específicos de la página
    pageData: {
        acf: any;
        content: string;
        images: ResolvedImage[];
    };
    
    // Datos específicos del tipo de página
    typeSpecificData?: {
        // Para Experiencies
        experiencias?: ExperienciaData[];
        
        // Para Ofertes
        ofertas?: OfertaData[];
        
        // Para Home
        slides?: SlideData[];
    };
}
```

**Ejemplo concreto:**

```javascript
// getStaticPaths()
return {
    params: { lang: 'ca', slug: 'experiencies' },
    props: {
        globalData: {
            header: { /* ACF + imagen resuelta */ },
            footer: { /* ACF + 3 imágenes resueltas */ },
            categories: { /* árbol completo */ },
            rrss: [{ imageUrl, imageAlt, link }, ...]
        },
        pageData: {
            acf: { /* ACF de la página */ },
            content: "<div>...</div>",
            images: [] // Si la página tiene imágenes propias
        },
        typeSpecificData: {
            experiencias: [
                {
                    title: "...",
                    imageUrl: "https://...", // YA resuelto
                    imageAlt: "...",
                    link: "/ca/experiencies/experiencia-1",
                    ubicacion: "...",
                    fechas: "...",
                    ...
                }
            ]
        }
    }
};
```

---

## 🔄 4. CÓMO PARALELIZAR CORRECTAMENTE

### **A) Promise.all para datos globales**

```javascript
export async function getStaticPaths() {
    const languages = ["ca", "es", "en"];
    
    // ✅ Paso 1: Fetchear datos globales EN PARALELO (1 vez total)
    const globalDataPromises = languages.map(async (lang) => {
        const [headerACF, footerACF, categories, rrss] = await Promise.all([
            getPostsInfo("header", lang),
            getPostsInfo("footer", lang),
            getCategoriesInfo(lang),
            getRRSSInfo() // Sin lang si es global
        ]);
        
        // Resolver imágenes del header en paralelo
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
            rrss.map(async (red) => ({
                ...red,
                imageUrl: red.imageId ? (await getImageInfo(red.imageId)).source_url : "",
                imageAlt: red.imageId ? (await getImageInfo(red.imageId)).alt_text : ""
            }))
        );
        
        return {
            lang,
            header: {
                ...headerACF,
                imageUrl: headerImage?.source_url || "",
                imageAlt: headerImage?.alt_text || ""
            },
            footer: {
                ...footerACF,
                ubicacionImage: { url: footerImages[0]?.source_url, alt: footerImages[0]?.alt_text },
                telefonoImage: { url: footerImages[1]?.source_url, alt: footerImages[1]?.alt_text },
                correoImage: { url: footerImages[2]?.source_url, alt: footerImages[2]?.alt_text }
            },
            categories,
            rrss: rrssWithImages
        };
    });
    
    const globalDataByLang = await Promise.all(globalDataPromises);
    
    // Convertir array a objeto indexado por lang
    const globalData = Object.fromEntries(
        globalDataByLang.map(data => [data.lang, data])
    );
    
    // ✅ Paso 2: Fetchear todas las páginas
    const pagesRes = await fetch(`${apiURL}/pages?per_page=100&_fields=slug,acf,content`);
    const pages = await pagesRes.json();
    
    // ✅ Paso 3: Resolver datos específicos por página EN PARALELO
    const pathsPromises = pages.map(async (page) => {
        const extracted = extractLang(page.slug);
        if (!extracted) return null;
        
        const { lang, baseSlug } = extracted;
        
        // Aquí resuelves datos específicos según el tipo de página
        let typeSpecificData = null;
        
        if (baseSlug === 'experiencies' && !page.acf.categoria) {
            // Fetchear experiencias con imágenes resueltas
            typeSpecificData = await getExperienciesInfo(lang, page.slug);
        } else if (baseSlug === 'ofertes' && !page.acf.categoria) {
            typeSpecificData = await getOfertesInfo(lang);
        } else if (baseSlug === 'home') {
            // Resolver slides con imágenes
            const slidesData = await getSlidesInfo(lang);
            typeSpecificData = { slides: slidesData };
        }
        
        return {
            params: { lang, slug: baseSlug },
            props: {
                globalData: globalData[lang],
                pageData: {
                    acf: page.acf,
                    content: page.content?.rendered || ""
                },
                typeSpecificData
            }
        };
    });
    
    const paths = (await Promise.all(pathsPromises)).filter(Boolean);
    
    return paths;
}
```

### **B) Uso de p-limit para controlar concurrencia**

Si WordPress no aguanta muchos requests paralelos, usa `p-limit`:

```javascript
import pLimit from 'p-limit';

const limit = pLimit(10); // Máximo 10 requests paralelos

export async function getStaticPaths() {
    // ...
    
    // Envuelve las operaciones costosas con limit
    const pathsPromises = pages.map(page => 
        limit(async () => {
            // Tus fetchs aquí
            const data = await getExperienciesInfo(lang, slug);
            return { params, props };
        })
    );
    
    const paths = await Promise.all(pathsPromises);
    return paths;
}
```

---

## 🏗️ 5. REESTRUCTURAR PÁGINAS

### **Patrón General para TODAS las páginas:**

```astro
---
// src/pages/[lang]/[slug].astro

export async function getStaticPaths() {
    // 1. Fetchear datos globales (1 vez)
    const globalData = await fetchGlobalData();
    
    // 2. Fetchear todas las páginas
    const pages = await fetchAllPages();
    
    // 3. Resolver datos específicos EN PARALELO
    const paths = await Promise.all(
        pages.map(async (page) => {
            const typeSpecific = await resolveTypeSpecificData(page);
            
            return {
                params: { lang, slug },
                props: {
                    globalData: globalData[lang],
                    pageData: page,
                    typeSpecificData: typeSpecific
                }
            };
        })
    );
    
    return paths;
}

// 4. Recibir props y pasarlas a componentes
const { globalData, pageData, typeSpecificData } = Astro.props;
---

<Layout globalData={globalData}>
    <PageComponent 
        pageData={pageData} 
        typeSpecificData={typeSpecificData} 
        globalData={globalData}
    />
</Layout>
```

---

### **Ejemplo 1: Home.astro**

```astro
---
// src/components/pages/Home.astro
import Slide from "@components/Slide.astro";
import { Picture } from "astro:assets";

// ✅ Ya no hace fetchs, solo recibe props
const { pageData, typeSpecificData, globalData } = Astro.props;
const { acf } = pageData;
const { slides } = typeSpecificData;

// Imagen de difusión ya resuelta en getStaticPaths
const imageUrl = acf.difusion_imagen_url || "";
const imageAlt = acf.difusion_imagen_alt || "Canal de difusión";
---

<Slide slides={slides} />

<div class="flex flex-col md:flex-row">
    <div class="flex flex-col items-center justify-center bg-secondary px-20 py-8 text-center gap-4 md:w-1/2">
        <div class="border border-white p-1">
            <p class="font-700 p md:text-[17px]">{acf.difusion_descripcion}</p>
        </div>
        
        {imageUrl && (
            <a href={acf.difusion_link}>
                <Picture
                    formats={["webp", "avif", "jpeg"]}
                    src={imageUrl}
                    alt={imageAlt}
                    width="60"
                    height="60"
                />
            </a>
        )}
    </div>
    
    <div class="flex flex-col items-center gap-4 py-4 bg-gray-100 w-full md:w-1/2">
        <h3 class="text-h3 text-700 text-primary text-center font-700">
            {acf.contacto_titulo}
        </h3>
        
        <form id="form-contacto" class="flex flex-col items-start gap-3 md:w-4/5">
            <!-- Formulario igual -->
        </form>
    </div>
</div>
```

---

### **Ejemplo 2: Experiencies.astro**

```astro
---
// src/components/pages/Experiencies.astro
import { Picture } from "astro:assets";
import CategoryNav from "@components/CategoryNav.astro";

// ✅ Recibe datos ya resueltos
const { pageData, typeSpecificData, globalData } = Astro.props;
const { experiencias } = typeSpecificData;
const { categories } = globalData;

const { lang, slug } = Astro.params;
const pin = Astro.url.searchParams.get("pin");

// Filtrar experiencias según pin (lógica de cliente)
const filteredExperiencies = pin
    ? experiencias.filter(e => e.pinVoluntariat === pin || e.pinPais === pin)
    : experiencias;
---

<CategoryNav lang={lang} slug={slug} categories={categories} />

<div class="experiencies-content" set:html={filteredExperiencies[0]?.content}></div>

<div class="p-6 grid grid-cols-1 gap-5 md:grid-cols-2">
    {filteredExperiencies.map((experiencia) => (
        <div class="flex flex-col justify-center items-center gap-2 pb-2 mb-5 bg-gray-100">
            <a href={experiencia.link} class="flex flex-col items-center pt-1 px-4">
                <h4 class="text-h4 font-700 text-red text-center px-2">
                    {experiencia.title}
                </h4>
                
                <!-- ✅ Imagen ya resuelta -->
                <Picture
                    formats={["webp", "avif", "jpeg"]}
                    src={experiencia.imageUrl}
                    alt={experiencia.imageAlt}
                    width="326"
                    height="126"
                />
                
                <p class="text-sm text-black font-normal text-center">
                    {experiencia.text}
                </p>
            </a>
            
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 px-4">
                <a href={`/${lang}/${slug}?pin=${experiencia.pinVoluntariat}`} 
                   class="bg-red text-sm text-white font-700 py-0.5 px-2 rounded-3xl">
                    {experiencia.pinVoluntariat}
                </a>
                <a href={`/${lang}/${slug}?pin=${experiencia.pinPais}`}
                   class="bg-red text-sm text-white font-700 py-0.5 px-2 rounded-3xl">
                    {experiencia.pinPais}
                </a>
            </div>
        </div>
    ))}
</div>
```

---

### **Ejemplo 3: Ofertes.astro**

```astro
---
// src/components/pages/Ofertes.astro
import { Picture } from "astro:assets";
import CategoryNav from "@components/CategoryNav.astro";

const { typeSpecificData, globalData } = Astro.props;
const { ofertas } = typeSpecificData;
const { categories } = globalData;
const { lang, slug } = Astro.params;
---

<CategoryNav lang={lang} slug={slug} categories={categories} />

<div class="text-red text-center text-h2 font-700 py-8" set:html={ofertas[0].content}></div>

<div class="p-6 grid grid-cols-1 gap-5 md:grid-cols-2">
    {ofertas.map((oferta) => (
        <a href={oferta.link} class="flex flex-col justify-center items-center gap-2 mb-5 bg-gray-100">
            <div class="relative">
                <Picture 
                    formats={['webp', 'avif', 'jpeg']} 
                    src={oferta.imageUrl} 
                    alt={oferta.imageAlt} 
                    width="300" 
                    height="126"
                />
                
                <h4 class="absolute bottom-0 inset-x-16 text-h4 font-700 bg-red text-center text-white px-2">
                    {oferta.title}
                </h4>
            </div>
            
            <p class="text-sm px-4 text-black font-400 text-center">{oferta.text}</p>
            
            <div class="flex flex-row items-center justify-evenly gap-8 w-full">
                <div class="flex flex-row items-center gap-1">
                    <Picture src="/iconos/Ubicacion_Negro.png" alt="Ubicacion" width="24" height="24"/>
                    <span class="text-sm text-black font-700">{oferta.ubicacion}</span>
                </div>
                <div class="flex flex-row items-center gap-1">
                    <Picture src="/iconos/Reloj_Arena_Negro.png" alt="Tiempo" width="24" height="24"/>
                    <span class="text-sm text-black font-700">{oferta.fechas}</span>
                </div>
            </div>
            
            <p class="border-t border-black text-center w-full pt-1 text-sm text-red font-400">
                {oferta.dataLimit}
            </p>
        </a>
    ))}
</div>
```

---

## 📋 TODAS LAS DEMÁS PÁGINAS SIGUEN EL MISMO PATRÓN

Para páginas simples como:
- Acollida
- OcellFoc
- Greenfluencers
- Formacions
- DiarisVoluntaries
- Etc.

```astro
---
// src/components/pages/[NombrePagina].astro
import CategoryNav from "@components/CategoryNav.astro";

const { pageData, globalData } = Astro.props;
const { content } = pageData;
const { categories } = globalData;
const { lang, slug } = Astro.params;
---

<CategoryNav lang={lang} slug={slug} categories={categories} />

<article class="max-w-lg mx-auto bg-white p-4 space-y-4 flex">
    <div class="content" set:html={content}></div>
</article>
```

**No necesitan `typeSpecificData` porque solo muestran contenido estático.**
