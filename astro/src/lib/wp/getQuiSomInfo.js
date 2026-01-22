import { apiURL } from "./config.js";
import { getPageById } from "./getPageById.js";

export const getQuiSomInfo = async (lang, slug) => {
  try {
    // Fetch de qui-som (equipo)
    const responseQuiSom = await fetch(`${apiURL}/qui-som?order=asc&_fields=content,slug&per_page=100`);
    if (!responseQuiSom.ok) throw new Error("Error al obtener los contenidos de 'qui-som'");
    const dataQuiSom = await responseQuiSom.json();

    // Fetch de la página principal
    const responsePage = await fetch(`${apiURL}/pages?slug=${slug}&_fields=content,acf`);
    if (!responsePage.ok) throw new Error("Error al obtener la página");
    const [pageDataInfo] = await responsePage.json();

    // Resolver el link del botón
    const pageId = pageDataInfo.acf.qui_som_boton_link 
      ? await getPageById(pageDataInfo.acf.qui_som_boton_link) 
      : null;

    // Fetch de qui-som-voluntaries
    const responseQuiSomVoluntaries = await fetch(`${apiURL}/qui-som-voluntaries?order=asc&_fields=content,slug&per_page=100`);
    if (!responseQuiSomVoluntaries.ok) throw new Error("Error al obtener los contenidos de 'qui-som-voluntaries'");
    const dataQuiSomVoluntaries = await responseQuiSomVoluntaries.json();

    // Filtrar qui-som por idioma
    const quiSomFiltrados = dataQuiSom.filter(item => item.slug?.includes(`-${lang}`));

    // Filtrar qui-som-voluntaries por idioma
    const quiSomVoluntariesFiltrados = dataQuiSomVoluntaries.filter(item => item.slug?.includes(`-${lang}`));

    // Procesar datos de qui-som (equipo) - solo devuelven su content
    const quiSomConDatos = quiSomFiltrados.map((item) => {
      const { content } = item;
      if (!content?.rendered) {
        console.warn(`Contenido sin datos en: ${item.slug}`);
        return null;
      }
      return content.rendered;
    }).filter(Boolean);

    // Procesar datos de qui-som-voluntaries - solo devuelven su content
    const quiSomVoluntariesConDatos = quiSomVoluntariesFiltrados.map((voluntariesItem) => {
      const { content } = voluntariesItem;
      if (!content?.rendered) {
        console.warn(`Contenido sin datos en: ${voluntariesItem.slug}`);
        return null;
      }
      return content.rendered;
    }).filter(Boolean);

    // Devolver un único objeto con TODOS los datos
    // Los datos ACF (titol1, titol2, etc.) son de la PÁGINA, no de cada item individual
    return [{
      quisom: quiSomConDatos,              // Array de HTMLs del equipo
      voluntaries: quiSomVoluntariesConDatos, // Array de HTMLs de voluntarios
      pageContent: pageDataInfo.content.rendered || "",
      titol1: pageDataInfo.acf.qui_som_titulo_1 || "",
      titol2: pageDataInfo.acf.qui_som_titulo_2 || "",
      text: pageDataInfo.acf.qui_som_texto || "",
      buttonText: pageDataInfo.acf.qui_som_boton_texto || "Más información",
      buttonUrl: pageId ? `/${pageId.lang}${pageId.categoriaSlug}/${pageId.baseSlug}` : "#"
    }];
  } 
  catch (error) {
    console.error("Error en getQuiSomInfo:", error);
    return [];
  }
};