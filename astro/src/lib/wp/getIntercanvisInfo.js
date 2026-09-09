import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "intercanvis_erasmus",
  imageField: "intercanvi_imagen",
  linkField: "intercanvi_link",
  imageAlt: "Intercanvi image",
  fields: {
    title: "intercanvi_titulo",
    text: "intercanvi_texto",
    ubicacion: "intercanvi_ubicacion",
    fechas: "intercanvi_fechas",
    dataLimit: "intercanvi_data_limit"
  }
});

export const getAllIntercanvisInfo = loader.getAll;
export const getIntercanvisInfo = loader.getByLang;
export const resetIntercanvisCache = loader.reset;