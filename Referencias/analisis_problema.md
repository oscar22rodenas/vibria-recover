# 🔍 ANÁLISIS COMPLETO DEL PROBLEMA DE BUILD

## 🎯 1. PROBLEMA REAL IDENTIFICADO EN TU PROYECTO

### **Diagnóstico: Fetchs Secuenciales Durante el Render**

Tu proyecto tiene un problema arquitectónico crítico: **estás ejecutando fetchs de WordPress DENTRO de componentes `.astro` durante la fase de renderizado SSG**, lo que causa un efecto cascada (waterfall) devastador para el tiempo de build.

---

## 🔸 FETCHS IDENTIFICADOS POR COMPONENTE

### **CategoryNav.astro** (usado en TODAS las páginas)
```javascript
const categoriesMap = await getCategoriesInfo(lang);
```
- **Impacto**: 1 fetch por página × ~100+ páginas = ~100+ llamadas redundantes
- **Problema**: Se ejecuta en cada página, repitiendo la misma información

### **Footer.astro** (usado en TODAS las páginas)
```javascript
const acf = await getPostsInfo("footer", lang);
const imagesData = await Promise.all(imageIds.map((id) => getImageInfo(id)));
```
- **Impacto**: 1 fetch ACF + 3 fetchs de imágenes = 4 fetchs por página
- **Problema**: Se repite en cada página cuando el footer es idéntico en todas

### **Header.astro** (usado en TODAS las páginas)
```javascript
const acf = await getPostsInfo("header", lang);
const imageData = await getImageInfo(acf.header_imagen);
const menuData = await getCategoriesInfo(lang);
```
- **Impacto**: 3 fetchs por página (ACF + imagen + menú)
- **Problema**: Datos globales fetcheados en cada página

### **RRSS.astro** (dentro del Footer y Header móvil)
```javascript
const redes_sociales = await getRRSSInfo();
```
- **Impacto**: 1 fetch por página
- **Problema**: Datos estáticos fetcheados repetidamente

### **Slide.astro** (en Home)
```javascript
const slides = await getSlidesInfo(lang);
```
- **Impacto**: 1 fetch + N fetchs de imágenes por slide
- **Problema**: No está preresuelto desde getStaticPaths

### **Páginas individuales**
Cada página hace fetches adicionales:
- `Acollida.astro`: `getAcollidaInfo()` → 1 fetch
- `Experiencies.astro`: `getExperienciesInfo()` → múltiples fetchs
- `ExperienciaDetallada.astro`: `getExperienciaDetalladaInfo()` → 1 fetch
- `Ofertes.astro`: `getOfertesInfo()` → múltiples fetchs
- `OfertaDetallada.astro`: `getOfertaDetalladaInfo()` → 1 fetch
- **Y así con cada página...**

---

## 📊 CÁLCULO REAL DE FETCHS POR PÁGINA

### Ejemplo: Página "Experiencies"

**Durante el render de UNA página:**
1. Layout.astro carga → Header.astro:
   - `getPostsInfo("header")` → 1 fetch
   - `getImageInfo()` → 1 fetch
   - `getCategoriesInfo()` → 1 fetch

2. CategoryNav.astro:
   - `getCategoriesInfo()` → 1 fetch (DUPLICADO)

3. Footer.astro:
   - `getPostsInfo("footer")` → 1 fetch
   - `getImageInfo()` × 3 → 3 fetchs

4. RRSS.astro (en footer):
   - `getRRSSInfo()` → 1 fetch + N fetchs de imágenes

5. Experiencies.astro (contenido):
   - `getExperienciesInfo()` → 1 fetch base + N fetchs por experiencia

**TOTAL POR PÁGINA: ~15-25 fetchs secuenciales**

### Si tienes 100 páginas:
- **1,500 - 2,500 fetchs totales durante el build**
- Con 200ms promedio por fetch → **5-8 minutos de fetchs puros**
- Más el tiempo de procesamiento y renderizado

---

## 🎯 2. MOTIVOS TÉCNICOS DEL PROBLEMA

### **A) Por qué Astro ejecuta fetchs durante el render**

Astro en modo SSG (Static Site Generation) funciona así:

1. **Build time**: Astro genera HTML estático para cada página
2. **Fase de render**: Ejecuta todo el código en los componentes `.astro`
3. **Fetchs bloqueantes**: Los `await` detienen el render hasta que completan

**En tu caso:**
```astro
---
// ❌ ESTO SE EJECUTA DURANTE EL BUILD
const acf = await getPostsInfo("footer", lang);
const imageData = await getImageInfo(id);
---
```

Cada `await` en el frontmatter de un componente `.astro` es una **llamada HTTP síncrona** que:
- Bloquea el thread
- Espera respuesta de WordPress
- Procesa JSON
- Continúa con el siguiente fetch

### **B) Por qué causa builds lentos**

**Problema 1: Waterfall (cascada)**
```
Página 1 inicia
  → Header fetch (300ms)
    → CategoryNav fetch (300ms)
      → Footer fetch (300ms)
        → RRSS fetch (300ms)
          → Contenido fetch (300ms)
Página 1 termina: ~1.5 segundos

Página 2 inicia...
  → Repite TODO otra vez
```

**Problema 2: Sin caché entre páginas**
- Cada página hace `getCategoriesInfo()` independientemente
- WordPress responde la misma data 100+ veces
- No hay compartición de datos entre páginas

**Problema 3: Latencia acumulada**
```
Latencia red: 50ms por fetch
Procesamiento WP: 100ms por fetch
Parseo JSON: 10ms por fetch
---
Total por fetch: ~160ms
× 20 fetchs por página
= 3.2 segundos SOLO en red por página
```

### **C) Por qué tu estructura de 20+ componentes empeora el rendimiento**

Tu arquitectura actual:
```
Layout.astro
  ├─ Header.astro (3 fetchs)
  │   └─ LanguageSwitcher.astro
  ├─ [PageComponent].astro (N fetchs)
  │   └─ CategoryNav.astro (1 fetch)
  └─ Footer.astro (4 fetchs)
      └─ RRSS.astro (N fetchs)
```

**Problema**: Astro renderiza componentes de arriba hacia abajo, ejecutando fetchs secuencialmente en cada nivel de anidación.

### **D) Por qué fetchs por imagen/botón/menú es un cuello de botella**

```javascript
// ❌ Esto ejecuta 1 fetch por cada ID
const imageData = await getImageInfo(acf.header_imagen);
```

Si tienes:
- 3 imágenes en Footer → 3 fetchs
- 5 slides con imágenes → 5 fetchs
- 10 redes sociales con iconos → 10 fetchs

**= 18 fetchs solo para imágenes en una página**

### **E) Por qué tu getStaticPaths() actual no basta**

```javascript
// src/pages/[lang]/[slug].astro
export async function getStaticPaths() {
    const pagesRes = await fetch(`${apiURL}/pages?slug=&_fields=acf,slug&per_page=100`);
    const pages = await pagesRes.json();
    
    return paths.map(page => ({
        params: { lang: page.lang, slug: page.slug },
        props: { acf: page.acf } // ⚠️ ACF incompleto
    }));
}
```

**Problemas:**
1. Solo pasas `acf` básico, no imágenes resueltas
2. No pasas datos de header/footer/categorías
3. Los componentes siguen necesitando fetchear durante render
4. No hay paralelización de datos por página

### **F) Por qué WP headless amplifica el coste**

WordPress headless añade latencia porque:
1. **Cada request es HTTP**: No hay acceso directo a DB
2. **Sin joins**: Necesitas múltiples requests para datos relacionados
3. **API REST lenta**: WP no está optimizado para headless
4. **Sin agregación**: No puedes pedir "dame todo" en un solo fetch

**Ejemplo:**
```javascript
// En WP tradicional (PHP):
$post = get_post_meta($id); // 1 query directo

// En WP headless:
fetch(`/wp-json/wp/v2/posts/${id}`) // HTTP request
  → fetch(`/wp-json/wp/v2/media/${imageId}`) // Otra HTTP request
    → fetch(`/wp-json/wp/v2/categories/${catId}`) // Otra más
```

### **G) Qué patrón incorrecto estás usando**

**❌ PATRÓN ACTUAL (incorrecto):**
```
getStaticPaths() → genera params básicos
              ↓
    Página .astro → renderiza
              ↓
  Componentes .astro → fetchean durante render
              ↓
        Fetchs secuenciales → cuello de botella
```

**✅ PATRÓN CORRECTO:**
```
getStaticPaths() → fetchea TODOS los datos en paralelo
              ↓
    Página .astro → recibe props completos
              ↓
  Componentes .astro → solo renderizan (sin fetchs)
              ↓
        Build rápido → sin cuellos de botella
```

---

## 🔴 CONCLUSIÓN DEL PROBLEMA

Tu proyecto está ejecutando **~15-25 fetchs secuenciales por página** durante el build porque:

1. **Los componentes globales (Header, Footer, CategoryNav, RRSS) fetchean en cada página**
2. **No estás pasando datos resueltos desde getStaticPaths()**
3. **No hay paralelización de requests**
4. **Datos redundantes se fetchean repetidamente**
5. **La arquitectura de componentes anidados amplifica el waterfall**

**Resultado:**
- Build de 30-40 segundos por página
- 1,500-2,500 fetchs totales para 100 páginas
- 5-10 minutos de build total (o más)

---

## 📈 IMPACTO ESPERADO DE LA SOLUCIÓN

Con la solución correcta:

**ANTES:**
- 20 fetchs por página × 200ms = 4 segundos
- 100 páginas × 4s = 400 segundos (6.6 minutos)

**DESPUÉS:**
- 1 batch de fetchs en getStaticPaths() = ~2 segundos total
- 100 páginas renderizando sin fetchs = ~20 segundos
- **Build total: ~25 segundos para 100 páginas**

**Reducción: de ~7 minutos a ~25 segundos = 94% más rápido**
