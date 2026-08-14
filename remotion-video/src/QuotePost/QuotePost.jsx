import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
});

const DURATION = 240; // 8s @ 30fps

const hexToRgba = (hex, alpha = 1) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const QuotePost = ({
  nome,
  numero,
  partido = "",
  citacao,
  autoridadeOuTema = "COMPROMISSO COM O DF",
  corPrimaria = "#1b6ef3",
  fotoPath = "",
  logoPath = "",
  audioPath = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animação de entrada da frase (word by word com spring)
  const words = String(citacao).split(" ");

  // Entrada do Badge do Tema
  const badgeSpring = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const badgeY = interpolate(badgeSpring, [0, 1], [-40, 0]);

  // Animação da Foto
  const photoSpring = spring({ frame: frame - 5, fps, config: { damping: 18 } });
  const photoScale = interpolate(photoSpring, [0, 1], [0.85, 1]);

  // Fade out no final
  const fadeOut = interpolate(frame, [DURATION - 25, DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, fontFamily, backgroundColor: "#0b0f19" }}>
      {/* Background dinâmico com iluminação sutil */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 80% 20%, ${hexToRgba(
            corPrimaria,
            0.35
          )} 0%, transparent 60%), linear-gradient(180deg, #0d1322 0%, #060911 100%)`,
        }}
      />

      {/* Aspas decorativas em segundo plano */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 60,
          fontSize: 320,
          lineHeight: 0.8,
          fontWeight: 900,
          color: hexToRgba(corPrimaria, 0.15),
          userSelect: "none",
        }}
      >
        “
      </div>

      {/* Foto do candidato na lateral direita com brilho de fundo */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
        {/* Glow halo */}
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            right: "-5%",
            width: 600,
            height: 700,
            background: `radial-gradient(circle, ${hexToRgba(
              corPrimaria,
              0.4
            )} 0%, transparent 70%)`,
            filter: "blur(50px)",
          }}
        />

        {fotoPath ? (
          <Img
            src={staticFile(fotoPath)}
            style={{
              height: "75%",
              transform: `scale(${photoScale})`,
              objectFit: "contain",
              filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.6))",
            }}
          />
        ) : null}
      </AbsoluteFill>

      {/* Conteúdo da Citação */}
      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          maxWidth: 780,
        }}
      >
        {/* Badge / Tema */}
        <div
          style={{
            transform: `translateY(${badgeY}px)`,
            opacity: badgeSpring,
            alignSelf: "flex-start",
            padding: "8px 20px",
            borderRadius: 30,
            backgroundColor: hexToRgba(corPrimaria, 0.2),
            border: `2px solid ${hexToRgba(corPrimaria, 0.8)}`,
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 40,
          }}
        >
          {autoridadeOuTema.toUpperCase()}
        </div>

        {/* Texto da Citação */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.35,
            textShadow: "0 4px 20px rgba(0,0,0,0.8)",
          }}
        >
          {words.map((word, i) => {
            const wordSpring = spring({
              frame: frame - (20 + i * 2),
              fps,
              config: { damping: 14 },
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: wordSpring,
                  transform: `translateY(${interpolate(
                    wordSpring,
                    [0, 1],
                    [20, 0]
                  )}px)`,
                  marginRight: 12,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Autor da Citação */}
        <div
          style={{
            marginTop: 50,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 6,
              height: 60,
              backgroundColor: corPrimaria,
              borderRadius: 3,
            }}
          />
          <div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>
              {nome}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#a0aec0" }}>
              {numero ? `Deputado • ${numero}` : partido}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Selo TSE Obrigatório */}
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 40 }}>
        <div
          style={{
            fontSize: 20,
            color: "#ffffffaa",
            background: "#00000088",
            padding: "6px 16px",
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          Conteúdo produzido com uso de inteligência artificial
        </div>
      </AbsoluteFill>

      {/* Jingle de Fundo (Opcional) */}
      {audioPath ? <Audio src={staticFile(audioPath)} volume={0.6} /> : null}
    </AbsoluteFill>
  );
};
