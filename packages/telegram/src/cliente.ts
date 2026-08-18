import { createLogger, env, TelegramError } from '@fi/core';
import { Bot } from 'grammy';

import type { ClienteMensajeria, ManejadorMensaje, MensajeEntrante } from '@fi/core';

const log = createLogger('telegram');

export interface OpcionesCliente {
  onMensaje: ManejadorMensaje;
  /** Token del bot de Telegram. Si se omite se usa TELEGRAM_BOT_TOKEN del entorno. */
  token?: string;
  /** Si es true responde mensajes de grupos. Por defecto solo chats privados. */
  responderGrupos?: boolean;
}

export function crearClienteTelegram(opciones: OpcionesCliente): ClienteMensajeria {
  const token = opciones.token ?? env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new TelegramError('TELEGRAM_BOT_TOKEN no está configurado');
  }

  const responderGrupos = opciones.responderGrupos ?? false;
  const bot = new Bot(token);

  bot.on('message:text', async (ctx) => {
    const enGrupo = ctx.chat.type !== 'private';
    if (enGrupo && !responderGrupos) return;

    const mensaje: MensajeEntrante = {
      jid: String(ctx.chat.id),
      nombre: ctx.from.first_name,
      texto: ctx.message.text,
      esGrupo: enGrupo,
      recibidoEn: new Date(ctx.message.date * 1000),
    };

    try {
      const respuesta = await opciones.onMensaje(mensaje);
      if (respuesta) await ctx.reply(respuesta);
    } catch (error) {
      log.error({ err: error, jid: mensaje.jid }, 'Falló el procesamiento del mensaje');
    }
  });

  return {
    async conectar(): Promise<void> {
      // bot.start() es un loop de polling que no resuelve hasta que se llama bot.stop().
      // Usamos onStart para resolver la promesa ni bien el bot está listo y seguir.
      await new Promise<void>((resolve, reject) => {
        bot
          .start({
            onStart: (info) => {
              log.info({ username: info.username }, 'Conectado a Telegram');
              resolve();
            },
          })
          .catch(reject);
      });
    },

    async enviar(jid: string, texto: string): Promise<void> {
      try {
        await bot.api.sendMessage(Number(jid), texto);
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
