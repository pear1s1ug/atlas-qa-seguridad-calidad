/**
 * Lógica de negocio de vigencia de contratos (RF-5.4).
 * Corrección Encargo 3 (INC-27): "hoy" se calcula en la zona horaria del negocio
 * (America/Santiago) y no en UTC, evitando clasificar mal contratos entre 21:00 y 24:00.
 */
const ZONA = process.env.APP_TZ || "America/Santiago";
const DIAS_ALERTA = 30;

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

// Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio
function fechaHoyISO(ahora = new Date()) {
  return fmt.format(ahora);
}

// Suma días a una fecha calendario YYYY-MM-DD (aritmética en UTC, sin efectos de horario de verano)
function sumarDiasISO(fechaBase, dias) {
  const base = typeof fechaBase === "string" ? fechaBase.slice(0, 10) : fechaHoyISO(fechaBase);
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function aISO(f) {
  if (typeof f === "string") return f.slice(0, 10);
  if (f instanceof Date) return fechaHoyISO(f);
  throw new TypeError("Fecha inválida");
}

// Diferencia en días calendario entre dos fechas (fecha2 - fecha1)
function calcularDiasEntreFechas(fecha1, fecha2) {
  const a = Date.parse(`${aISO(fecha1)}T00:00:00Z`);
  const b = Date.parse(`${aISO(fecha2)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Estado del contrato: vencido | por_vencer (≤ 30 días) | vigente
function calcularEstado(fechaFin, ahora = new Date()) {
  const hoy = fechaHoyISO(ahora);
  const fin = aISO(fechaFin);
  if (fin < hoy) return "vencido";
  if (fin <= sumarDiasISO(hoy, DIAS_ALERTA)) return "por_vencer";
  return "vigente";
}

module.exports = { DIAS_ALERTA, fechaHoyISO, sumarDiasISO, calcularDiasEntreFechas, calcularEstado };
