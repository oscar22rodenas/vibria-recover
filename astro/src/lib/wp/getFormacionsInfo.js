import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "formacions_erasmus",
  imageField: "formacion_imagen",
  linkField: "formacion_link",
  imageAlt: "Formació image",
  fields: {
    title: "formacion_titulo",
    text: "formacion_texto",
    ubicacion: "formacion_ubicacion",
    fechas: "formacion_fechas",
    dataLimit: "formacion_data_limit"
  }
});

export const getAllFormacionsInfo = loader.getAll;
export const getFormacionsInfo = loader.getByLang;
export const resetFormacionsCache = loader.reset;