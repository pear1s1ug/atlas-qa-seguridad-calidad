/**
 * Pruebas de integración — RF-1 Autenticación y sesión / NFR-SEG-9 / NFR-SEG-5
 * Casos: CP-01, CP-02, CP-14, CP-40a, CP-46, CP-47
 */
const jwt = require("jsonwebtoken");
const { api, db, crearContextoAdmin, login, uid } = require("../helpers");

let ctx;
beforeAll(async () => {
  ctx = await crearContextoAdmin();
});
afterAll(async () => {
  await db.end();
});

describe("RF-1.1 Inicio de sesión", () => {
  test("CP-01 login exitoso con credenciales válidas entrega un JWT", async () => {
    const res = await login(ctx.nombre_usuario, ctx.password);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    const dec = jwt.decode(res.body.token);
    expect(dec).toHaveProperty("usuarioId");
    expect(dec).toHaveProperty("empresaId");
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena|password/i);
  });

  test("CP-02 login rechaza credenciales inválidas con HTTP 401 y sin token", async () => {
    const res = await login(ctx.nombre_usuario, "incorrecta");
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
    const res2 = await login(uid("noexiste"), "loquesea");
    expect(res2.status).toBe(401);
    // Mismo mensaje para usuario inexistente y contraseña incorrecta (anti-enumeración)
    expect(res2.body.error).toBe(res.body.error);
  });

  test("CP-40a inyección SQL en el login no permite autenticarse", async () => {
    const res = await login("admin' OR '1'='1' --", "x' OR '1'='1");
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});

describe("RF-1.2 Cierre de sesión y revocación de tokens", () => {
  test("CP-14 logout invalida el token: reutilizarlo responde 401", async () => {
    const lr = await login(ctx.nombre_usuario, ctx.password);
    const auth = { Authorization: `Bearer ${lr.body.token}` };
    const antes = await api().get("/clientes").set(auth);
    expect(antes.status).toBe(200);
    const out = await api().post("/autenticacion/logout").set(auth).send({ refreshToken: lr.body.refreshToken });
    expect([200, 204]).toContain(out.status);
    const despues = await api().get("/clientes").set(auth);
    expect(despues.status).toBe(401);
  });
});

describe("NFR-SEG-9 / 3.1.2 JWT de corta vigencia y refresh token", () => {
  test("CP-47 access token dura ≤ 60 min y existe refresh token funcional", async () => {
    const lr = await login(ctx.nombre_usuario, ctx.password);
    const dec = jwt.decode(lr.body.token);
    expect(dec.exp - dec.iat).toBeLessThanOrEqual(3600);
    expect(typeof lr.body.refreshToken).toBe("string");
    const rr = await api().post("/autenticacion/refresh").send({ refreshToken: lr.body.refreshToken });
    expect(rr.status).toBe(200);
    expect(typeof rr.body.token).toBe("string");
  });
});

describe("NFR-SEG-5 Protección contra fuerza bruta", () => {
  test("CP-46 tras múltiples intentos fallidos el login responde 429", async () => {
    const victima = ctx.nombre_usuario;
    const intentos = await Promise.all(
      Array.from({ length: 10 }, () => login(victima, "ClaveErronea#123"))
    );
    const codigos = intentos.map((r) => r.status);
    expect(codigos).toContain(429);
  });
});
