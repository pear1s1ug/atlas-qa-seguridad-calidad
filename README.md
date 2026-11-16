# Atlas — Sistema de Gestión (Caso A) · Aseguramiento de Calidad y Seguridad

Proyecto semestral de **ISY1102 – Seguridad y Calidad en el Desarrollo de Software**. Sobre el código fuente
del Caso A (Frontend React + API Express + PostgreSQL) se aplicó un proceso de aseguramiento de calidad
incremental:

| Etapa | Contenido | Etiqueta git |
|---|---|---|
| Línea base | Código original entregado por el docente (intencionalmente vulnerable) | `v1.0-baseline` |
| Encargo 2 | Pruebas unitarias, integración, E2E, carga, análisis estático (SonarQube, Semgrep, ESLint-security, gitleaks, npm audit) y DAST exploratorio sobre la línea base | `encargo-2` |
| Encargo 3 | Mitigación de hallazgos, pruebas de regresión, automatización CI/CD con controles de seguridad | `encargo-3` |

## Ejecución rápida (Docker)

```bash
./scripts/generar-env.sh          # crea .env con secretos aleatorios (no se versiona)
docker compose up -d --build --wait
```

- Frontend: http://localhost:3350 · API: http://localhost:4450 · Swagger: http://localhost:4450/docs · Salud: http://localhost:4450/salud
- Usuarios semilla (contraseñas con hash bcrypt en `BACKEND/sql/dump-atlas.sql`):
  - `admin` / `Admin#Atlas2026` (administrador)
  - `editor` / `Editor#Atlas2026` (solo lectura)

> Si existía un volumen de la versión original, ejecute `docker compose down -v` para recrear la base con
> las semillas nuevas (la migración automática también aplica hash bcrypt a contraseñas heredadas).

## Pruebas

| Tipo | Herramienta | Comando |
|---|---|---|
| Unitarias + integración (API + BD) | Jest + Supertest | `npm run test:ci --prefix BACKEND` |
| E2E, accesibilidad (axe-core), rendimiento, compatibilidad | Playwright | `cd e2e && npx playwright test` |
| Carga (200 usuarios concurrentes) | k6 | `docker run --rm --network host -v $PWD/perf:/scripts grafana/k6 run /scripts/carga.js` |
| DAST | OWASP ZAP | ver `.github/workflows/ci-seguridad.yml` |
| SAST / SCA / secretos | SonarQube, Semgrep, ESLint-security, npm audit, gitleaks | ver pipeline |

Cada caso de prueba está identificado con su código (`CP-xx`) y el requerimiento del ERS que verifica
(RF, NFR, RB). Las evidencias de ejecución (reportes HTML/JSON/JUnit, capturas) están en `evidencias/`.

## Pipeline CI/CD (DevSecOps)

`.github/workflows/ci-seguridad.yml` ejecuta en cada push/PR y semanalmente:

1. **Análisis estático:** ESLint (eslint-plugin-security), Semgrep (OWASP Top 10), npm audit (falla con severidad alta), gitleaks.
2. **Pruebas:** Jest + Supertest contra PostgreSQL efímero, umbral de cobertura ≥ 80 %.
3. **Sistema:** build Docker, Playwright (Chromium/Firefox/WebKit + axe-core), k6 (p95 < 300 ms), OWASP ZAP baseline + API scan con compuerta (`scripts/zap-gate.py`), respaldo/restauración verificados.

## Respaldos (NFR-SEG-7)

```bash
./scripts/respaldo.sh respaldos            # pg_dump + documentos + sha256, retención 14
./scripts/restaurar.sh respaldos/atlas_db_<fecha>.dump atlas_restaurada
```

## Principales mitigaciones aplicadas (Encargo 3)

Contraseñas con bcrypt y política de 12+ caracteres · RBAC en backend (editor solo lectura) · aislamiento
multi-empresa en todos los endpoints (IDOR) · logout con revocación de JWT (jti) y refresh token rotativo ·
access token de 15 min · rate limiting de login · Helmet (CSP, HSTS, nosniff) y CORS por lista blanca ·
errores sin fuga de información · validación server-side (RUT, correo, teléfono, fechas) · cifrado
AES-256-GCM del número de cuenta bancaria · documentos en storage interno con validación de tipo y
*magic bytes* · enlaces de compartición temporales y revocables · auditoría append-only aislada por empresa
· eliminación lógica de clientes · secretos fuera del repositorio · contenedores sin privilegios con
healthcheck · cálculo de vigencia en zona horaria America/Santiago · accesibilidad WCAG 2.1 AA.
