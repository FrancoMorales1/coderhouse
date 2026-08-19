import { createLogger, env, TelegramError } from '@fi/core';
import { Bot } from 'grammy';

import { marcadoDeRespuesta } from './teclado.js';

import type { ClienteMensajeria, ManejadorMensaje, MensajeEntrante, Salida } from '@fi/core';

const log = createLogger('telegram');

/** Un comando del menú azul de Telegram (el botón "/" al lado del campo de texto). */
export interface ComandoTelegram {
  comando: string;
  descripcion: string;
}

export interface OpcionesCliente {
  onMensaje: ManejadorMensaje;
  /** Token del bot de Telegram. Si se omite se usa TELEGRAM_BOT_TOKEN del entorno. */
  token?: string;
  /** Si es true responde mensajes de grupos. Por defecto solo chats privados. */
  responderGrupos?: boolean;
  /** Se publican con setMyCommands al conectar. */
  comandos?: ComandoTelegram[];
}

export function crearClienteTelegram(opciones: OpcionesCliente): ClienteMensajeria {
  const token = opciones.token ?? env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new TelegramError('TELEGRAM_BOT_TOKEN no está configurado');
  }

  const responderGrupos = opciones.responderGrupos ?? false;
  const bot = new Bot(token);

  async function enviarMensaje(jid: string, salida: Salida): Promise<void> {
    const texto = typeof salida === 'string' ? salida : salida.texto;
    const marcado = typeof salida === 'string' ? undefined : marcadoDeRespuesta(salida);

    await bot.api.sendMessage(Number(jid), texto, marcado ? { reply_markup: marcado } : {});
  }

  async function procesar(mensaje: MensajeEntrante): Promise<void> {
    try {
      const respuesta = await opciones.onMensaje(mensaje);
      if (respuesta) await enviarMensaje(mensaje.jid, respuesta);
    } catch (error) {
      log.error({ err: error, jid: mensaje.jid }, 'Falló el procesamiento del mensaje');
    }
  }

  bot.on('message:text', async (ctx) => {
    const enGrupo = ctx.chat.type !== 'private';
    if (enGrupo && !responderGrupos) return;

    await procesar({
      jid: String(ctx.chat.id),
      nombre: ctx.from.first_name,
      texto: ctx.message.text,
      esGrupo: enGrupo,
      recibidoEn: new Date(ctx.message.date * 1000),
      // Lo que el usuario escribió en la celda viene como respuesta al mensaje
      // que la abrió: ese texto es el que dice de qué opción se trata.
      respondeA: ctx.message.reply_to_message?.text,
    });
  });

  bot.on('callback_query:data', async (ctx) => {
    const chat = ctx.chat ?? ctx.from;
    const enGrupo = ctx.chat !== undefined && ctx.chat.type !== 'private';
    if (enGrupo && !responderGrupos) return;

    // Sin esto Telegram deja el botón girando unos segundos.
    await ctx.answerCallbackQuery();

    await procesar({
      jid: String(chat.id),
      nombre: ctx.from.first_name,
      texto: '',
      esGrupo: enGrupo,
      recibidoEn: new Date(),
      opcionElegida: ctx.callbackQuery.data,
    });
  });

  return {
    async conectar(): Promise<void> {
      if (opciones.comandos && opciones.comandos.length > 0) {
        await bot.api.setMyCommands(
          opciones.comandos.map(({ comando, descripcion }) => ({
            command: comando,
            description: descripcion,
          })),
        );
      }

      // bot.start() es un loop de polling que no resuelve hasta que se llama bot.stop().
      // Usamos onStart para resolver la promesa ni bien el bot está listo y seguir.
      await new Promise<void>((resolve, reject) => {
        bot
          .start({
            allowed_updates: ['message', 'callback_query'],
            onStart: (info) => {
              log.info({ username: info.username }, 'Conectado a Telegram');
              resolve();
            },
          })
          .catch(reject);
      });
    },

    async enviar(jid: string, salida: Salida): Promise<void> {
      try {
        await enviarMensaje(jid, salida);
      } catch (error) {
        throw new TelegramError('No se pudo enviar el mensaje de Telegram', error);
      }
    },

    async desconectar(): Promise<void> {
      await bot.stop();
      log.info('Cliente de Telegram desconectado');
    },
  };
}
