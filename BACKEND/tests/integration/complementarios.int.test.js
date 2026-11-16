/**
 * Pruebas de regresión complementarias (caja blanca, cobertura de ramas) — Encargo 3
 * Casos: CP-65 (manejo de errores), CP-66 (vínculos y roles), CP-67 (empresas),
 *        CP-68 (edición de contratos y estados), CP-69 (enlaces expirados), CP-70 (salud/métricas)
 */
const path = require("path");
const { api, db, crearContextoAdmin, crearEditor, crearCliente, crearContrato, isoHoyMas, uid, PASSWORD_FUERTE } = require("../helpers");

const PDF = { path: path.join(__dirname, "..", "fixtures", "contrato.pdf"), opts: { contentType: "application/pdf" } };
let A, editorA, clienteA;
beforeAll(async () => {
  A = await crearContextoAdmin();
  editorA = await crearEditor(A);
  clienteA = (await crearCliente(A)).body;
});
afterAll(async () => {
  await db.end();
});

describe("CP-65 Manejo centralizado de errores (NFR-USAB-3 / NFR-SEG-6)", () => {
  test("JSON malformado → 400, ruta inexistente → 404, cuerpo excesivo → 413, sin detalles internos", async () => {
    const malformado = await api().post("/autenticacion/login").set("Content-Type", "application/json").send('{"nombre_usuario":');
    expect(malformado.status).toBe(400);
    const r404 = await api().get("/no-existe").set(A.auth);
    expect(r404.status).toBe(404);
    const grande = await api().post("/clientes").set(A.auth).send({ nombre: "x".repeat(200 * 1024) });
    expect(grande.status).toBe(413);
    for (const r of [malformado, r404, grande]) expect(JSON.stringify(r.body)).not.toMatch(/stack|at .*\.js/);
  });

  test("login sin campos → 400; refresh inválido → 401; identificadores no numéricos → 400", async () => {
    expect((await api().post("/autenticacion/login").send({})).status).toBe(400);
    expect((await api().post("/autenticacion/refresh").send({ refreshToken: "falso" })).status).toBe(401);
    expect((await api().post("/autenticacion/refresh").send({})).status).toBe(401);
    for (const url of ["/usuarios/abc", "/empresa-usuarios/abc", "/contratos/abc", "/empresas/abc", "/roles/abc"]) {
      expect((await api().get(url).set(A.auth)).status).toBe(400);
    }
  });

  test("token de un usuario desvinculado de la empresa es rechazado", async () => {
    const tmp = await crearEditor(A);
    await api().delete(`/usuarios/${tmp.usuarioId}`).set(A.auth);
    expect((await api().get("/clientes").set(tmp.auth)).status).toBe(401);
  });
});

describe("CP-66 Gestión de vínculos empresa-usuario y roles (RF-3.1 / RF-3.3)", () => {
  test("admin cambia rol, consulta y elimina un vínculo; no puede alterar su propio rol/acceso", async () => {
    const tmp = await crearEditor(A);
    const lista = await api().get("/empresa-usuarios").set(A.auth);
    const v = lista.body.find((x) => x.nombre_usuario === tmp.nombre_usuario);
    const det = await api().get(`/empresa-usuarios/${v.empresa_usuario_id}`).set(A.auth);
    expect(det.status).toBe(200);
    const up = await api().put(`/empresa-usuarios/${v.empresa_usuario_id}`).set(A.auth).send({ rol_id: 1 });
    expect(up.status).toBe(200);
    expect(String(up.body.rol_id)).toBe("1");
    expect((await api().put(`/empresa-usuarios/${v.empresa_usuario_id}`).set(A.auth).send({ rol_id: 99 })).status).toBe(400);
    const propio = lista.body.find((x) => x.nombre_usuario === A.nombre_usuario);
    expect((await api().put(`/empresa-usuarios/${propio.empresa_usuario_id}`).set(A.auth).send({ rol_id: 2 })).status).toBe(409);
    expect((await api().delete(`/empresa-usuarios/${propio.empresa_usuario_id}`).set(A.auth)).status).toBe(409);
    expect((await api().delete(`/empresa-usuarios/${v.empresa_usuario_id}`).set(A.auth)).status).toBe(200);
    expect((await api().get(`/empresa-usuarios/${v.empresa_usuario_id}`).set(A.auth)).status).toBe(404);
  });

  test("vincular usuario existente, duplicados y rol inexistente", async () => {
    const B = await crearContextoAdmin();
    const ok = await api().post("/empresa-usuarios").set(A.auth).send({ usuario_id: B.usuarioId, rol_id: 2 });
    expect(ok.status).toBe(201);
    expect((await api().post("/empresa-usuarios").set(A.auth).send({ usuario_id: B.usuarioId, rol_id: 2 })).status).toBe(409);
    expect((await api().post("/empresa-usuarios").set(A.auth).send({ usuario_id: 999999999, rol_id: 2 })).status).toBe(404);
    expect((await api().post("/empresa-usuarios").set(A.auth).send({ usuario_id: B.usuarioId, rol_id: 77 })).status).toBe(400);
    const n = uid("dup");
    const datos = { nombre_usuario: n, password: PASSWORD_FUERTE, correo: `${n}@atlas-qa.cl`, rol_id: 2 };
    expect((await api().post("/usuarios").set(A.auth).send(datos)).status).toBe(201);
    expect((await api().post("/usuarios").set(A.auth).send(datos)).status).toBe(409);
  });

  test("el usuario cambia su propia contraseña (política aplicada) y un editor no puede eliminarse a sí mismo vía admin", async () => {
    const tmp = await crearEditor(A);
    const debil = await api().put(`/usuarios/${tmp.usuarioId}`).set(tmp.auth).send({ nombre_usuario: tmp.nombre_usuario, correo: `${tmp.nombre_usuario}@atlas-qa.cl`, password: "corta" });
    expect(debil.status).toBe(400);
    const ok = await api().put(`/usuarios/${tmp.usuarioId}`).set(tmp.auth).send({ nombre_usuario: tmp.nombre_usuario, correo: `${tmp.nombre_usuario}@atlas-qa.cl`, password: "Nueva#Clave2026x" });
    expect(ok.status).toBe(200);
    const dup = await api().put(`/usuarios/${tmp.usuarioId}`).set(tmp.auth).send({ nombre_usuario: A.nombre_usuario, correo: `${uid("c")}@atlas-qa.cl` });
    expect(dup.status).toBe(409);
    expect((await api().delete(`/usuarios/${A.usuarioId}`).set(A.auth)).status).toBe(409);
    expect((await api().get(`/usuarios/${tmp.usuarioId}`).set(A.auth)).status).toBe(200);
  });

  test("catálogo de roles es de solo lectura", async () => {
    const roles = await api().get("/roles").set(A.auth);
    expect(roles.body.map((r) => r.nombre)).toEqual(expect.arrayContaining(["administrador", "editor"]));
    expect((await api().get("/roles/1").set(A.auth)).status).toBe(200);
    expect((await api().get("/roles/9999").set(A.auth)).status).toBe(404);
    expect((await api().post("/roles").set(A.auth).send({ nombre: "superadmin" })).status).toBe(403);
    expect((await api().put("/roles/1").set(A.auth).send({ nombre: "x" })).status).toBe(403);
    expect((await api().delete("/roles/2").set(A.auth)).status).toBe(403);
  });
});

describe("CP-67 Gestión de la propia empresa (RF-2.2 / RB-1)", () => {
  test("admin lee y actualiza su empresa; validaciones y baja controlada", async () => {
    expect((await api().get(`/empresas/${A.empresaId}`).set(A.auth)).status).toBe(200);
    const nuevoCorreo = `${uid("emp")}@atlas-qa.cl`;
    const up = await api().put(`/empresas/${A.empresaId}`).set(A.auth).send({ nombre: "Empresa Actualizada", correo: nuevoCorreo, telefono: "+56922223333" });
    expect(up.status).toBe(200);
    expect(up.body.correo).toBe(nuevoCorreo);
    expect((await api().put(`/empresas/${A.empresaId}`).set(A.auth).send({ nombre: "", correo: "malo" })).status).toBe(400);
    const B = await crearContextoAdmin();
    expect((await api().put(`/empresas/${A.empresaId}`).set(A.auth).send({ nombre: "X", correo: B.correoEmpresa })).status).toBe(409);
    expect((await api().put(`/empresas/${A.empresaId}`).set(editorA.auth).send({ nombre: "X", correo: nuevoCorreo })).status).toBe(403);
    expect((await api().delete(`/empresas/${A.empresaId}`).set(A.auth)).status).toBe(409);
    expect((await api().delete(`/empresas/${B.empresaId}`).set(A.auth)).status).toBe(404);
    expect((await api().post("/empresas").send({ empresa: { nombre: "Sin usuario" } })).status).toBe(400);
  });
});

describe("CP-68 Edición de contratos y servicios de estado (RF-5.1 / RF-5.4)", () => {
  test("admin edita un contrato y reemplaza su documento; validaciones de fechas y cliente", async () => {
    const c = (await crearContrato(A, clienteA.id, {}, PDF)).body;
    const up = await api().put(`/contratos/${c.id}`).set(A.auth).field("titulo", "Contrato renovado").attach("file", PDF.path, PDF.opts);
    expect(up.status).toBe(200);
    expect(up.body.titulo).toBe("Contrato renovado");
    const docs = await db.query("SELECT count(*)::int AS n FROM documentos_contrato WHERE contract_id=$1", [c.id]);
    expect(docs.rows[0].n).toBe(2); // se conserva el historial de versiones del documento
    expect((await api().put(`/contratos/${c.id}`).set(A.auth).field("fecha_fin", "2000-01-01")).status).toBe(400);
    expect((await api().put(`/contratos/${c.id}`).set(A.auth).field("cliente_id", "999999999")).status).toBe(404);
    expect((await api().put("/contratos/999999999").set(A.auth).field("titulo", "x")).status).toBe(404);
    const enlaces = await api().get(`/contratos/${c.id}/compartir`).set(A.auth);
    expect(enlaces.status).toBe(200);
    const sinDoc = (await crearContrato(A, clienteA.id)).body;
    expect((await api().post(`/contratos/${sinDoc.id}/compartir`).set(A.auth).send({})).status).toBe(400);
    expect((await api().get(`/contratos/${sinDoc.id}/file`).set(A.auth)).status).toBe(404);
  });

  test("servicios /contratos/estados, /contratos/dashboard y /metricas reflejan los estados", async () => {
    await crearContrato(A, clienteA.id, { fecha_inicio: isoHoyMas(-20), fecha_fin: isoHoyMas(5) });
    await crearContrato(A, clienteA.id, { fecha_inicio: isoHoyMas(-90), fecha_fin: isoHoyMas(-3) });
    const est = await api().get("/contratos/estados").set(A.auth);
    expect(est.body.map((c) => c.estado)).toEqual(expect.arrayContaining(["por_vencer", "vencido"]));
    const dash = await api().get("/contratos/dashboard").set(A.auth);
    expect(dash.body.contratosVencen7Dias).toBeGreaterThanOrEqual(1);
    const met = await api().get("/metricas").set(A.auth);
    expect(met.body.contratosVencidos[0].diasVencidos).toBeGreaterThanOrEqual(3);
    expect(met.body.contratosProximosAVencer[0].diasRestantes).toBeLessThanOrEqual(30);
    const filtro = await api().get(`/contratos?cliente=${clienteA.id}`).set(A.auth);
    filtro.body.forEach((c) => expect(String(c.cliente_id)).toBe(String(clienteA.id)));
  });
});

describe("CP-69 Enlaces compartidos expirados (RF-5.5)", () => {
  test("un enlace expirado responde 410 Gone", async () => {
    const c = (await crearContrato(A, clienteA.id, {}, PDF)).body;
    const gen = await api().post(`/contratos/${c.id}/compartir`).set(A.auth).send({ horas: 1 });
    await db.query("UPDATE enlaces_compartidos SET expira_en = now() - interval '1 minute' WHERE id = $1", [gen.body.id]);
    expect((await api().get(`/compartido/${gen.body.token}`)).status).toBe(410);
  });
});

describe("CP-70 Disponibilidad (NFR-DIS-1)", () => {
  test("el endpoint /salud informa el estado de la API y la base de datos", async () => {
    const r = await api().get("/salud");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "ok", db: "ok" });
  });
});
