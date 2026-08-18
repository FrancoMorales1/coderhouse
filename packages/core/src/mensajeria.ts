export interface MensajeEntrante {
  /** Identificador del chat: JID en WhatsApp, chat ID en Telegram. */
  jid: string;
  nombre: string | undefined;
  texto: string;
  esGrupo: boolean;
  recibidoEn: Date;
}

export type ManejadorMensaje = (mensaje: MensajeEntrante) => Promise<string | undefined>;

export interface ClienteMensajeria {
  conectar(): Promise<void>;
  enviar(jid: string, texto: string): Promise<void>;
  desconectar(): Promise<void>;
}
