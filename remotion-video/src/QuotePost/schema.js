import { z } from "zod";

export const quotePostSchema = z.object({
  nome: z.string(),
  numero: z.string(),
  partido: z.string().optional().default(""),
  citacao: z.string(),
  autoridadeOuTema: z.string().optional().default("PROPOSTA DE LEI"),
  corPrimaria: z.string().default("#1b6ef3"),
  fotoPath: z.string().optional().default(""),
  logoPath: z.string().optional().default(""),
  audioPath: z.string().optional().default(""),
});

export const quotePostDefaults = {
  nome: "Deputado Exemplo",
  numero: "12345",
  partido: "DF",
  citacao: "A educação é a única ferramenta capaz de transformar o Distrito Federal de forma permanente.",
  autoridadeOuTema: "COMPROMISSO COM O DF",
  corPrimaria: "#1b6ef3",
  fotoPath: "",
  logoPath: "",
  audioPath: "",
};
