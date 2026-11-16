/**
 * Pruebas de integración — RF-2 Registro de usuarios y creación de empresa / RB-1
 * Casos: CP-15, CP-16, CP-17, CP-60
 */
const { api, db, registrarEmpresa, login, uid } = require("../helpers");

afterAll(async () => {
  await db.end();
});

describe("RF-2 Registro y creación de empresa", () => {
  test("CP-15 registro de usuario + empresa permite iniciar sesión y ver el dashboard", async () => {
    const reg = await registrarEmpresa();
    expect(reg.res.status).toBe(201);
    expect(reg.res.body.usuario.nombre_usuario).toBe(reg.nombre_usuario);
    expect(reg.res.body.empresa.id).toBeDefined();
    expect(JSON.stringify(reg.res.body)).not.toMatch(/contrasena_hash|Atlas#Prueba2026/);
    const lr = await login(reg.nombre_usuario, reg.password);
    expect(lr.status).toBe(200);
    const dash = await api().get("/metricas").set({ Authorization: `Bearer ${lr.body.token}` });
    expect(dash.status).toBe(200);
    expect(dash.body).toHaveProperty("metricas");
  });

  test("CP-16 el primer usuario de la empresa obtiene rol administrador", async () => {
    const reg = await registrarEmpresa();
    const { rows } = await db.query(
      `SELECT r.nombre FROM empresa_usuarios eu JOIN roles r ON r.id = eu.rol_id
       WHERE eu.usuario_id = $1 AND eu.empresa_id = $2`,
      [reg.res.body.usuario.id, reg.res.body.empresa.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe("administrador");
  });

  test.each([
    ["admin", "muy corta"],
    ["sinsimbolos12345A", "sin símbolo"],
    ["SOLOMAYUSCULAS#123", "sin minúsculas"],
    ["solominusculas#123", "sin mayúsculas"],
    ["SinNumeros#Atlas", "sin número"],
  ])("CP-17 registro rechaza contraseña débil '%s' (%s) con 400", async (pwd) => {
    const reg = await registrarEmpresa({ password: pwd });
    expect(reg.res.status).toBe(400);
    const { rows } = await db.query("SELECT id FROM usuarios WHERE nombre_usuario=$1", [reg.nombre_usuario]);
    expect(rows).toHaveLength(0); // no deja usuarios huérfanos
  });

  test("CP-60 RB-1 no se permite registrar dos empresas con el mismo correo principal (409)", async () => {
    const correo = `${uid("dup")}@atlas-qa.cl`;
    const r1 = await registrarEmpresa({ correoEmpresa: correo });
    expect(r1.res.status).toBe(201);
    const r2 = await registrarEmpresa({ correoEmpresa: correo });
    expect(r2.res.status).toBe(409);
    const { rows } = await db.query("SELECT id FROM usuarios WHERE nombre_usuario=$1", [r2.nombre_usuario]);
    expect(rows).toHaveLength(0); // transacción atómica: sin usuario huérfano
  });
});
