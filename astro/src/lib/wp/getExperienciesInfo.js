import { createListLoader } from "./createListLoader.js";

const loader = createListLoader({
  endpoint: "experiencies-ve",
  imageField: "experiencia_imagen",
  linkField: "experiencia_link",
  imageAlt: "Experiencia image",
  fields: {
    title: "experiencia_titulo",
    text: "experiencia_texto",
    pinVoluntariat: "experiencia_pin_voluntariat",
    pinPais: "experiencia_pin_pais"
  }
});

export const getAllExperienciesInfo = loader.getAll;
export const getExperienciesInfo = loader.getByLang;
export const resetExperienciesCache = loader.reset;