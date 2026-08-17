import { AiError, createLogger, env } from '@fi/core';
import { GoogleGenAI } from '@google/genai';

import { construirPrompt, extraerFuentes, INSTRUCCION_SISTEMA } from './prompt.js';

import type { ConsultaIA, ProveedorIA, RespuestaIA } from './types.js';

const log = createLogger('ai');

export function crearProveedorGemini(
  opciones: { apiKey?: string; modelo?: string } = {},
): ProveedorIA {
  const modelo = opciones.modelo ?? env.GEMINI_MODEL;
  const cliente = new GoogleGenAI({ apiKey: opciones.apiKey ?? env.GEMINI_API_KEY });

  return {
    async responder(consulta: ConsultaIA): Promise<RespuestaIA> {
      const prompt = construirPrompt(consulta);

      try {
        const respuesta = await cliente.models.generateContent({
          model: modelo,
          contents: prompt,
          config: {
            systemInstruction: INSTRUCCION_SISTEMA,
            temperature: 0.2,
            maxOutputTokens: 1_024,
          },
        });

        const texto = respuesta.text?.trim();
        if (!texto) throw new AiError('Gemini devolvió una respuesta vacía');

        log.debug({ modelo, documentos: consulta.documentos.length }, 'Respuesta generada');

        return { texto, fuentes: extraerFuentes(consulta.documentos), modelo };
      } catch (error) {
        if (error instanceof AiError) throw error;
        throw new AiError('Falló la consulta a Gemini', error);
      }
    },
  };
}
