import { crearProveedorGemini, instruccionParaOpcion } from '@fi/ai';
import { createLogger, env } from '@fi/core';
import { cerrarConexion } from '@fi/db';
import { crearClienteWhatsapp, type MensajeEntrante } from '@fi/whatsapp';

import { obtenerContextoDeOpcion } from './contexto.js';
import { mensajeParaIA, parsearOpcion, TEXTO_MENU } from './menu.js';
import { formatearRespuesta, MENSAJE_ERROR } from './respuesta.js';
import { iniciarScraping } from './scraping.js';

const log = createLogger('bot');

const ia = crearProveedorGemini();

const MENSAJE_RATE_LIMIT =
  'Estás enviando muchos mensajes seguidos. Esperá un momento y volvé a consultar.';

// Ventana deslizante en memoria: jid -> timestamps de mensajes recientes.
const marcasPorJid = new Map<string, number[]>();

function excedeLimite(jid: string): boolean {
  const ahora = Date.now();
  const ventanaMs = env.RATE_LIMIT_WINDOW_S * 1000;
  const marcas = (marcasPorJid.get(jid) ?? []).filter((t) => ahora - t < ventanaMs);

  if (marcas.length >= env.RATE_LIMIT_MAX) {
    marcasPorJid.set(jid, marcas);
    return true;
  }

  marcas.push(ahora);
  marcasPorJid.set(jid, marcas);
  return false;
}

async function responder(mensaje: MensajeEntrante): Promise<string> {
  if (excedeLimite(mensaje.jid)) {
    log.warn({ jid: mensaje.jid }, 'Rate limit alcanzado');
    return MENSAJE_RATE_LIMIT;
  }

  const opcion = parsearOpcion(mensaje.texto);

  if (!opcion) {
    return TEXTO_MENU;
  }

  const documentos = await obtenerContextoDeOpcion(opcion.numero, opcion.consulta);
  const respuesta = await ia.responder({
    mensaje: mensajeParaIA(opcion),
    documentos,
    instruccionSistema: instruccionParaOpcion(opcion.numero),
  });

  log.info(
    { jid: mensaje.jid, opcion: opcion.numero, contexto: documentos.length },
    'Consulta respondida',
  );

  return formatearRespuesta(respuesta);
}

const whatsapp = crearClienteWhatsapp({
  onMensaje: async (mensaje) => {
    try {
      return await responder(mensaje);
    } catch (error) {
      log.error({ err: error, jid: mensaje.jid }, 'No se pudo responder');
      return MENSAJE_ERROR;
    }
  },
});

const scraping = await iniciarScraping();

async function apagar(senal: string): Promise<void> {
  log.info({ senal }, 'Apagando el bot');
  try {
    await whatsapp.desconectar();
    await scraping.worker.close();
    await scraping.cola.close();
    await cerrarConexion();
  } catch (error) {
    log.error({ err: error }, 'Error durante el apagado');
  } finally {
    process.exit(0);
  }
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => void apagar(senal));
}

log.info({ entorno: env.NODE_ENV, modelo: env.GEMINI_MODEL }, 'Iniciando bot de la FI - UNMdP');
await whatsapp.conectar();
