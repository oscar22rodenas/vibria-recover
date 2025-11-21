import { apiURL } from "./config.js";
import { categoriesCache } from './helpers.js';

export async function getCategoriesInfo(lang) {
  if (categoriesCache.has(lang)) {
    return categoriesCache.get(lang);
  }

  try {
    const response = await fetch(`${apiURL}/menu?page=1&orderby=date&order=asc&_fields=title,acf,slug,id&per_page=500`);
    if (!response.ok) {
        console.error(`❌ Error fetching menus: ${response.status} - ${response.statusText}`);
        return { parent: [], children: {} };
    }
    const menus = await response.json();

    if (!Array.isArray(menus)) {
        console.warn(`⚠️ getCategoriesInfo: Expected an array from /menu, but received:`, menus);
        return { parent: [], children: {} };
    }

    const filteredMenus = menus.filter(menu => menu.slug.includes(`-${lang}`));

    const categoriesMap = {
      parent: [],
      children: {}
    };

    const allSubcategoryPromises = [];
    const parentMenuMap = {};

    for (const menu of filteredMenus) {
      const categoryTitle = menu.acf?.categoria_titulo;
      const subcategoryIds = menu.acf?.subcategorias || [];
      
      const parentData = {
        id: menu.id,
        title: categoryTitle,
        slug: menu.slug.replace(/-(ca|es|en)$/, "")
      };
      categoriesMap.parent.push(parentData);
      parentMenuMap[menu.id] = subcategoryIds;
      
      subcategoryIds.forEach(subId => {
        const subPromise = fetch(`${apiURL}/subcategorias_menu/${subId}?_fields=acf,slug`)
          .then(res => {
            if (!res.ok) {
              console.warn(`Subcategoría con ID ${subId} no encontrada (status: ${res.status})`);
              return null;
            }
            return res.json();
          })
          .then(subcategory => {
            if (!subcategory) return null;
            return {
              parentId: menu.id,
              title: subcategory.acf?.subcategoria_titol || "Sin título",
              slug: subcategory.slug.replace(/-(ca|es|en)$/, "")
            };
          })
          .catch(error => {
            console.error(`Error al obtener la subcategoría con ID ${subId}:`, error);
            return null;
          });
        allSubcategoryPromises.push(subPromise);
      });
    }

    const allSubcategories = (await Promise.all(allSubcategoryPromises)).filter(Boolean);

    for (const sub of allSubcategories) {
        if (!categoriesMap.children[sub.parentId]) {
            categoriesMap.children[sub.parentId] = [];
        }
        categoriesMap.children[sub.parentId].push(sub);
    }
    
    categoriesCache.set(lang, categoriesMap);
    return categoriesMap;

  } catch (error) {
    console.error(`❌ Global error in getCategoriesInfo for ${lang}:`, error.message);
    return { parent: [], children: {} };
  }
}
