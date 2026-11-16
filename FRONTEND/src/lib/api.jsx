import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4450";

export const api = axios.create({ baseURL: API_URL });

// Almacenamiento de la sesión (access token de corta vigencia + refresh token rotativo)
export const sesion = {
  token: () => localStorage.getItem("token"),
  refresh: () => localStorage.getItem("refreshToken"),
  guardar(token, refreshToken) {
    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    window.dispatchEvent(new Event("atlas:sesion"));
  },
  limpiar() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("atlas:sesion"));
  },
};

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

const esPublica = (url = "", method = "get") =>
  url.includes("/autenticacion/login") ||
  url.includes("/autenticacion/refresh") ||
  (url.includes("/empresas") && method.toLowerCase() === "post" && !sesion.token());

api.interceptors.request.use((config) => {
  const token = sesion.token();
  if (token && !esPublica(config.url, config.method)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Renovación transparente del access token (una sola vez por solicitud)
let renovando = null;
async function renovar() {
  const refreshToken = sesion.refresh();
  if (!refreshToken) throw new Error("sin refresh token");
  const { data } = await axios.post(`${API_URL}/autenticacion/refresh`, { refreshToken });
  sesion.guardar(data.token, data.refreshToken);
  setAuthToken(data.token);
  return data.token;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response && error.response.status;
    if (status === 401 && !original._reintento && !esPublica(original.url, original.method) && sesion.refresh()) {
      original._reintento = true;
      try {
        renovando = renovando || renovar();
        const nuevo = await renovando;
        renovando = null;
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api(original);
      } catch {
        renovando = null;
        sesion.limpiar();
        toast.error("Su sesión expiró. Inicie sesión nuevamente.");
        if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
        return Promise.reject(error);
      }
    }

    if (error.response) {
      let data = error.response.data;
      if (data instanceof Blob) {
        try {
          data = JSON.parse(await data.text());
        } catch {
          data = null;
        }
      }
      if (data && data.error) {
        toast.error(data.error, data.glosa ? { description: data.glosa, duration: 5000 } : undefined);
      } else {
        toast.error(`No fue posible completar la operación (código ${status}).`);
      }
    } else if (error.request) {
      toast.error("Error de conexión. Verifica tu conexión a internet.");
    } else {
      toast.error("Ocurrió un error inesperado");
    }
    return Promise.reject(error);
  }
);

/** Descarga un documento autenticado y lo abre en una pestaña nueva (sin exponer el token en la URL). */
export async function abrirDocumento(contratoId) {
  const res = await api.get(`/contratos/${contratoId}/file`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
