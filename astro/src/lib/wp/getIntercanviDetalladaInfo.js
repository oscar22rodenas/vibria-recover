import { createDetallada } from "./createDetallada.js";

export const getIntercanviDetalladaInfo = createDetallada({
  endpoint: "intercanvis_erasmus",
  prefix: "intercanvi",
  imageAlt: "intercanvi image",
  fallbackButton: "Més informació",
  onError: null
});