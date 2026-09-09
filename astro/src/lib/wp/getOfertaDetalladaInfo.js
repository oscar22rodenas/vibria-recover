import { createDetallada } from "./createDetallada.js";

export const getOfertaDetalladaInfo = createDetallada({
  endpoint: "ofertes",
  prefix: "oferta",
  imageAlt: "oferta image",
  fallbackButton: "Más información",
  onError: null
});