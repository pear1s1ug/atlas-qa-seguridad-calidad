// CP-52 NFR-PERF-3 / NFR-PERF-1 — 200 usuarios concurrentes sobre operaciones CRUD de lectura
import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_URL || "http://localhost:4450";
const PWD = "Atlas#Carga-2026x";

export const options = {
  scenarios: {
    concurrentes: { executor: "constant-vus", vus: Number(__ENV.VUS || 200), duration: __ENV.DURACION || "30s" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{tipo:crud}": ["p(95)<300"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
};

export function setup() {
  const u = `k6_${Date.now()}`;
  const h = { headers: { "Content-Type": "application/json" } };
  http.post(`${API}/empresas`, JSON.stringify({
    usuario: { nombre_usuario: u, contrasena_hash: PWD, password: PWD, correo: `${u}@atlas-qa.cl` },
    empresa: { nombre: `Carga ${u}`, direccion: "x", telefono: "+56900000000", correo: `${u}@empresa-qa.cl` },
  }), h);
  const r = http.post(`${API}/autenticacion/login`, JSON.stringify({ nombre_usuario: u, password: PWD }), h);
  return { token: r.json("token") };
}

export default function (data) {
  const p = { headers: { Authorization: `Bearer ${data.token}` }, tags: { tipo: "crud" } };
  const r1 = http.get(`${API}/clientes`, p);
  const r2 = http.get(`${API}/contratos`, p);
  check(r1, { "clientes 200": (r) => r.status === 200 });
  check(r2, { "contratos 200": (r) => r.status === 200 });
  sleep(1);
}
