import { createDetallada } from "./createDetallada.js";

export const getFormacioDetalladaInfo = createDetallada({
  endpoint: "formacions_erasmus",
  prefix: "formacion",
  imageAlt: "formació image",
  fallbackButton: "Més informació",
  onError: null
});