import { createSimpleDetallada } from "./createDetallada.js";

export const getExperienciaErasmusDetalladaInfo = createSimpleDetallada({
  prefix: "experiencia",
  fallbackButton: "Més informació",
  onError: []
});