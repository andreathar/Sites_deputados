import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Vinheta de abertura de 5s: foto + background animado + logo + numero + mensagem.
// NAO e o candidato falando: e motion graphics. Serve de intro ao video real.
// O selo do TSE (conteudo com IA) e obrigatorio e fica sempre visivel.
export const Intro = ({
  nome,
  numero,
  mensagem,
  corPrimaria,
  fotoPath,
  logoPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const bgShift = interpolate(frame, [0, 150], [0, 40]);
  const fotoIn = spring({ frame, fps, config: { damping: 18 } });
  const fotoX = interpolate(fotoIn, [0, 1], [width * 0.4, 0]);
  const txtIn = spring({ frame: frame - 15, fps, config: { damping: 20 } });
  const txtY = interpolate(txtIn, [0, 1], [40, 0]);
  const fadeOut = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, fontFamily: "sans-serif" }}>
      {/* Fundo animado */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${120 + bgShift}deg, ${corPrimaria}, #0a0f1f)`,
        }}
      />

      {/* Foto do candidato (ou placeholder se ainda nao houver asset) */}
      <AbsoluteFill
        style={{ justifyContent: "flex-end", alignItems: "flex-end" }}
      >
        {fotoPath ? (
          <Img
            src={staticFile(fotoPath)}
            style={{
              height: "92%",
              transform: `translateX(${fotoX}px)`,
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              height: "70%",
              width: "52%",
              transform: `translateX(${fotoX}px)`,
              background: "#ffffff14",
              border: "2px dashed #ffffff55",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffffaa",
              fontSize: 30,
            }}
          >
            foto do candidato
          </div>
        )}
      </AbsoluteFill>

      {/* Bloco de texto */}
      <AbsoluteFill
        style={{
          padding: 90,
          justifyContent: "center",
          transform: `translateY(${txtY}px)`,
          opacity: txtIn,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 20,
          }}
        >
          {logoPath ? (
            <Img src={staticFile(logoPath)} style={{ height: 110 }} />
          ) : (
            <div
              style={{
                height: 110,
                width: 110,
                borderRadius: 16,
                background: "#ffffff22",
                border: "2px dashed #ffffff55",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffffaa",
                fontSize: 20,
              }}
            >
              logo
            </div>
          )}
          <div
            style={{ fontSize: 84, fontWeight: 800, color: "#fff", lineHeight: 1 }}
          >
            {numero}
          </div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, color: "#fff" }}>{nome}</div>
        <div style={{ fontSize: 40, color: "#dbe4ff", marginTop: 12 }}>
          {mensagem}
        </div>
      </AbsoluteFill>

      {/* Selo TSE obrigatorio */}
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 32 }}>
        <div
          style={{
            fontSize: 22,
            color: "#ffffffcc",
            alignSelf: "flex-start",
            background: "#00000055",
            padding: "6px 14px",
            borderRadius: 8,
          }}
        >
          Conteudo produzido com uso de inteligencia artificial
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
