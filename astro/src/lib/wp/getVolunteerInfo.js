import { apiURL } from "./config.js";
import { getPageById } from "./getPageById.js";
import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "volunteer",
  imageField: "volunteer_imagen",
  linkField: "volunteer_link",
  imageAlt: "Volunteer image",
  fields: {
    title: "volunteer_titulo"
  }
});

export const getAllVolunteersInfo = loader.getAll;
export const resetVolunteersCache = loader.reset;

/**
 * Get volunteer page content and its cards (from CPT).
 */
export const getVolunteerInfo = async (lang, slug) => {
  console.log(`📡 [VOLUNTEER] Request for language: ${lang}, slug: ${slug}`);

  // 1. Get processed cards for this language
  const allVolunteers = await getAllVolunteersInfo();
  const volunteerCards = allVolunteers[lang] || [];

  // 2. Get the specific page content
  const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
  let pageContent = '';
  let pageACF = {};

  if (responsePage.ok) {
    const [pageData] = await responsePage.json();
    if (pageData) {
      pageContent = pageData.content.rendered || '';
      pageACF = pageData.acf || {};
    }
  }

  // Resolve volunteer_boton_link (page ID) to a URL
  let buttonUrl = '#';
  if (pageACF.volunteer_boton_link) {
    const pageId = await getPageById(pageACF.volunteer_boton_link);
    if (pageId) {
      buttonUrl = `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}`;
    }
  }

  return [{
    pageContent,
    cards: volunteerCards,
    acf: pageACF,
    buttonUrl
  }];
};