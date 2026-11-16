const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const config = require("./config");
const { pool } = require("./db");
const { migrar } = require("./migraciones");
const { manejadorErrores, e404 } = require("./lib/errors");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);

// NFR-SEG-5 / NFR-SEG-1: cabeceras de seguridad (CSP, HSTS, nosniff, frame-ancestors, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "frame-ancestors": ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  })
);

// CORS restringido a orígenes conocidos (lista blanca configurable)
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    exposedHeaders: ["X-Total-Count", "Content-Disposition"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "100kb" }));
if (config.env !== "test") app.use(morgan(":remote-addr :method :url :status :res[content-length] - :response-time ms"));

// Las migraciones deben completarse antes de atender solicitudes
const listo = migrar();
listo.catch((e) => console.error("Error al migrar la base de datos:", e.message));
app.use((req, res, next) => listo.then(() => next(), next));

app.use("/autenticacion", require("./routes/auth"));
app.use("/usuarios", require("./routes/users"));
app.use("/clientes", require("./routes/clients"));
app.use("/contratos", require("./routes/contracts"));
app.use("/compartido", require("./routes/compartido"));
app.use("/auditoria", require("./routes/audit"));
app.use("/empresas", require("./routes/empresas"));
app.use("/roles", require("./routes/roles"));
app.use("/empresa-usuarios", require("./routes/empresa_usuarios"));
app.use("/metricas", require("./routes/metricas"));

const openapi = require("./openapi.json");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/openapi.json", (req, res) => res.json(openapi));

app.get("/", (req, res) => res.json({ name: "Atlas", status: "ok" }));

// NFR-DIS-1: endpoint de salud para healthchecks / monitoreo de disponibilidad
app.get("/salud", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok", uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: "degradado", db: "no disponible" });
  }
});

app.use((req, res, next) => next(e404("Ruta no encontrada")));
app.use(manejadorErrores);

if (require.main === module) {
  app.listen(config.port, () => console.log(`Atlas API escuchando en puerto ${config.port}`));
}

module.exports = app;
