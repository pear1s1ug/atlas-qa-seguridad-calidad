/**
 * Pruebas de integración — RF-5 Gestión de contratos y documentos / RF-6.1 / RB-2 / RB-3 / RB-4
 * Casos: CP-19, CP-26, CP-27, CP-28, CP-29, CP-30, CP-31, CP-32, CP-33, CP-34, CP-35, CP-36, CP-61
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { api, db, crearContextoAdmin, crearEditor, crearCliente, crearContrato, isoHoyMas } = require("../helpers");

const FX = path.join(__dirname, "..", "fixtures");
const PDF = { path: path.join(FX, "contrato.pdf"), opts: { contentType: "application/pdf" } };
const PNG = { path: path.join(FX, "imagen.png"), opts: { contentType: "image/png" } };

let A, B, editorA, clienteA, clienteB, contratoA;
beforeAll(async () => {
  A = await crearContextoAdmin();
  B = await crearContextoAdmin();
  editorA = await crearEditor(A);
  clienteA = (await crearCliente(A)).body;
  clienteB = (await crearCliente(B)).body;
  contratoA = (await crearContrato(A, clienteA.id, {}, PDF)).body;
});
afterAll(async () => {
  await db.end();
});

function binario(res, cb) {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
}

describe("RF-5.1 Crear contratos asociados a cliente", () => {
  test("CP-26 crear contrato con título, descripción y fechas asociado a un cliente", async () => {
    const res = await crearContrato(A, clienteA.id, {
      titulo: "Contrato de mantención",
      descripcion: "Mantención anual",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2027-01-01",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ titulo: "Contrato de mantención", descripcion: "Mantención anual" });
    expect(String(res.body.cliente_id)).toBe(String(clienteA.id));
    // Un mismo cliente puede tener múltiples contratos
    const lista = await api().get("/contratos").set(A.auth);
    expect(lista.body.filter((c) => c.cliente_nombre === clienteA.nombre).length).toBeGreaterThanOrEqual(2);
  });

  test("CP-27 crear contrato con fecha_fin anterior a fecha_inicio responde 400", async () => {
    const res = await crearContrato(A, clienteA.id, { fecha_inicio: "2026-12-01", fecha_fin: "2026-01-01" });
    expect(res.status).toBe(400);
  });

  test("CP-61 RB-3 un contrato debe asociarse a un (único) cliente: cliente_id es obligatorio", async () => {
    const res = await api()
      .post("/contratos")
      .set(A.auth)
      .field("titulo", "Sin cliente")
      .field("fecha_inicio", "2026-01-01")
      .field("fecha_fin", "2026-12-31");
    expect(res.status).toBe(400);
  });

  test("CP-28 no se puede crear un contrato para un cliente de otra empresa ni sin autenticación", async () => {
    const cruzado = await crearContrato(A, clienteB.id);
    expect([400, 403, 404]).toContain(cruzado.status);
    const anon = await api()
      .post("/contratos")
      .field("cliente_id", String(clienteA.id))
      .field("titulo", "Anónimo")
      .field("fecha_inicio", "2026-01-01")
      .field("fecha_fin", "2026-12-31");
    expect(anon.status).toBe(401);
  });

  test("CP-19 un editor no puede crear, editar ni eliminar contratos (403)", async () => {
    const crear = await crearContrato(editorA, clienteA.id);
    expect(crear.status).toBe(403);
    const editar = await api().put(`/contratos/${contratoA.id}`).set(editorA.auth).field("titulo", "Editado por editor");
    expect(editar.status).toBe(403);
    const eliminar = await api().delete(`/contratos/${contratoA.id}`).set(editorA.auth);
    expect(eliminar.status).toBe(403);
  });
});

describe("RF-5.2 / RF-5.3 Documentos del contrato", () => {
  test("CP-29 adjuntar PDF y PNG; la descarga devuelve el mismo archivo con su tipo MIME", async () => {
    for (const fx of [PDF, PNG]) {
      const c = await crearContrato(A, clienteA.id, {}, fx);
      expect(c.status).toBe(201);
      const dl = await api().get(`/contratos/${c.body.id}/file`).set(A.auth).buffer(true).parse(binario);
      expect(dl.status).toBe(200);
      expect(dl.headers["content-type"]).toContain(fx.opts.contentType);
      expect(Buffer.compare(dl.body, fs.readFileSync(fx.path))).toBe(0);
    }
  });

  test.each([
    ["malware.exe", "application/x-msdownload"],
    ["xss.html", "text/html"],
  ])("CP-30 se rechaza adjuntar archivo no permitido %s (400/415)", async (file, ct) => {
    const res = await crearContrato(A, clienteA.id, {}, { path: path.join(FX, file), opts: { contentType: ct } });
    expect([400, 415]).toContain(res.status);
  });

  test("CP-30b se rechaza un archivo con extensión permitida pero contenido falso (magic bytes)", async () => {
    const tmp = path.join(os.tmpdir(), `falso_${Date.now()}.pdf`);
    fs.writeFileSync(tmp, "MZ esto en realidad es un ejecutable");
    const res = await crearContrato(A, clienteA.id, {}, { path: tmp, opts: { contentType: "application/pdf" } });
    expect([400, 415]).toContain(res.status);
  });

  test("CP-31 el documento se almacena en storage interno y la BD guarda su referencia", async () => {
    const c = await crearContrato(A, clienteA.id, {}, PDF);
    const { rows } = await db.query("SELECT * FROM documentos_contrato WHERE contract_id=$1", [c.body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ruta).toBeTruthy();
    const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
    expect(fs.existsSync(path.join(uploadsRoot, rows[0].ruta))).toBe(true);
  });

  test("CP-34 descargar documento exige autenticación y pertenencia a la empresa", async () => {
    const anon = await api().get(`/contratos/${contratoA.id}/file`);
    expect(anon.status).toBe(401);
    const otro = await api().get(`/contratos/${contratoA.id}/file`).set(B.auth);
    expect([403, 404]).toContain(otro.status);
    const det = await api().get(`/contratos/${contratoA.id}`).set(B.auth);
    expect([403, 404]).toContain(det.status);
    const anonDet = await api().get(`/contratos/${contratoA.id}`);
    expect(anonDet.status).toBe(401);
  });

  test("CP-35 subida y descarga de un documento de 5 MB demoran menos de 10 segundos", async () => {
    const tmp = path.join(os.tmpdir(), `grande_${Date.now()}.pdf`);
    fs.writeFileSync(tmp, Buffer.concat([fs.readFileSync(PDF.path), Buffer.alloc(5 * 1024 * 1024, 32)]));
    let t0 = Date.now();
    const up = await crearContrato(A, clienteA.id, {}, { path: tmp, opts: { contentType: "application/pdf" } });
    const tSubida = Date.now() - t0;
    expect(up.status).toBe(201);
    t0 = Date.now();
    const dl = await api().get(`/contratos/${up.body.id}/file`).set(A.auth).buffer(true).parse(binario);
    const tDescarga = Date.now() - t0;
    expect(dl.status).toBe(200);
    expect(tSubida).toBeLessThan(10000);
    expect(tDescarga).toBeLessThan(10000);
  });
});

describe("RF-5.4 Estado calculado del contrato", () => {
  test("CP-32 los contratos listados exponen su estado (vigente / por_vencer / vencido)", async () => {
    const vig = (await crearContrato(A, clienteA.id, { fecha_inicio: isoHoyMas(-30), fecha_fin: isoHoyMas(120) })).body;
    const pv = (await crearContrato(A, clienteA.id, { fecha_inicio: isoHoyMas(-30), fecha_fin: isoHoyMas(10) })).body;
    const ven = (await crearContrato(A, clienteA.id, { fecha_inicio: isoHoyMas(-60), fecha_fin: isoHoyMas(-5) })).body;
    const res = await api().get("/contratos").set(A.auth);
    const porId = Object.fromEntries(res.body.map((c) => [String(c.id), c.estado]));
    expect(porId[String(vig.id)]).toBe("vigente");
    expect(porId[String(pv.id)]).toBe("por_vencer");
    expect(porId[String(ven.id)]).toBe("vencido");
    const det = await api().get(`/contratos/${ven.id}`).set(A.auth);
    expect(det.body.estado).toBe("vencido");
  });
});

describe("RF-5.5 Enlace para compartir el documento", () => {
  test("CP-33 generar enlace, acceder sin sesión y revocar el acceso", async () => {
    const gen = await api().post(`/contratos/${contratoA.id}/compartir`).set(A.auth).send({ horas: 24 });
    expect(gen.status).toBe(201);
    expect(gen.body.token).toBeDefined();
    const acceso = await api().get(`/compartido/${gen.body.token}`).buffer(true).parse(binario);
    expect(acceso.status).toBe(200);
    const rev = await api().delete(`/contratos/${contratoA.id}/compartir`).set(A.auth);
    expect([200, 204]).toContain(rev.status);
    const tras = await api().get(`/compartido/${gen.body.token}`);
    expect([404, 410]).toContain(tras.status);
    const falso = await api().get(`/compartido/token-inventado-123`);
    expect([404, 410]).toContain(falso.status);
  });
});

describe("RF-6.1 Auditoría de acciones críticas sobre contratos y documentos", () => {
  test("CP-36 se auditan la subida, descarga y eliminación de contratos/documentos", async () => {
    const c = (await crearContrato(A, clienteA.id, {}, PDF)).body;
    await api().get(`/contratos/${c.id}/file`).set(A.auth);
    const del = await api().delete(`/contratos/${c.id}`).set(A.auth);
    expect(del.status).toBe(200);
    const { rows } = await db.query("SELECT accion FROM auditoria WHERE usuario_id=$1", [A.nombre_usuario]);
    const acciones = rows.map((r) => r.accion).join("\n");
    expect(acciones).toMatch(new RegExp(`CONTRATOS_CREAR.*`));
    expect(acciones).toMatch(new RegExp(`DOCUMENTO_DESCARGAR.*${c.id}`));
    expect(acciones).toMatch(new RegExp(`CONTRATOS_ELIMINAR.*${c.id}`));
  });
});
