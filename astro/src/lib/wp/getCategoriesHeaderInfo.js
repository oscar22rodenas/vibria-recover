import { apiURL } from "./config.js";
import { getPageById } from "./getPageById.js";
import { categoriesHeaderCache } from './helpers.js';

export const getCategoriesHeaderInfo = async (lang) => {
  if (categoriesHeaderCache.has(lang)) {
    return categoriesHeaderCache.get(lang);
  }

  try {
    const response = await fetch(`${apiURL}/header?page=1&orderby=date&order=asc&_fields=title,acf,slug,id&per_page=500`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener los header menus: ${response.status}`);
    }
    
    const headerMenus = await response.json();

    const filteredHeaderMenus = headerMenus.filter(header => header.slug?.includes(`-${lang}`));

    const headerMenusConDatos = await Promise.all(
      filteredHeaderMenus.map(async (headerMenu) => {
        const { acf } = headerMenu;

        // Validar que `acf` exista antes de acceder a sus propiedades
        if (!acf) {
          console.warn(`headerMenu sin datos ACF: ${headerMenu.slug}`);
          return null;
        }

        const pageData = acf.categoriaheader_link ? await getPageById(acf.categoriaheader_link) : null;

        // Retornar el headerMenu procesado
        return {
          title: acf.categoriaheader_titulo || "Sin título",
          slug: pageData ? `/${pageData.lang}/${pageData.baseSlug}` : "#"
        };
      })
    );

    categoriesHeaderCache.set(lang, headerMenusConDatos.filter(item => item !== null));
    // Filtrar elementos null del resultado
    return headerMenusConDatos.filter(item => item !== null);
    
  } catch (error) {
    console.error("Error en getCategoriesInfo:", error);
    return []; // Retornar array vacío en caso de error
  }
};