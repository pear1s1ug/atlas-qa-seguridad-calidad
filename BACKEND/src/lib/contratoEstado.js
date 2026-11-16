/**
 * Lógica de negocio de vigencia de contratos (RF-5.4).
 * Extraída sin cambios de comportamiento desde routes/contracts.js y routes/metricas.js
 * para permitir pruebas unitarias (caja blanca).
 */

const DIAS_ALERTA = 30;

// Fecha de hoy en formato YYYY-MM-DD (implementación original: usa UTC)
function fechaHoyISO(ahora = new Date()) {
  return ahora.toISOString().split("T")[0];
}

function sumarDiasISO(fechaBase, dias) {
  const d = new Date(fechaBase);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
}

// Diferencia en días entre dos fechas (implementación original de metricas.js)
function calcularDiasEntreFechas(fecha1, fecha2) {
  const date1 = new Date(fecha1);
  const date2 = new Date(fecha2);
  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);
  const diffTime = date2 - date1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Clasificación equivalente a la usada en GET /contratos/estados
function calcularEstado(fechaFin, ahora = new Date()) {
  const hoy = fechaHoyISO(ahora);
  const limite = sumarDiasISO(ahora, DIAS_ALERTA);
  const fin = typeof fechaFin === "string" ? fechaFin.slice(0, 10) : fechaHoyISO(new Date(fechaFin));
  if (fin < hoy) return "vencido";
  if (fin >= hoy && fin <= limite) return "por_vencer";
  return "vigente";
}

module.exports = {
  DIAS_ALERTA,
  fechaHoyISO,
  sumarDiasISO,
  calcularDiasEntreFechas,
  calcularEstado,
};
