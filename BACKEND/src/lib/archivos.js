/**
 * Gestión de documentos de contratos (RF-5.2 / RF-5.3 / NFR-SEG-5).
 * - Lista blanca de extensiones y tipos MIME del ERS (PDF, DOC, PPT, JPG, PNG)
 * - Verificación de "magic bytes" (el contenido real debe coincidir con la extensión)
 * - Almacenamiento en storage interno con nombre aleatorio; la BD guarda la referencia
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const config = require("../config");
const { e400 } = require("./errors");

const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads"));
const DIR_CONTRATOS = path.join(UPLOADS_ROOT, "contracts");
fs.mkdirSync(DIR_CONTRATOS, { recursive: true });

const PERMITIDOS = {
  ".pdf": { mime: "application/pdf", firma: [[0x25, 0x50, 0x44, 0x46]] },
  ".png": { mime: "image/png", firma: [[0x89, 0x50, 0x4e, 0x47]] },
  ".jpg": { mime: "image/jpeg", firma: [[0xff, 0xd8, 0xff]] },
  ".jpeg": { mime: "image/jpeg", firma: [[0xff, 0xd8, 0xff]] },
  ".doc": { mime: "application/msword", firma: [[0xd0, 0xcf, 0x11, 0xe0]] },
  ".ppt": { mime: "application/vnd.ms-powerpoint", firma: [[0xd0, 0xcf, 0x11, 0xe0]] },
  ".docx": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", firma: [[0x50, 0x4b, 0x03, 0x04]] },
  ".pptx": { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", firma: [[0x50, 0x4b, 0x03, 0x04]] },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxArchivoMb * 1024 * 1024, files: 1, fields: 20 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(PERMITIDOS, ext)) {
      return cb(e400("Tipo de archivo no permitido. Formatos aceptados: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG"));
    }
    cb(null, true);
  },
});

function validarContenido(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const regla = PERMITIDOS[ext];
  const ok = regla && regla.firma.some((f) => f.every((b, i) => file.buffer[i] === b));
  if (!ok) throw e400("El contenido del archivo no corresponde a su extensión");
  return { ext, mime: regla.mime };
}

/** Guarda el archivo validado y retorna la referencia relativa para la BD. */
function guardar(file) {
  const { ext, mime } = validarContenido(file);
  const nombre = `${crypto.randomUUID()}${ext}`;
  const destino = path.join(DIR_CONTRATOS, nombre);
  fs.writeFileSync(destino, file.buffer, { flag: "wx", mode: 0o640 });
  const original = path.basename(file.originalname).replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 150);
  return { ruta: `contracts/${nombre}`, nombre_original: original, mime_type: mime, tamano: file.size, absoluta: destino };
}

/** Resuelve la ruta en disco impidiendo path traversal. */
function rutaAbsoluta(ruta) {
  const abs = path.resolve(UPLOADS_ROOT, ruta);
  if (!abs.startsWith(UPLOADS_ROOT + path.sep)) throw e400("Ruta de documento inválida");
  return abs;
}

function eliminar(ruta) {
  try {
    fs.unlinkSync(rutaAbsoluta(ruta));
  } catch {
    /* el archivo ya no existe */
  }
}

module.exports = { upload, guardar, rutaAbsoluta, eliminar, validarContenido, UPLOADS_ROOT, PERMITIDOS };
