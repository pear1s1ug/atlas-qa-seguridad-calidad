/**
 * Pruebas unitarias de validaciones de entrada (RF-4.3 / restricción 2.4 / NFR-SEG-5)
 * Casos: CP-17u, CP-25u (técnicas: partición de equivalencia y valores límite)
 */
const v = require("../../src/lib/validators");

describe("Restricción 2.4 Política de contraseñas", () => {
  test("CP-17u acepta contraseña que cumple todos los criterios (12+, mayús., minús., número, símbolo)", () => {
    expect(v.validarPassword("Atlas#Prueba2026")).toEqual([]);
  });
  test.each([
    ["Ab#1abcdefg", "al menos 12 caracteres"], // 11 caracteres: valor límite inferior - 1
    ["abcdefgh#123", "una letra mayúscula"],
    ["ABCDEFGH#123", "una letra minúscula"],
    ["Abcdefgh#xyz", "un número"],
    ["Abcdefgh1234", "un símbolo"],
  ])("CP-17u rechaza '%s' por faltar %s", (pwd, motivo) => {
    expect(v.validarPassword(pwd)).toContain(motivo);
  });
  test("CP-17u valor límite: exactamente 12 caracteres es válido", () => {
    expect(v.validarPassword("Ab#1abcdefgh")).toEqual([]);
  });
  test("CP-17u entradas no string son rechazadas", () => {
    expect(v.validarPassword(undefined).length).toBeGreaterThan(0);
    expect(v.validarPassword(12345678901234).length).toBeGreaterThan(0);
  });
});

describe("RF-4.3 Validación de campos", () => {
  test.each(["76.086.428-5", "76086428-5", "12.345.678-5", "11.111.111-1", "10.000.013-K"])("CP-25u RUT válido %s", (r) =>
    expect(v.validarRut(r)).toBe(true)
  );
  test.each(["12.345.678-0", "abc", "1-9", "", "76.086.428-K"])("CP-25u RUT inválido %s", (r) => expect(v.validarRut(r)).toBe(false));
  test.each(["persona@empresa.cl", "a.b+c@sub.dominio.com"])("CP-25u correo válido %s", (c) => expect(v.validarEmail(c)).toBe(true));
  test.each(["sin-arroba", "a@b", "<script>@x.cl", "a@@b.cl"])("CP-25u correo inválido %s", (c) => expect(v.validarEmail(c)).toBe(false));
  test("CP-25u teléfono, fecha, URL e identificadores", () => {
    expect(v.validarTelefono("+56 9 1234 5678")).toBe(true);
    expect(v.validarTelefono("abc-def")).toBe(false);
    expect(v.validarFecha("2026-02-29")).toBe(false); // 2026 no es bisiesto
    expect(v.validarFecha("2028-02-29")).toBe(true);
    expect(v.validarUrl("https://atlas.cl")).toBe(true);
    expect(v.validarUrl("javascript:alert(1)")).toBe(false);
    expect(v.esIdValido("15")).toBe(true);
    expect(v.esIdValido("1 OR 1=1")).toBe(false);
    expect(v.esIdValido("0")).toBe(false);
  });
  test("CP-25u validador declarativo aplica obligatoriedad, largo y rangos", () => {
    const reglas = { nombre: { req: true, max: 5 }, dia: { tipo: "entero", min: 1, maxValor: 31 }, activo: { tipo: "bool", defecto: false } };
    expect(v.validar({ nombre: "  Ana  ", dia: "31" }, reglas)).toEqual({ datos: { nombre: "Ana", dia: "31", activo: false }, errores: [] });
    const r = v.validar({ nombre: "Demasiado", dia: "32" }, reglas);
    expect(r.errores).toEqual(["nombre excede 5 caracteres", "dia fuera de rango"]);
    expect(v.validar({}, reglas).errores).toEqual(["nombre es obligatorio"]);
    expect(v.validar({ nombre: { $ne: 1 } }, reglas).errores).toEqual(["nombre tiene un tipo inválido"]);
  });
});
