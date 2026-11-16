/**
 * RF-1 Autenticación y sesión: login (bcrypt), logout con revocación, refresh token rotativo.
 */
const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const config = require("../config");
const { firmarAccessToken, requireAuth } = require("../lib/auth");
const { sha256 } = require("../lib/cifrado");
const { registrar } = require("../lib/auditoria");
const { ah, e400, e401 } = require("../lib/errors");

const router = express.Router();

// Hash ficticio para igualar tiempos cuando el usuario no existe (anti-enumeración por timing)
const HASH_FICTICIO = bcrypt.hashSync("usuario-inexistente#Atlas", 10);

// NFR-SEG-5 / ASVS V2.2: límite de intentos fallidos por IP + usuario
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginMaxIntentos,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String((req.body && req.body.nombre_usuario) || "").toLowerCase()}`,
  message: { error: "Demasiados intentos", glosa: "Ha superado el número de intentos permitidos. Intente nuevamente en 15 minutos." },
});

async function emitirSesion(usuario, vinculo) {
  const token = firmarAccessToken({
    usuarioId: usuario.id,
    nombreUsuario: usuario.nombre_usuario,
    empresaUsuarioId: vinculo.id,
    empresaId: vinculo.empresa_id,
    rol: vinculo.rol,
  });
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await pool.query(
    `INSERT INTO refresh_tokens (token_hash, usuario_id, empresa_id, expira_en)
     VALUES ($1, $2, $3, now() + ($4 || ' days')::interval)`,
    [sha256(refreshToken), usuario.id, vinculo.empresa_id, String(config.refreshTokenDias)]
  );
  return { token, refreshToken };
}

async function vinculoReciente(usuarioId, empresaId) {
  const r = await pool.query(
    `SELECT eu.id, eu.empresa_id, r.nombre AS rol FROM empresa_usuarios eu
       JOIN roles r ON r.id = eu.rol_id
      WHERE eu.usuario_id = $1 AND ($2::bigint IS NULL OR eu.empresa_id = $2)
      ORDER BY eu.id DESC LIMIT 1`,
    [usuarioId, empresaId || null]
  );
  return r.rows[0];
}

router.post(
  "/login",
  limiteLogin,
  ah(async (req, res) => {
    const { nombre_usuario, password } = req.body || {};
    if (typeof nombre_usuario !== "string" || typeof password !== "string" || !nombre_usuario || !password) {
      throw e400("Debe ingresar nombre de usuario y contraseña");
    }
    const result = await pool.query(
      "SELECT id, nombre_usuario, contrasena_hash FROM usuarios WHERE nombre_usuario = $1",
      [nombre_usuario.trim()]
    );
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user ? user.contrasena_hash : HASH_FICTICIO);
    if (!user || !ok) throw e401("Credenciales inválidas");

    const vinculo = await vinculoReciente(user.id);
    if (!vinculo) throw e401("Credenciales inválidas");

    const sesion = await emitirSesion(user, vinculo);
    await registrar(user.nombre_usuario, vinculo.empresa_id, "LOGIN: usuario inició sesión");
    res.json(sesion);
  })
);

// RF-1.2: cierre de sesión con revocación del access token (jti) y del refresh token
router.post(
  "/logout",
  requireAuth,
  ah(async (req, res) => {
    await pool.query(
      "INSERT INTO tokens_revocados (jti, expira_en) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING",
      [req.user.jti, req.user.exp]
    );
    const rt = req.body && req.body.refreshToken;
    if (typeof rt === "string") {
      await pool.query("UPDATE refresh_tokens SET revocado_en = now() WHERE token_hash = $1 AND usuario_id = $2", [
        sha256(rt),
        req.user.usuarioId,
      ]);
    }
    await registrar(req.user.nombreUsuario, req.user.empresaId, "LOGOUT: usuario cerró sesión");
    res.json({ ok: true });
  })
);

// Refresh token rotativo: el token usado queda revocado
router.post(
  "/refresh",
  ah(async (req, res) => {
    const rt = req.body && req.body.refreshToken;
    if (typeof rt !== "string" || !rt) throw e401("Sesión expirada");
    const r = await pool.query(
      `UPDATE refresh_tokens SET revocado_en = now()
        WHERE token_hash = $1 AND revocado_en IS NULL AND expira_en > now()
        RETURNING usuario_id, empresa_id`,
      [sha256(rt)]
    );
    if (r.rowCount === 0) throw e401("Sesión expirada. Inicie sesión nuevamente");
    const u = await pool.query("SELECT id, nombre_usuario FROM usuarios WHERE id = $1", [r.rows[0].usuario_id]);
    const vinculo = await vinculoReciente(r.rows[0].usuario_id, r.rows[0].empresa_id);
    if (!u.rows[0] || !vinculo) throw e401("Sesión expirada");
    res.json(await emitirSesion(u.rows[0], vinculo));
  })
);

module.exports = router;
