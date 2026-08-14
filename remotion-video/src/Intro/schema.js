import { z } from "zod";

// O schema faz os campos aparecerem editaveis na barra lateral do Studio,
// e valida os props que o batch injeta por candidato.
export const introSchema = z.object({
  nome: z.string(),
  numero: z.string(),
  mensagem: z.string(),
  corPrimaria: z.string(),
  // Caminhos relativos a public/. Deixe vazio para ver o placeholder no mock.
  fotoPath: z.string().optional().default(""),
  logoPath: z.string().optional().default(""),
  // Jingle de audio (mp3/wav) por deputado, relativo a public/. Opcional.
  audioPath: z.string().optional().default(""),
});

export const introDefaults = {
  nome: "Dr. Gutemberg",
  numero: "12345",
  mensagem: "Por uma cidade melhor",
  corPrimaria: "#1b6ef3",
  fotoPath: "",
  logoPath: "",
  audioPath: "",
};
