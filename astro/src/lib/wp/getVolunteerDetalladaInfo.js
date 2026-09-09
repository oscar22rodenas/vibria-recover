import { createDetallada } from "./createDetallada.js";

export const getVolunteerDetalladaInfo = createDetallada({
  endpoint: "volunteer",
  prefix: "volunteer",
  fieldsSource: "page",
  imageAlt: "volunteer image",
  fallbackButton: "Más información",
  onError: null
});