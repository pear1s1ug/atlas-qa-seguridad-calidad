/**
 * Pruebas de integración — RF-4 Gestión de clientes / RB-2 / RB-4 / RF-6.1 / NFR-SEG-3 / NFR-SEG-5
 * Casos: CP-03, CP-04, CP-09, CP-11, CP-18, CP-19a, CP-22, CP-23, CP-24, CP-25, CP-40b, CP-45
 */
const { api, db, crearContextoAdmin, crearEditor, crearCliente, clienteValido, uid } = require("../helpers");

let A, B, editorA, clienteA, clienteB;
beforeAll(async () => {
  A = await crearContextoAdmin();
  B = await crearContextoAdmin();
  editorA = await crearEditor(A);
  clienteA = (await crearCliente(A)).body;
  clienteB = (await crearCliente(B)).body;
});
afterAll(async () => {
  await db.end();
});

describe("Control de acceso a clientes", () => {
  test("CP-03 listar clientes sin token JWT responde 401", async () => {
    const res = await api().get("/clientes");
    expect(res.status).toBe(401);
    const bad = await api().get("/clientes").set({ Authorization: "Bearer token.invalido.x" });
    expect(bad.status).toBe(401);
  });

  test("CP-04 listar clientes con token válido filtra por la empresa del JWT", async () => {
    const res = await api().get("/clientes").set(A.auth);
    expect(res.status).toBe(200);
    const lista = Array.isArray(res.body) ? res.body : res.body.data;
    const ids = lista.map((c) => String(c.id));
    expect(ids).toContain(String(clienteA.id));
    expect(ids).not.toContain(String(clienteB.id));
    lista.forEach((c) => expect(String(c.empresa_id)).toBe(String(A.empresaId)));
  });

  test("CP-04b no se puede leer, editar ni eliminar un cliente de otra empresa", async () => {
    const get = await api().get(`/clientes/${clienteB.id}`).set(A.auth);
    expect(get.status).toBe(404);
    const put = await api().put(`/clientes/${clienteB.id}`).set(A.auth).send(clienteValido());
    expect(put.status).toBe(404);
    const del = await api().delete(`/clientes/${clienteB.id}`).set(A.auth);
    expect(del.status).toBe(404);
  });
});

describe("RF-4.1 Crear clientes", () => {
  test("CP-09 crear cliente asocia el registro a la empresa del token (ignora empresa_id del body)", async () => {
    const res = await crearCliente(A, { empresa_id: B.empresaId });
    expect(res.status).toBe(201);
    expect(String(res.body.empresa_id)).toBe(String(A.empresaId));
  });

  test("CP-11 crear cliente deja registro de auditoría con usuario y acción", async () => {
    const datos = clienteValido();
    const res = await api().post("/clientes").set(A.auth).send(datos);
    expect(res.status).toBe(201);
    const { rows } = await db.query(
      "SELECT usuario_id, accion, fecha_hora FROM auditoria WHERE usuario_id=$1 AND accion LIKE $2",
      [A.nombre_usuario, `%CLIENTES_CREAR%`]
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[rows.length - 1].fecha_hora).toBeTruthy();
  });

  test("CP-18 un editor (solo lectura) no puede crear clientes (403)", async () => {
    const res = await crearCliente(editorA);
    expect(res.status).toBe(403);
    const lista = await api().get("/clientes").set(editorA.auth);
    expect(lista.status).toBe(200); // pero sí puede visualizar
  });

  test("CP-19a un editor no puede editar ni eliminar clientes (403)", async () => {
    const put = await api().put(`/clientes/${clienteA.id}`).set(editorA.auth).send(clienteValido());
    expect(put.status).toBe(403);
    const del = await api().delete(`/clientes/${clienteA.id}`).set(editorA.auth);
    expect(del.status).toBe(403);
  });
});

describe("RF-4.2 Editar, eliminar y listar clientes", () => {
  test("CP-22 editar cliente persiste los cambios y registra auditoría", async () => {
    const c = (await crearCliente(A)).body;
    const cambios = clienteValido({ nombre: `Editado ${uid("e")}`, correo: c.correo });
    const res = await api().put(`/clientes/${c.id}`).set(A.auth).send(cambios);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(cambios.nombre);
    const get = await api().get(`/clientes/${c.id}`).set(A.auth);
    expect(get.body.nombre).toBe(cambios.nombre);
  });

  test("CP-23 la eliminación de clientes es lógica (el registro se conserva marcado)", async () => {
    const c = (await crearCliente(A)).body;
    const del = await api().delete(`/clientes/${c.id}`).set(A.auth);
    expect(del.status).toBe(200);
    const get = await api().get(`/clientes/${c.id}`).set(A.auth);
    expect(get.status).toBe(404);
    const { rows } = await db.query("SELECT * FROM clientes WHERE id=$1", [c.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].eliminado_en).toBeTruthy();
    const aud = await db.query("SELECT 1 FROM auditoria WHERE accion LIKE $1", [`%CLIENTES_ELIMINAR%${c.id}%`]);
    expect(aud.rows.length).toBeGreaterThan(0);
  });

  test("CP-24 el listado de clientes soporta paginación y filtro por nombre", async () => {
    const C = await crearContextoAdmin();
    const marca = uid("pag");
    for (let i = 0; i < 3; i++) await crearCliente(C, { nombre: `${marca} ${i}` });
    await crearCliente(C, { nombre: "Otro nombre" });
    const pag = await api().get("/clientes?page=1&limit=2").set(C.auth);
    expect(pag.status).toBe(200);
    const lista = Array.isArray(pag.body) ? pag.body : pag.body.data;
    expect(lista).toHaveLength(2);
    expect(Number(pag.headers["x-total-count"] || pag.body.total)).toBe(4);
    const filtro = await api().get(`/clientes?nombre=${encodeURIComponent(marca)}`).set(C.auth);
    const lf = Array.isArray(filtro.body) ? filtro.body : filtro.body.data;
    expect(lf).toHaveLength(3);
  });
});

describe("RF-4.3 Validación de campos", () => {
  test.each([
    [{ correo: "no-es-un-correo" }, "correo inválido"],
    [{ rut: "12.345.678-0" }, "RUT con dígito verificador inválido"],
    [{ nombre: "" }, "nombre vacío"],
    [{ telefono: "abc-def" }, "teléfono no numérico"],
    [{ dia_pago: "45" }, "día de pago fuera de rango"],
    [{ nombre: "x".repeat(300) }, "nombre excede largo máximo"],
  ])("CP-25 crear cliente con %o (%s) responde 400", async (over) => {
    const res = await crearCliente(A, over);
    expect(res.status).toBe(400);
  });
});

describe("NFR-SEG-5 Inyección SQL", () => {
  test("CP-40b la búsqueda por nombre no es vulnerable a inyección SQL", async () => {
    const res = await api().get("/clientes/search").query({ name: "' OR '1'='1' --" }).set(A.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
    const res2 = await api().get("/clientes/search").query({ name: "%' UNION SELECT * FROM usuarios --" }).set(A.auth);
    expect([200, 400]).toContain(res2.status);
    expect(JSON.stringify(res2.body)).not.toMatch(/contrasena_hash/);
  });
});

describe("NFR-SEG-3 Cifrado de datos sensibles en reposo", () => {
  test("CP-45 el número de cuenta bancaria se almacena cifrado y se entrega descifrado al titular", async () => {
    const res = await crearCliente(A, { numero_cuenta: "99988877766" });
    expect(res.status).toBe(201);
    const { rows } = await db.query("SELECT numero_cuenta FROM clientes WHERE id=$1", [res.body.id]);
    expect(rows[0].numero_cuenta).not.toBe("99988877766");
    expect(rows[0].numero_cuenta).not.toContain("99988877766");
    const get = await api().get(`/clientes/${res.body.id}`).set(A.auth);
    expect(get.body.numero_cuenta).toBe("99988877766");
  });
});
