export interface MensajeEntrante {
  /** JID del chat, ej: `5492235550000@s.whatsapp.net`. */
  jid: string;
  /** Nombre que muestra WhatsApp, si está disponible. */
  nombre: string | undefined;
  texto: string;
  esGrupo: boolean;
  recibidoEn: Date;
}

/** Lo que el bot hace con cada mensaje. Lo inyecta la app, no este package. */
export type ManejadorMensaje = (mensaje: MensajeEntrante) => Promise<string | undefined>;

export interface ClienteWhatsapp {
  conectar(): Promise<void>;
  enviar(jid: string, texto: string): Promise<void>;
  desconectar(): Promise<void>;
}
