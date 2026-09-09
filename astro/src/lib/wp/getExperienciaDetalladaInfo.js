import { createSimpleDetallada } from "./createDetallada.js";

export const getExperienciaDetalladaInfo = createSimpleDetallada({
  prefix: "experiencia",
  fallbackButton: "Más información",
  onError: []
});