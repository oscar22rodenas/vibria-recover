# 📋 PLAN DE MIGRACIÓN COMPLETO

## 🎯 OBJETIVO

Transformar tu proyecto de **30-40 segundos por página** a **~0.3 segundos por página**, reduciendo el tiempo total de build de **7+ minutos a ~30 segundos** para 100 páginas.

---

## ✅ FASE 1: PREPARACIÓN (30 min)

### **Paso 1.1: Hacer backup**
```bash
git checkout -b feature/optimizar-build
git add .
git commit -m "Backup antes de optimización"
```

### **Paso 1.2: Instalar dependencias (si necesitas)**
```bash
npm install p-limit  # Solo si vas a limitar concurrencia
```

### **Paso 1.3: Crear archivo de helpers auxiliares**
```javascript
// src/wp/helpers.js
export const imageCache = new Map();
export const postsCache = new Map();
export const categoriesCache = new Map();
```

---

## ✅ FASE 2: OPTIMIZAR HELPERS WP (1-2 horas)

### **Paso 2.1: Añadir cache a getImageInfo.js**

**Ubicación:** `src/wp/getImageInfo.js`

```javascript
const imageCache = new Map();

export async function getImageInfo(imageId) {
    if (!imageId) return null;
    
    if (imageCache.has(imageId)) {
        return imageCache.get(imageId);
    }
    
    try {
        const res = await fetch(`${apiURL}/media/${imageId}?_fields=source_url,alt_text`);
        if (!res.ok) return null;
        
        const imageData = await res.json();
        imageCache.set(imageId, imageData);
        
        return imageData;
    } catch (error) {
        console.error(`Error fetching image ${imageId}:`, error.message);
        return null;
    }
}
```

### **Paso 2.2: Añadir cache a getPostsInfo.js**

```javascript
const postsCache = new Map();

export async function getPostsInfo(slug, lang) {
    const cacheKey = `${slug}-${lang}`;
    
    if (postsCache.has(cacheKey)) {
        return postsCache.get(cacheKey);
    }
    
    // ... resto del código igual
    postsCache.set(cacheKey, pageData.acf);
    return pageData.acf;
}
```

### **Paso 2.3: Añadir cache a getCategoriesInfo.js**

```javascript
const categoriesCache = new Map();

export async function getCategoriesInfo(lang) {
    if (categoriesCache.has(lang)) {
        return categoriesCache.get(lang);
    }
    
    // ... resto del código igual
    categoriesCache.set(lang, result);
    return result;
}
```

### **Paso 2.4: Optimizar getExperienciesInfo.js**

**Reemplazar fetchs secuenciales por paralelos:**

```javascript
// ❌ ANTES
for (const exp of experiencias) {
    const imgData = await getImageInfo(exp.acf.imagen);
    // ...
}

// ✅ DESPUÉS
const experienciesPromises = experienciasRaw.map(async (exp) => {
    const imgData = await getImageInfo(exp.acf.imagen);
    return { ...exp, imageUrl: imgData.source_url };
});
const experiencias = await Promise.all(experienciesPromises);
```

### **Paso 2.5: Repetir para todos los helpers**

Aplica el mismo patrón a:
- `getOfertesInfo.js`
- `getSlidesInfo.js`
- `getRRSSInfo.js`
- `getExperienciesErasmusInfo.js`
- `getIntercanvisJuvenilInfo.js`

**Tiempo estimado:** 1-2 horas

---

## ✅ FASE 3: REFACTORIZAR COMPONENTES (2-3 horas)

### **Paso 3.1: Actualizar Header.astro**

**Eliminar:**
```javascript
const acf = await getPostsInfo("header", lang);
const imageData = await getImageInfo(acf.header_imagen);
const menuData = await getCategoriesInfo(lang);
```

**Reemplazar con:**
```javascript
const { headerData, categories, rrssData, currentCategory } = Astro.props;
```

### **Paso 3.2: Actualizar Footer.astro**

**Eliminar:**
```javascript
const acf = await getPostsInfo("footer", lang);
const imagesData = await Promise.all(imageIds.map((id) => getImageInfo(id)));
```

**Reemplazar con:**
```javascript
const { footerData, rrssData } = Astro.props;
```

### **Paso 3.3: Actualizar CategoryNav.astro**

**Eliminar:**
```javascript
const categoriesMap = await getCategoriesInfo(lang);
```

**Reemplazar con:**
```javascript
const { categories } = Astro.props;
const categoriesMap = categories;
```

### **Paso 3.4: Actualizar RRSS.astro**

**Eliminar:**
```javascript
const redes_sociales = await getRRSSInfo();
```

**Reemplazar con:**
```javascript
const { rrssData } = Astro.props;
const redes_sociales = rrssData;
```

### **Paso 3.5: Actualizar Slide.astro**

**Eliminar:**
```javascript
const slides = await getSlidesInfo(lang);
```

**Reemplazar con:**
```javascript
const { slides } = Astro.props;
```

### **Paso 3.6: Actualizar todas las páginas de componentes**

Para cada página en `src/components/pages/*.astro`:

**Eliminar fetchs:**
```javascript
const acf = await getAcollidaInfo(lang, slugCompleto);
```

**Reemplazar con:**
```javascript
const { pageData, typeSpecificData } = Astro.props;
const { content } = pageData;
```

**Tiempo estimado:** 2-3 horas

---

## ✅ FASE 4: CREAR getStaticPaths() OPTIMIZADO (1-2 horas)

### **Paso 4.1: Reemplazar [slug].astro**

**Ubicación:** `src/pages/[lang]/[slug].astro`

Reemplaza completamente el `getStaticPaths()` con el código del artifact "getstaticpaths_optimizado".

**Estructura:**
1. Fetchear datos globales (1 vez por idioma)
2. Fetchear todas las páginas
3. Resolver datos específicos por tipo en paralelo
4. Retornar paths con props completos

### **Paso 4.2: Actualizar [subslug].astro**

**Ubicación:** `src/pages/[lang]/[slug]/[subslug].astro`

Aplicar el mismo patrón para páginas detalladas (ofertas y experiencias detalladas).

### **Paso 4.3: Actualizar Layout.astro**

**Modificar para pasar props a Header y Footer:**

```javascript
<Header 
    headerData={globalData.header}
    categories={globalData.categories}
    rrssData={globalData.rrss}
    currentCategory={currentCategory}
/>

<Footer 
    footerData={globalData.footer}
    rrssData={globalData.rrss}
/>
```

**Tiempo estimado:** 1-2 horas

---

## ✅ FASE 5: ACTUALIZAR PÁGINAS INDIVIDUALES (1-2 horas)

### **Paso 5.1: Actualizar Home.astro**

**Cambiar:**
```javascript
const { acf } = Astro.props.data;
```

**Por:**
```javascript
const { pageData, typeSpecificData } = Astro.props;
const { acf } = pageData;
const { slides } = typeSpecificData;
```

**Pasar `slides` a componente Slide:**
```javascript
<Slide slides={slides} />
```

### **Paso 5.2: Actualizar Experiencies.astro**

```javascript
const { pageData, typeSpecificData, globalData } = Astro.props;
const { experiencias } = typeSpecificData;
const { categories } = globalData;
```

**Pasar categories a CategoryNav:**
```javascript
<CategoryNav lang={lang} slug={slug} categories={categories} />
```

### **Paso 5.3: Actualizar Ofertes.astro**

Similar a Experiencies.

### **Paso 5.4: Actualizar ExperienciaDetallada y OfertaDetallada**

```javascript
const { globalData, pageData, detailedData } = Astro.props;
```

### **Paso 5.5: Páginas simples (Acollida, OcellFoc, etc.)**

```javascript
const { pageData, globalData } = Astro.props;
const { content } = pageData;
const { categories } = globalData;
```

**Tiempo estimado:** 1-2 horas

---

## ✅ FASE 6: PROBAR Y AJUSTAR (1 hora)

### **Paso 6.1: Build local**

```bash
npm run build
```

**Verificar:**
- ¿Se completa sin errores?
- ¿Cuánto tarda? (debería ser ~30 segundos para 100 páginas)
- ¿Hay warnings de fetchs?

### **Paso 6.2: Preview local**

```bash
npm run preview
```

**Verificar:**
- ¿Se cargan todas las páginas?
- ¿Las imágenes se muestran correctamente?
- ¿Los menús funcionan?
- ¿El footer se renderiza bien?

### **Paso 6.3: Probar páginas críticas**

Verifica manualmente:
- `/ca/home`
- `/ca/experiencies`
- `/ca/ofertes`
- `/ca/experiencies/alguna-experiencia`
- `/ca/ofertes/alguna-oferta`
- Páginas simples: Qui-som, Que-fem, etc.

### **Paso 6.4: Verificar consola del navegador**

¿Hay errores JavaScript?
¿Falta alguna imagen?
¿Faltan datos en alguna página?

**Tiempo estimado:** 1 hora

---

## ✅ FASE 7: OPTIMIZACIONES FINALES (opcional)

### **Paso 7.1: Añadir rate limiting (si WP se satura)**

```javascript
import pLimit from 'p-limit';
const limit = pLimit(10);

const pathsPromises = pages.map(page => 
    limit(async () => {
        // Tus fetchs aquí
    })
);
```

### **Paso 7.2: Añadir logging detallado**

```javascript
console.log(`🚀 Building ${paths.length} pages...`);
console.log(`⚡ Average: ${(duration / paths.length).toFixed(2)}s per page`);
```

### **Paso 7.3: Añadir error handling robusto**

```javascript
try {
    const data = await getExperienciesInfo(lang, slug);
} catch (error) {
    console.error(`❌ Error building ${slug}:`, error.message);
    return null; // O un fallback
}
```

---

## ✅ FASE 8: DEPLOY Y MONITOREO

### **Paso 8.1: Commit cambios**

```bash
git add .
git commit -m "feat: Optimizar build con fetchs paralelos en getStaticPaths"
```

### **Paso 8.2: Deploy en staging**

Prueba primero en un entorno de staging si lo tienes.

### **Paso 8.3: Medir mejora**

**Antes:**
- Tiempo total: ~7 minutos
- Tiempo por página: ~30-40 segundos

**Después esperado:**
- Tiempo total: ~30-60 segundos
- Tiempo por página: ~0.3-0.6 segundos

**Mejora: ~93-95% más rápido**

---

## 📊 CHECKLIST FINAL

- [ ] Todos los helpers tienen cache implementado
- [ ] `getImageInfo`, `getPostsInfo`, `getCategoriesInfo` cachean correctamente
- [ ] Todos los helpers paralelizan con `Promise.all`
- [ ] Header.astro NO tiene fetchs
- [ ] Footer.astro NO tiene fetchs
- [ ] CategoryNav.astro NO tiene fetchs
- [ ] RRSS.astro NO tiene fetchs
- [ ] Slide.astro NO tiene fetchs
- [ ] `getStaticPaths()` en [slug].astro fetchea datos globales 1 vez
- [ ] `getStaticPaths()` paraleliza datos específicos por página
- [ ] Layout.astro pasa `globalData` a Header y Footer
- [ ] Todas las páginas reciben datos por props
- [ ] Home.astro pasa `slides` a Slide
- [ ] Experiencies.astro recibe `experiencias` resueltas
- [ ] Ofertes.astro recibe `ofertas` resueltas
- [ ] Build completa en ~30-60 segundos
- [ ] Preview funciona correctamente
- [ ] No hay errores en consola del navegador
- [ ] Todas las imágenes cargan correctamente
- [ ] Menús y navegación funcionan

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### **Error: "Cannot read property 'imageUrl' of undefined"**

**Causa:** El helper no devolvió la imagen correctamente.

**Solución:**
```javascript
const imageUrl = experiencia?.imageUrl || "";
const imageAlt = experiencia?.imageAlt || "Imagen";
```

### **Error: "globalData is undefined"**

**Causa:** No se está pasando `globalData` desde getStaticPaths.

**Solución:** Verifica que el `return` de `getStaticPaths()` incluya:
```javascript
props: {
    globalData: globalData[lang],
    // ...
}
```

### **Error: Build muy lento aún**

**Causa posible:**
1. WordPress está saturado → Añadir rate limiting
2. Cache no funciona → Verificar que el cache está implementado
3. Fetchs secuenciales aún presentes → Buscar `await` dentro de loops

**Solución:** Revisar logs de build y medir cada fase.

---

## 📈 MÉTRICAS DE ÉXITO

### **Antes de la optimización:**
- **Fetchs por página:** ~20
- **Fetchs totales:** ~2,000 (para 100 páginas)
- **Tiempo por página:** 30-40 segundos
- **Tiempo total:** 7+ minutos

### **Después de la optimización:**
- **Fetchs por página:** ~1-3 (datos únicos)
- **Fetchs totales:** ~100-150 (con cache y paralelización)
- **Tiempo por página:** 0.3-0.6 segundos
- **Tiempo total:** 30-60 segundos

### **Reducción esperada:**
- **93-95% reducción en tiempo de build**
- **95% reducción en número de fetchs**
- **98% reducción en redundancia de datos**

---

## 🎉 RESULTADO FINAL

Con esta optimización, tu proyecto:

✅ Construirá 100 páginas en ~30-60 segundos (vs 7+ minutos)
✅ Hará ~100-150 fetchs totales (vs ~2,000)
✅ Usará cache para datos compartidos
✅ Paralelizará todos los fetchs
✅ Tendrá componentes puros sin side effects
✅ Será escalable para agregar más páginas sin ralentizar el build

**¡Disfruta de tus builds ultra-rápidos! ⚡**
