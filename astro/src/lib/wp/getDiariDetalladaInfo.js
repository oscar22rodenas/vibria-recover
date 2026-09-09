import { createSimpleDetallada } from "./createDetallada.js";

export const getDiariDetalladaInfo = createSimpleDetallada({
  prefix: "diari",
  fallbackButton: "Más información",
  onError: []
});