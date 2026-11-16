import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, abrirDocumento } from "../../lib/api";
import { Button, Card, CardContent, Chip, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";

const ETIQUETA = { vigente: "Vigente", por_vencer: "Por vencer", vencido: "Vencido" };
const COLOR = { vigente: "success", por_vencer: "warning", vencido: "error" };

export default function ContratoDetalle() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [enlace, setEnlace] = useState(null);
  const navigate = useNavigate();
  const { role } = useAuth();
  const esAdmin = role === "administrador";

  const load = useCallback(async () => {
    const { data } = await api.get(`/contratos/${id}`);
    setItem(data);
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onDelete = async () => {
    if (!esAdmin || !window.confirm("¿Confirma que desea eliminar este contrato y su documento?")) return;
    await api.delete(`/contratos/${id}`);
    toast.success("Contrato eliminado");
    void navigate("/contratos");
  };

  // RF-5.5: generar y revocar enlaces temporales para compartir el documento
  const compartir = async () => {
    const { data } = await api.post(`/contratos/${id}/compartir`, { horas: 24 });
    setEnlace(data);
    toast.success("Enlace generado (válido por 24 horas)");
  };
  const revocar = async () => {
    await api.delete(`/contratos/${id}/compartir`);
    setEnlace(null);
    toast.success("Enlaces revocados");
  };

  if (!item) return null;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" component="h1">{item.titulo}</Typography>
            <Chip label={ETIQUETA[item.estado] || item.estado} color={COLOR[item.estado] || "default"} data-testid="estado-contrato" />
          </Stack>
          <Typography>Cliente: {item.cliente_nombre}</Typography>
          <Typography>Inicio: {item.fecha_inicio}</Typography>
          <Typography>Fin: {item.fecha_fin}</Typography>
          {item.descripcion && <Typography>Descripción: {item.descripcion}</Typography>}
          {item.tiene_documento && (
            <Button variant="outlined" onClick={() => abrirDocumento(id).catch(() => {})} data-testid="button-contrato-ver-archivo">
              Ver archivo
            </Button>
          )}
          {esAdmin && item.tiene_documento && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button variant="contained" onClick={() => compartir().catch(() => {})} data-testid="button-contrato-compartir">
                Generar enlace para compartir
              </Button>
              <Button variant="text" color="warning" onClick={() => revocar().catch(() => {})} data-testid="button-contrato-revocar">
                Revocar enlaces
              </Button>
            </Stack>
          )}
          {enlace && (
            <TextField label="Enlace para compartir" value={enlace.url} InputProps={{ readOnly: true }} helperText={`Expira: ${new Date(enlace.expira_en).toLocaleString("es-CL")}`} />
          )}
          {esAdmin && (
            <Button color="error" variant="contained" onClick={() => onDelete().catch(() => {})}>
              Eliminar
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
