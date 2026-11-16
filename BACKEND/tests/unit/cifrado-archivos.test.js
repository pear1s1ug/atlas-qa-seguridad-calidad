/**
 * Pruebas unitarias de cifrado en reposo (NFR-SEG-3) y validación de archivos (RF-5.2 / NFR-SEG-5)
 * Casos: CP-45u, CP-30u
 */
const { cifrar, descifrar, PREFIJO } = require("../../src/lib/cifrado");
const { validarContenido, rutaAbsoluta } = require("../../src/lib/archivos");

describe("NFR-SEG-3 Cifrado AES-256-GCM", () => {
  test("CP-45u cifra y descifra (ida y vuelta) con IV aleatorio", () => {
    const a = cifrar("00012345678");
    const b = cifrar("00012345678");
    expect(a.startsWith(PREFIJO)).toBe(true);
    expect(a).not.toBe(b); // IV distinto en cada cifrado
    expect(descifrar(a)).toBe("00012345678");
  });
  test("CP-45u detecta manipulación del texto cifrado (integridad GCM)", () => {
    const a = cifrar("secreto");
    const partes = a.split(":");
    partes[partes.length - 1] = Buffer.from("otro").toString("base64");
    expect(() => descifrar(partes.join(":"))).toThrow();
  });
  test("CP-45u valores vacíos y heredados en claro se mantienen", () => {
    expect(cifrar(null)).toBeNull();
    expect(descifrar("texto-plano")).toBe("texto-plano");
  });
});

describe("RF-5.2 Validación de documentos", () => {
  const f = (nombre, bytes) => ({ originalname: nombre, buffer: Buffer.from(bytes) });
  test("CP-30u acepta PDF y PNG con firma correcta", () => {
    expect(validarContenido(f("a.pdf", [0x25, 0x50, 0x44, 0x46, 0x2d])).mime).toBe("application/pdf");
    expect(validarContenido(f("a.PNG", [0x89, 0x50, 0x4e, 0x47])).mime).toBe("image/png");
  });
  test("CP-30u rechaza extensión permitida con contenido falso o extensión no permitida", () => {
    expect(() => validarContenido(f("a.pdf", [0x4d, 0x5a]))).toThrow(/no corresponde/);
    expect(() => validarContenido(f("a.exe", [0x4d, 0x5a]))).toThrow();
  });
  test("CP-30u impide path traversal al resolver rutas de documentos", () => {
    expect(() => rutaAbsoluta("../../etc/passwd")).toThrow();
    expect(rutaAbsoluta("contracts/x.pdf")).toMatch(/uploads[\\/]contracts[\\/]x\.pdf$/);
  });
});
