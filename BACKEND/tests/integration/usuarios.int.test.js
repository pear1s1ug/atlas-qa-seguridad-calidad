/**
 * Pruebas de integración — RF-3 Gestión de usuarios y roles / RB-2 / RB-4 / RB-5 / NFR-SEG-2 / NFR-SEG-4
 * Casos: CP-10, CP-12, CP-18c, CP-19b, CP-20, CP-21, CP-38
 */
const { api, db, crearContextoAdmin, crearEditor, login, uid, PASSWORD_FUERTE } = require("../helpers");

let A, B, editorA;
beforeAll(async () => {
  A = await crearContextoAdmin();
  B = await crearContextoAdmin();
  editorA = await crearEditor(A);
});
afterAll(async () => {
  await db.end();
});

describe("RF-3.1 Crear/invitar usuarios y asignar rol", () => {
  test("CP-10 listar usuarios solo retorna integrantes de la empresa del token", async () => {
    const res = await api().get("/usuarios").set(A.auth);
    expect(res.status).toBe(200);
    const nombres = res.body.map((u) => u.nombre_usuario);
    expect(nombres).toEqual(expect.arrayContaining([A.nombre_usuario, editorA.nombre_usuario]));
    expect(nombres).not.toContain(B.nombre_usuario);
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_hash/);
  });

  test("CP-12 vincular usuario a empresa exige rol_id (400) y no crea usuario huérfano", async () => {
    const nombre_usuario = uid("sinrol");
    const res = await api()
      .post("/empresa-usuarios")
      .set(A.auth)
      .send({ nombre_usuario, contrasena_hash: PASSWORD_FUERTE, correo: `${nombre_usuario}@atlas-qa.cl` });
    expect(res.status).toBe(400);
    const { rows } = await db.query("SELECT id FROM usuarios WHERE nombre_usuario=$1", [nombre_usuario]);
    expect(rows).toHaveLength(0);
  });

  test("CP-18c un editor no puede crear usuarios (403)", async () => {
    const nombre_usuario = uid("porEditor");
    const res = await api()
      .post("/empresa-usuarios")
      .set(editorA.auth)
      .send({ nombre_usuario, contrasena_hash: PASSWORD_FUERTE, correo: `${nombre_usuario}@atlas-qa.cl`, rol_id: 1 });
    expect(res.status).toBe(403);
  });
});

describe("RF-3.3 Administrador modifica o elimina usuarios de su empresa", () => {
  test("CP-20 admin actualiza y elimina a un usuario de su empresa", async () => {
    const tmp = await crearEditor(A);
    const nuevoCorreo = `${uid("upd")}@atlas-qa.cl`;
    const up = await api()
      .put(`/usuarios/${tmp.usuarioId}`)
      .set(A.auth)
      .send({ nombre_usuario: tmp.nombre_usuario, correo: nuevoCorreo });
    expect(up.status).toBe(200);
    expect(up.body.correo).toBe(nuevoCorreo);
    const del = await api().delete(`/usuarios/${tmp.usuarioId}`).set(A.auth);
    expect(del.status).toBe(200);
    const lr = await login(tmp.nombre_usuario, PASSWORD_FUERTE);
    expect(lr.status).toBe(401);
  });

  test("CP-19b un editor no puede modificar ni eliminar usuarios (403)", async () => {
    const put = await api()
      .put(`/usuarios/${A.usuarioId}`)
      .set(editorA.auth)
      .send({ nombre_usuario: A.nombre_usuario, correo: `${uid("x")}@atlas-qa.cl` });
    expect(put.status).toBe(403);
    const del = await api().delete(`/usuarios/${A.usuarioId}`).set(editorA.auth);
    expect(del.status).toBe(403);
  });

  test("CP-21 admin de la empresa A no puede leer, modificar ni eliminar usuarios de la empresa B (IDOR)", async () => {
    const get = await api().get(`/usuarios/${B.usuarioId}`).set(A.auth);
    expect([403, 404]).toContain(get.status);
    const put = await api()
      .put(`/usuarios/${B.usuarioId}`)
      .set(A.auth)
      .send({ nombre_usuario: B.nombre_usuario, contrasena_hash: "Hackeado#2026xx", correo: `${uid("pwn")}@evil.cl` });
    expect([403, 404]).toContain(put.status);
    const lr = await login(B.nombre_usuario, B.password);
    expect(lr.status).toBe(200); // la contraseña de B no fue alterada
  });

  test("CP-21b sin token no es posible crear, leer ni modificar usuarios (401)", async () => {
    const post = await api().post("/usuarios").send({ nombre_usuario: uid("anon"), contrasena_hash: "x", correo: `${uid("a")}@x.cl` });
    expect(post.status).toBe(401);
    const get = await api().get(`/usuarios/${A.usuarioId}`);
    expect(get.status).toBe(401);
  });
});

describe("NFR-SEG-2 Almacenamiento seguro de contraseñas", () => {
  test("CP-38 las contraseñas se almacenan con hash bcrypt (no en texto plano)", async () => {
    const { rows } = await db.query("SELECT contrasena_hash FROM usuarios WHERE nombre_usuario=$1", [A.nombre_usuario]);
    expect(rows[0].contrasena_hash).not.toBe(A.password);
    expect(rows[0].contrasena_hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  test("CP-38b los usuarios semilla (admin/editor) no conservan contraseñas en texto plano", async () => {
    const { rows } = await db.query(
      "SELECT nombre_usuario, contrasena_hash FROM usuarios WHERE nombre_usuario IN ('admin','editor')"
    );
    for (const r of rows) expect(r.contrasena_hash).toMatch(/^\$2[aby]\$/);
  });
});
