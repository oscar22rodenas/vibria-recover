import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "experiencies-erasmus",
  imageField: "experiencia_imagen",
  linkField: "experiencia_link",
  imageAlt: "Experiencia Erasmus image",
  fields: {
    title: "experiencia_titulo",
    text: "experiencia_texto",
    pinVoluntariat: "experiencia_pin_voluntariat",
    pinPais: "experiencia_pin_pais"
  }
});

export const getAllExperienciesErasmusInfo = loader.getAll;
export const getExperienciesErasmusInfo = loader.getByLang;
export const resetExperienciesErasmusCache = loader.reset;