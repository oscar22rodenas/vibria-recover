import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "ofertes",
  imageField: "oferta_imagen",
  linkField: "oferta_link",
  imageAlt: "Oferta image",
  fields: {
    title: "oferta_titulo",
    text: "oferta_texto",
    ubicacion: "oferta_ubicacion",
    fechas: "oferta_fechas",
    dataLimit: "oferta_data_limit"
  }
});

export const getAllOfertesInfo = loader.getAll;
export const getOfertesInfo = loader.getByLang;
export const resetOfertesCache = loader.reset;