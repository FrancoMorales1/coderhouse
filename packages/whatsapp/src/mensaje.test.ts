import { describe, expect, it } from 'vitest';

import { esGrupo, extraerTexto, normalizarJid } from './mensaje.js';

describe('extraerTexto', () => {
  it('lee un mensaje de texto simple', () => {
    expect(extraerTexto({ conversation: 'Hola' })).toBe('Hola');
  });

  it('lee el texto extendido (respuestas y citas)', () => {
    expect(extraerTexto({ extendedTextMessage: { text: '¿Hay clases el lunes?' } })).toBe(
      '¿Hay clases el lunes?',
    );
  });

  it('ignora imágenes, videos y documentos aunque tengan caption', () => {
    expect(extraerTexto({ imageMessage: { caption: 'Mirá este cartel' } })).toBeUndefined();
    expect(extraerTexto({ videoMessage: { caption: 'Video con texto' } })).toBeUndefined();
    expect(extraerTexto({ documentMessage: { caption: 'Doc adjunto' } })).toBeUndefined();
  });

  it('devuelve undefined para mensajes sin texto útil', () => {
    expect(extraerTexto(null)).toBeUndefined();
    expect(extraerTexto(undefined)).toBeUndefined();
    expect(extraerTexto({})).toBeUndefined();
    expect(extraerTexto({ conversation: '   ' })).toBeUndefined();
  });
});

describe('esGrupo', () => {
  it('distingue grupos de chats individuales', () => {
    expect(esGrupo('12036304@g.us')).toBe(true);
    expect(esGrupo('5492235550000@s.whatsapp.net')).toBe(false);
  });
});

describe('normalizarJid', () => {
  it('saca el sufijo de dispositivo', () => {
    expect(normalizarJid('5492235550000:12@s.whatsapp.net')).toBe('5492235550000@s.whatsapp.net');
  });

  it('deja intacto un jid ya normalizado', () => {
    expect(normalizarJid('5492235550000@s.whatsapp.net')).toBe('5492235550000@s.whatsapp.net');
  });
});
