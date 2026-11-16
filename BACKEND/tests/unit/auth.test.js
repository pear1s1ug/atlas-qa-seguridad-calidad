/**
 * Pruebas unitarias del verificador de tokens JWT — NFR-SEG-9 / RF-1.1
 * Caso: CP-08 (diseñado en Encargo 1).
 */
const jwt = require("jsonwebtoken");
const { getUserFromAuthHeader, JWT_SECRET } = require("../../src/lib/auth");

const reqCon = (authorization) => ({ headers: authorization ? { authorization } : {} });

describe("NFR-SEG-9 Verificación de tokens JWT", () => {
  const payload = { usuarioId: "1", nombreUsuario: "admin", empresaId: "1" };

  test("CP-08a token válido retorna el payload decodificado", () => {
    const t = jwt.sign(payload, JWT_SECRET, { expiresIn: "5m" });
    const u = getUserFromAuthHeader(reqCon(`Bearer ${t}`));
    expect(u).toMatchObject(payload);
  });

  test("CP-08b sin cabecera Authorization retorna null", () => {
    expect(getUserFromAuthHeader(reqCon())).toBeNull();
    expect(getUserFromAuthHeader(reqCon("Basic abc"))).toBeNull();
  });

  test("CP-08c token mal formado retorna null", () => {
    expect(getUserFromAuthHeader(reqCon("Bearer abc.def"))).toBeNull();
    expect(getUserFromAuthHeader(reqCon("Bearer "))).toBeNull();
  });

  test("CP-08d token expirado retorna null", () => {
    const t = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET);
    expect(getUserFromAuthHeader(reqCon(`Bearer ${t}`))).toBeNull();
  });

  test("CP-08e token firmado con otra clave (firma alterada) retorna null", () => {
    const t = jwt.sign(payload, "clave-del-atacante");
    expect(getUserFromAuthHeader(reqCon(`Bearer ${t}`))).toBeNull();
  });

  test("CP-08f token con algoritmo 'none' es rechazado", () => {
    const t = jwt.sign(payload, null, { algorithm: "none" });
    expect(getUserFromAuthHeader(reqCon(`Bearer ${t}`))).toBeNull();
  });

  test("CP-47b sin JWT_SECRET configurado la app no usa una clave por defecto embebida", () => {
    const { spawnSync } = require("child_process");
    const env = { ...process.env };
    delete env.JWT_SECRET;
    const r = spawnSync(
      process.execPath,
      ["-e", "try{const a=require('./src/lib/auth');console.log('SECRET='+a.JWT_SECRET)}catch(e){console.log('ERROR='+e.message)}"],
      { cwd: require("path").join(__dirname, "..", ".."), env, encoding: "utf8" }
    );
    // Se acepta que falle al iniciar (fail-fast); NO se acepta la clave embebida "inseguro"
    expect(r.stdout).not.toMatch(/SECRET=inseguro/);
  });
});
