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

// ============================================================
// Vinheta de abertura de 8s (240 frames @ 30fps) - 1080x1920
// Motion graphics de marca, NAO e o candidato falando.
// O selo do TSE (conteudo com IA) e obrigatorio e fica sempre visivel.
//
// Elementos:
//   - Fundo aurora animado (orbs que se movem + hue-shift)
//   - Foto do candidato com fundo removido (rembg) + Ken Burns + halo
//   - Logo com pop-in
//   - 2 textos animados: nome (slide-up + letter-spacing) e mensagem (word reveal)
//   - Jingle de audio com fade in/out
// ============================================================

const DURATION = 240; // 8s @ 30fps

const hexToRgba = (hex, alpha = 1) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ---------- Fundo aurora animado ----------
const AuroraBackground = ({ corPrimaria }) => {
  const frame = useCurrentFrame();

  // Hue-shift sutil do gradiente base
  const hueShift = interpolate(frame, [0, DURATION], [0, 30], {
    extrapolateRight: "clamp",
  });

  // Orbs flutuantes (parallax vertical + pulsacao)
  const orbA = interpolate(frame, [0, DURATION], [0, 180], {
    extrapolateRight: "clamp",
  });
  const orbB = interpolate(frame, [0, DURATION], [0, -140], {
    extrapolateRight: "clamp",
  });
  const pulse = 1 + Math.sin(frame / 24) * 0.06;

  return (
    <AbsoluteFill>
      {/* Gradiente base */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(155deg, ${corPrimaria} 0%, #0a0f1f 62%)`,
          filter: `hue-rotate(${hueShift}deg)`,
        }}
      />
      {/* Orb 1 (cor primaria, grande) */}
      <AbsoluteFill
        style={{
          left: "-20%",
          top: "8%",
          width: "70%",
          height: "42%",
          transform: `translateY(${orbA * 0.35}px) scale(${pulse})`,
          background: `radial-gradient(circle, ${hexToRgba(
            corPrimaria,
            0.55
          )} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      {/* Orb 2 (claro, brilho) */}
      <AbsoluteFill
        style={{
          right: "-25%",
          top: "38%",
          width: "80%",
          height: "55%",
          transform: `translateY(${orbB * 0.3}px) scale(${1 / pulse})`,
          background:
            "radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 65%)",
          filter: "blur(48px)",
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Foto com Ken Burns + halo (fundo removido) ----------
const Photo = ({ fotoPath, corPrimaria }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Entrada com spring (desliza da direita)
  const slideIn = spring({ frame, fps, config: { damping: 16, stiffness: 70 } });
  const photoX = interpolate(slideIn, [0, 1], [width * 0.45, 0]);

  // Ken Burns: zoom sutil continuo
  const zoom = interpolate(frame, [0, DURATION], [1.04, 1.16], {
    extrapolateRight: "clamp",
  });

  // Halo atras da foto (brilho na cor primaria) - fica bem com fundo removido
  const glow = spring({ frame: frame - 8, fps, config: { damping: 20 } });

  if (!fotoPath) {
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
        <div
          style={{
            height: "70%",
            width: "52%",
            transform: `translateX(${photoX}px)`,
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
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-end" }}>
      {/* Halo de brilho atras da silhueta */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-end",
          opacity: glow,
        }}
      >
        <div
          style={{
            width: "78%",
            height: "68%",
            marginRight: "-6%",
            marginBottom: "-4%",
            background: `radial-gradient(ellipse at center, ${hexToRgba(
              corPrimaria,
              0.5
            )} 0%, transparent 68%)`,
            filter: "blur(34px)",
          }}
        />
      </AbsoluteFill>

      {/* Foto (transparente, com Ken Burns) */}
      <Img
        src={staticFile(fotoPath)}
        style={{
          height: "88%",
          transform: `translateX(${photoX}px) scale(${zoom})`,
          objectFit: "contain",
          filter: `drop-shadow(0 30px 40px rgba(0,0,0,0.5))`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Logo com pop-in ----------
const Logo = ({ logoPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 25, fps, config: { damping: 12, stiffness: 160 } });
  const scale = interpolate(pop, [0, 1], [0.4, 1]);

  if (!logoPath) return null;
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity: pop,
        height: 110,
        display: "flex",
        alignItems: "center",
        marginRight: 24,
        filter: `drop-shadow(0 6px 18px rgba(0,0,0,0.45))`,
      }}
    >
      <Img src={staticFile(logoPath)} style={{ height: "100%" }} />
    </div>
  );
};

// ---------- Numero com pop ----------
const Numero = ({ numero, corPrimaria }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 32, fps, config: { damping: 14, stiffness: 150 } });
  const scale = interpolate(pop, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity: pop,
        fontSize: 88,
        fontWeight: 900,
        color: "#fff",
        lineHeight: 1,
        fontFamily: "sans-serif",
        padding: "8px 26px",
        borderRadius: 20,
        background: hexToRgba(corPrimaria, 0.28),
        border: `3px solid ${hexToRgba(corPrimaria, 0.9)}`,
        boxShadow: `0 10px 34px ${hexToRgba(corPrimaria, 0.45)}`,
      }}
    >
      {numero}
    </div>
  );
};

// ---------- Texto 1: Nome (slide-up + letter-spacing) ----------
const AnimatedName = ({ nome }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const up = spring({ frame: frame - 38, fps, config: { damping: 16, stiffness: 90 } });
  const y = interpolate(up, [0, 1], [90, 0]);
  const letterSpacing = interpolate(up, [0, 1], [14, 0]);
  const opacity = interpolate(up, [0, 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize: 92,
        fontWeight: 900,
        color: "#fff",
        lineHeight: 1.05,
        letterSpacing,
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: "sans-serif",
        textShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {nome}
    </div>
  );
};

// ---------- Texto 2: Mensagem (word-by-word reveal) ----------
const AnimatedMessage = ({ mensagem }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = String(mensagem).split(" ");
  return (
    <div
      style={{
        fontSize: 44,
        fontWeight: 600,
        color: "#e6ecff",
        marginTop: 20,
        lineHeight: 1.3,
        maxWidth: 760,
        fontFamily: "sans-serif",
      }}
    >
      {words.map((word, i) => {
        const p = spring({
          frame: frame - (48 + i * 3),
          fps,
          config: { damping: 15, stiffness: 130 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)`,
              marginRight: 10,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Selo TSE (obrigatorio) ----------
const TSESeal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame: frame - 60, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: 32, opacity: fadeIn }}>
      <div
        style={{
          fontSize: 22,
          color: "#ffffffcc",
          alignSelf: "flex-start",
          background: "#00000066",
          padding: "6px 14px",
          borderRadius: 8,
          fontFamily: "sans-serif",
        }}
      >
        Conteudo produzido com uso de inteligencia artificial
      </div>
    </AbsoluteFill>
  );
};

// ---------- Componente principal ----------
export const Intro = ({
  nome,
  numero,
  mensagem,
  corPrimaria,
  fotoPath,
  logoPath,
  audioPath = "",
}) => {
  const frame = useCurrentFrame();

  // Fade out geral no fim (para dar transicao limpa)
  const fadeOut = interpolate(frame, [DURATION - 30, DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Envelope de volume do jingle: fade in (0.4s) + fade out (0.7s)
  const audioVolume = interpolate(
    frame,
    [0, 12, DURATION - 22, DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity: fadeOut, fontFamily: "sans-serif" }}>
      <AuroraBackground corPrimaria={corPrimaria} />
      <Photo fotoPath={fotoPath} corPrimaria={corPrimaria} />

      {/* Bloco de conteudo (logo + numero + textos) */}
      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "flex-end",
          paddingBottom: 110,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 26,
          }}
        >
          <Logo logoPath={logoPath} />
          <Numero numero={numero} corPrimaria={corPrimaria} />
        </div>
        <AnimatedName nome={nome} />
        <AnimatedMessage mensagem={mensagem} />
      </AbsoluteFill>

      {/* Audio do jingle (opcional) */}
      {audioPath ? (
        <Audio src={staticFile(audioPath)} volume={audioVolume} />
      ) : null}

      <TSESeal />
    </AbsoluteFill>
  );
};
