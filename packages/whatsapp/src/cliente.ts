import { aTextoPlano, createLogger, env, WhatsappError } from '@fi/core';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys';
import { pino } from 'pino';
// qrcode-terminal es CJS y Node no detecta sus named exports en runtime:
// `import { generate }` compila pero explota al arrancar. Va por el default.
// eslint-disable-next-line import-x/default
import qrcode from 'qrcode-terminal';

import { esGrupo, extraerTexto, normalizarJid } from './mensaje.js';

import type { ClienteWhatsapp, ManejadorMensaje, Salida } from './types.js';
import type { Boom } from '@hapi/boom';

const log = createLogger('whatsapp');

export interface OpcionesCliente {
  onMensaje: ManejadorMensaje;
  /** Si es false, ignora los mensajes de grupos. Por defecto solo responde chats 1 a 1. */
  responderGrupos?: boolean;
  sessionPath?: string;
}

export function crearClienteWhatsapp(opciones: OpcionesCliente): ClienteWhatsapp {
  const sessionPath = opciones.sessionPath ?? env.WHATSAPP_SESSION_PATH;
  const responderGrupos = opciones.responderGrupos ?? false;

  let socket: WASocket | undefined;
  let cerrandoAdrede = false;

  async function conectar(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      version,
      auth: state,
      // Baileys es muy verboso: su logger va aparte del nuestro.
      logger: pino({ level: 'silent' }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    socket.ev.on('creds.update', () => void saveCreds());

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        log.info('Escaneá el QR con WhatsApp > Dispositivos vinculados');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        log.info('Conectado a WhatsApp');
      }

      if (connection === 'close') {
        const motivo = (lastDisconnect?.error as Boom | undefined)?.output.statusCode;

        if (motivo === DisconnectReason.loggedOut) {
          log.error('Sesión cerrada desde el celular: borrá %s y volvé a vincular', sessionPath);
          return;
        }

        if (cerrandoAdrede) return;

        log.warn({ motivo }, 'Conexión caída, reintentando');
        void conectar();
      }
    });

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const mensaje of messages) {
        void procesar(mensaje);
      }
    });
  }

  async function procesar(mensaje: {
    key: { remoteJid?: string | null; fromMe?: boolean | null };
    message?: Parameters<typeof extraerTexto>[0];
    pushName?: string | null;
  }): Promise<void> {
    const jidCrudo = mensaje.key.remoteJid;
    if (!jidCrudo || mensaje.key.fromMe === true) return;

    const jid = normalizarJid(jidCrudo);
    const enGrupo = esGrupo(jid);
    if (enGrupo && !responderGrupos) return;

    const texto = extraerTexto(mensaje.message);
    if (!texto) return;

    try {
      const respuesta = await opciones.onMensaje({
        jid,
        nombre: mensaje.pushName ?? undefined,
        texto,
        esGrupo: enGrupo,
        recibidoEn: new Date(),
      });

      if (respuesta) await enviar(jid, respuesta);
    } catch (error) {
      log.error({ err: error, jid }, 'Falló el procesamiento del mensaje');
    }
  }

  // WhatsApp (Baileys) no tiene botones ni celdas de respuesta: la salida se
  // aplana a texto y las opciones vuelven a ser una lista numerada.
  async function enviar(jid: string, salida: Salida): Promise<void> {
    if (!socket) throw new WhatsappError('El cliente no está conectado');
    await socket.sendMessage(jid, { text: aTextoPlano(salida) });
  }

  async function desconectar(): Promise<void> {
    cerrandoAdrede = true;
    await socket?.logout();
    socket = undefined;
    log.info('Cliente de WhatsApp desconectado');
  }

  return { conectar, enviar, desconectar };
}
