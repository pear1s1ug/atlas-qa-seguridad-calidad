/**
 * Pruebas de integración — Seguridad transversal, cumplimiento y rendimiento
 * Casos: CP-37, CP-39, CP-42, CP-43, CP-49, CP-50, CP-62
 */
const { api, db, crearContextoAdmin, crearCliente } = require("../helpers");

let A, B;
beforeAll(async () => {
  A = await crearContextoAdmin();
  B = await crearContextoAdmin();
  await crearCliente(B, { nombre: "Cliente secreto de B" });
});
afterAll(async () => {
  await db.end();
});

describe("NFR-SEG-6 / RB-2 Gestión segura de logs de auditoría", () => {
  test("CP-37 la auditoría exige autenticación, se aísla por empresa y no acepta inserciones anónimas", async () => {
    const anon = await api().get("/auditoria");
    expect(anon.status).toBe(401);
    const res = await api().get("/auditoria").set(A.auth);
    expect(res.status).toBe(200);
    const usuarios = new Set(res.body.map((r) => r.usuario_id));
    expect(usuarios.has(B.nombre_usuario)).toBe(false);
    const forja = await api().post("/auditoria").send({ accion: "LOGIN", detalles: "registro falso" });
    expect([401, 403, 404, 405]).toContain(forja.status);
  });
});

describe("NFR-SEG-5 / NFR-SEG-6 Manejo de errores sin fuga de información", () => {
  test("CP-39 los errores no exponen detalles internos (SQL, stack, constraints)", async () => {
    const r1 = await api().get("/clientes/abc").set(A.auth);
    expect(r1.status).toBeLessThan(500);
    const r2 = await crearCliente(A, { correo: undefined, nombre: undefined });
    const cuerpos = JSON.stringify([r1.body, r2.body]);
    expect(cuerpos).not.toMatch(/syntax|constraint|violates|relation|column|bigint|at .*\.js/i);
  });
});

describe("NFR-SEG-5 Cabeceras de seguridad, CORS y CSRF", () => {
  test("CP-42 CORS restringido a orígenes permitidos y sesión sin cookies (mitiga CSRF)", async () => {
    const res = await api().get("/").set("Origin", "https://sitio-malicioso.example");
    const acao = res.headers["access-control-allow-origin"];
    expect(acao === undefined || (acao !== "*" && acao !== "https://sitio-malicioso.example")).toBe(true);
    const lr = await api().post("/autenticacion/login").send({ nombre_usuario: A.nombre_usuario, password: A.password });
    expect(lr.headers["set-cookie"]).toBeUndefined();
  });

  test("CP-43 la API envía cabeceras de seguridad HTTP (Helmet)", async () => {
    const res = await api().get("/");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"] || res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("NFR-SEG-8 Protección de datos personales (Ley 19.628 / Ley 21.719)", () => {
  test("CP-49 datos de empresas y usuarios no son accesibles por terceros no autorizados", async () => {
    const anon = await api().get("/empresas");
    expect(anon.status).toBe(401);
    const lista = await api().get("/empresas").set(A.auth);
    expect(lista.status).toBe(200);
    expect(lista.body.map((e) => String(e.id))).not.toContain(String(B.empresaId));
    const otra = await api().get(`/empresas/${B.empresaId}`).set(A.auth);
    expect([403, 404]).toContain(otra.status);
    const editar = await api().put(`/empresas/${B.empresaId}`).set(A.auth).send({ nombre: "Tomada", correo: "x@x.cl" });
    expect([403, 404]).toContain(editar.status);
    const vinc = await api().get(`/empresa-usuarios/${1}`);
    expect(vinc.status).toBe(401);
  });
});

describe("NFR-PERF-1 Tiempo de respuesta de operaciones CRUD simples", () => {
  function p95(arr) {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.ceil(0.95 * s.length) - 1];
  }
  test("CP-50 GET/POST de clientes y contratos responden con p95 < 300 ms", async () => {
    const tiempos = { listarClientes: [], crearCliente: [], listarContratos: [] };
    for (let i = 0; i < 5; i++) {
      let t = Date.now();
      await api().get("/clientes").set(A.auth);
      tiempos.listarClientes.push(Date.now() - t);
      t = Date.now();
      await crearCliente(A);
      tiempos.crearCliente.push(Date.now() - t);
      t = Date.now();
      await api().get("/contratos").set(A.auth);
      tiempos.listarContratos.push(Date.now() - t);
    }
    const resumen = Object.fromEntries(Object.entries(tiempos).map(([k, v]) => [k, p95(v)]));
    console.log("CP-50 p95 (ms):", JSON.stringify(resumen));
    Object.values(resumen).forEach((v) => expect(v).toBeLessThan(300));
  }, 120000);
});

describe("3.1.2 Interfaz de servidor documentada (Swagger/OpenAPI)", () => {
  test("CP-62 la colección OpenAPI está disponible y documenta los endpoints críticos", async () => {
    const res = await api().get("/openapi.json");
    expect(res.status).toBe(200);
    const paths = Object.keys(res.body.paths || {});
    ["/autenticacion/login", "/clientes", "/contratos", "/contratos/{id}/file", "/auditoria"].forEach((p) =>
      expect(paths).toContain(p)
    );
    const ui = await api().get("/docs/");
    expect(ui.status).toBe(200);
  });

  test("CP-62b la colección OpenAPI documenta logout, refresh y compartir documentos", async () => {
    const res = await api().get("/openapi.json");
    const paths = Object.keys(res.body.paths || {});
    ["/autenticacion/logout", "/autenticacion/refresh", "/contratos/{id}/compartir", "/compartido/{token}"].forEach((p) =>
      expect(paths).toContain(p)
    );
  });
});
