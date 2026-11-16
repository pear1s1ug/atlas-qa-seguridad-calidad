/**
 * Pruebas unitarias (caja blanca) de la lógica de vigencia de contratos — RF-5.4
 * Casos: CP-05, CP-06, CP-07, CP-13 (diseñados en Encargo 1) + CP-13b (zona horaria).
 */
const {
  calcularEstado,
  calcularDiasEntreFechas,
  fechaHoyISO,
  DIAS_ALERTA,
} = require("../../src/lib/contratoEstado");

const AHORA = new Date("2026-11-15T15:00:00-03:00"); // mediodía en Chile

function iso(base, dias) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

describe("RF-5.4 Estado de vigencia del contrato", () => {
  test("CP-05 contrato con fecha_fin anterior a hoy se clasifica como vencido", () => {
    expect(calcularEstado(iso(AHORA, -1), AHORA)).toBe("vencido");
    expect(calcularEstado("2020-01-01", AHORA)).toBe("vencido");
  });

  test("CP-06 contrato que vence dentro de 30 días se clasifica como por_vencer", () => {
    expect(calcularEstado(iso(AHORA, 15), AHORA)).toBe("por_vencer");
  });

  test("CP-06 valores límite: vence hoy y vence exactamente en el día 30 → por_vencer", () => {
    expect(calcularEstado(iso(AHORA, 0), AHORA)).toBe("por_vencer");
    expect(calcularEstado(iso(AHORA, DIAS_ALERTA), AHORA)).toBe("por_vencer");
  });

  test("CP-07 contrato que vence después de 30 días se clasifica como vigente", () => {
    expect(calcularEstado(iso(AHORA, 90), AHORA)).toBe("vigente");
    expect(calcularEstado(iso(AHORA, DIAS_ALERTA + 1), AHORA)).toBe("vigente");
  });

  test("CP-13 cálculo de días restantes y vencidos es exacto", () => {
    expect(calcularDiasEntreFechas("2026-11-15", "2026-11-30")).toBe(15);
    expect(calcularDiasEntreFechas("2026-11-15", "2026-11-15")).toBe(0);
    expect(calcularDiasEntreFechas("2026-11-15", "2026-11-10")).toBe(-5);
    expect(calcularDiasEntreFechas("2026-12-31", "2027-01-01")).toBe(1);
    expect(calcularDiasEntreFechas("2028-02-28", "2028-03-01")).toBe(2); // año bisiesto
  });

  test("CP-13b la fecha 'hoy' se calcula en la zona horaria de Chile (America/Santiago)", () => {
    // 23:30 del 15-11-2026 en Chile corresponde a 02:30 UTC del 16-11-2026.
    const nocheChile = new Date("2026-11-16T02:30:00Z");
    expect(fechaHoyISO(nocheChile)).toBe("2026-11-15");
    // Un contrato que vence el 15-11 a las 23:30 hora local aún NO está vencido
    expect(calcularEstado("2026-11-15", nocheChile)).toBe("por_vencer");
  });
});
