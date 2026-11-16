import { useEffect, useMemo, useState, useCallback } from "react";
import { api, setAuthToken, sesion } from "../lib/api";
import { AuthContext } from "./authContextInstance";
import { jwtDecode } from "jwt-decode";

// Corrección Encargo 3: el rol se obtiene del token emitido por el backend (antes se asumía
// "administrador" por defecto desde localStorage, lo que exponía la UI de administración a editores).
function rolDesdeToken(token) {
  try {
    return jwtDecode(token).rol || null;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sesion.token());
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [role, setRole] = useState(() => (sesion.token() ? rolDesdeToken(sesion.token()) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Sincroniza el estado cuando el interceptor renueva o invalida la sesión
  useEffect(() => {
    const onCambio = () => {
      const t = sesion.token();
      setToken(t);
      setRole(t ? rolDesdeToken(t) : null);
      if (!t) setUser(null);
    };
    window.addEventListener("atlas:sesion", onCambio);
    return () => window.removeEventListener("atlas:sesion", onCambio);
  }, []);

  const login = async ({ nombre_usuario, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/autenticacion/login", { nombre_usuario, password });
      sesion.guardar(data.token, data.refreshToken);
      setToken(data.token);
      setAuthToken(data.token);
      let decoded = {};
      try {
        decoded = jwtDecode(data.token);
      } catch {
        decoded = {};
      }
      const userData = { nombre_usuario, id: decoded.usuarioId, ...decoded };
      setUser(userData);
      setRole(decoded.rol || null);
      localStorage.setItem("user", JSON.stringify(userData));
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      // RF-1.2: el servidor revoca el access token y el refresh token
      await api.post("/autenticacion/logout", { refreshToken: sesion.refresh() });
    } catch {
      // aun si falla la llamada, se limpia la sesión local
    }
    sesion.limpiar();
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, role, loading, login, logout }),
    [token, user, role, loading, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
