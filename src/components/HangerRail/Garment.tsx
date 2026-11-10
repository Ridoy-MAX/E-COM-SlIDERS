import { useId } from "react";

export type GarmentKind = "tee" | "sweater" | "hoodie" | "jacket" | "coat" | "shirt";

/** Garment artwork is drawn in a 160 x 280 box. The hook top (rail contact) is at (80, 7). */
export const GARMENT_VIEWBOX = { w: 160, h: 280, pivotX: 80, pivotY: 7 };

const SHORT_SLEEVE =
  "M62 52 Q80 64 98 52 L128 59 L152 97 L134 107 L128 99 L128 212 Q80 218 32 212 L32 99 L26 107 L8 97 L32 59 Z";
const LONG_SLEEVE = (hem: number) =>
  `M62 52 Q80 64 98 52 L128 58 Q144 63 146 85 L150 206 L134 208 L128 118 L128 ${hem} Q80 ${hem + 6} 32 ${hem} L32 118 L26 208 L10 206 L14 85 Q16 63 32 58 Z`;
const COAT =
  "M62 52 Q80 64 98 52 L130 58 Q146 63 148 85 L152 214 L136 216 L130 120 L134 262 Q80 268 26 262 L30 120 L24 216 L8 214 L12 85 Q14 63 30 58 Z";

const BODY: Record<GarmentKind, string> = {
  tee: SHORT_SLEEVE,
  sweater: LONG_SLEEVE(214),
  hoodie: LONG_SLEEVE(216),
  jacket: LONG_SLEEVE(206),
  shirt: LONG_SLEEVE(214),
  coat: COAT,
};

/** Approximate distance (px in the 280-high box) from hook to centre of mass. Longer = slower swing. */
export const GARMENT_LENGTH: Record<GarmentKind, number> = {
  tee: 125,
  sweater: 135,
  hoodie: 138,
  jacket: 130,
  shirt: 135,
  coat: 160,
};

type Props = { kind: GarmentKind; color: string; image?: string; alt: string; hanger?: "wire" | "wood" };

export default function Garment({ kind, color, image, alt, hanger = "wire" }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `clip-${uid}`;
  const shade = `shade-${uid}`;
  const wood = `wood-${uid}`;
  const body = BODY[kind];
  const line = "rgba(0,0,0,0.22)";
  const ink = "rgba(0,0,0,0.14)";

  return (
    <svg
      viewBox={`0 0 ${GARMENT_VIEWBOX.w} ${GARMENT_VIEWBOX.h}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={alt}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
        <linearGradient id={shade} x1="0" x2="1" y1="0" y2="0.25">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={wood} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e2b57c" />
          <stop offset="1" stopColor="#b47c45" />
        </linearGradient>
      </defs>

      {hanger === "wood" ? (
        // wooden hanger: metal hook + curved wooden shoulders
        <g>
          <path d="M80 40 V22 C80 14 73 12 73 7 C73 1 87 1 87 7" fill="none" stroke="#8b9097" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 66 Q80 32 142 66" fill="none" stroke={`url(#${wood})`} strokeWidth="8" strokeLinecap="round" />
          <rect x="74" y="36" width="12" height="9" rx="2.5" fill="#c08a52" />
        </g>
      ) : (
        // wire hanger: hook over the rail + shoulders
        <g fill="none" stroke="#7d828b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M80 40 V22 C80 14 73 12 73 7 C73 1 87 1 87 7" />
          <path d="M80 40 L30 60 L130 60 Z" />
        </g>
      )}

      {image ? (
        // Real product photo (transparent PNG works best), placed under the hook.
        <image href={image} x="0" y="44" width="160" height="230" preserveAspectRatio="xMidYMin meet" />
      ) : (
        <>
          {kind === "hoodie" && (
            <path d="M56 56 Q52 26 80 24 Q108 26 104 56 Q80 70 56 56 Z" fill={color} stroke={line} />
          )}
          {kind === "hoodie" && <path d="M56 56 Q52 26 80 24 Q108 26 104 56 Q80 70 56 56 Z" fill="#000" opacity="0.18" />}

          <path d={body} fill={color} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />

          <g clipPath={`url(#${clip})`}>
            <rect width="160" height="280" fill={`url(#${shade})`} />
            {/* soft folds */}
            <path d="M58 120 Q62 170 56 220 M104 110 Q98 170 106 230" stroke="#000" strokeOpacity="0.06" strokeWidth="6" fill="none" />
            {(kind === "sweater" || kind === "hoodie") && (
              <>
                <rect x="0" y={kind === "hoodie" ? 202 : 200} width="160" height="16" fill="#000" opacity="0.1" />
                <path d="M10 196 H28 M132 196 H150" stroke="#000" strokeOpacity="0.15" strokeWidth="10" />
              </>
            )}
          </g>

          {kind === "tee" && <path d="M62 52 Q80 66 98 52" fill="none" stroke={line} strokeWidth="3" />}
          {kind === "sweater" && <path d="M62 52 Q80 68 98 52" fill="none" stroke={ink} strokeWidth="5" />}

          {kind === "hoodie" && (
            <>
              <path d="M64 52 Q80 76 96 52" fill="none" stroke={line} strokeWidth="2" />
              <path d="M50 170 L110 170 L120 204 L40 204 Z" fill="#000" opacity="0.08" stroke={ink} />
              <path d="M74 64 L72 108 M86 64 L88 108" stroke="#f2f2f2" strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {kind === "jacket" && (
            <>
              <path d="M62 52 L70 42 L80 60 L90 42 L98 52" fill={color} stroke={line} />
              <path d="M80 60 V206" stroke="#000" strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="2 2" />
              <path d="M44 150 L60 140 M116 150 L100 140" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          {kind === "shirt" && (
            <>
              <path d="M62 52 L66 68 L80 59 L94 68 L98 52 Q80 62 62 52 Z" fill={color} stroke={line} />
              <path d="M80 60 V214" stroke={ink} strokeWidth="1.5" />
              {[84, 112, 140, 168, 196].map((y) => (
                <circle key={y} cx="84" cy={y} r="1.8" fill="#000" opacity="0.35" />
              ))}
              <path d="M44 92 h18 v16 h-18 z" fill="none" stroke={ink} />
            </>
          )}

          {kind === "coat" && (
            <>
              <path d="M62 52 L80 116 L98 52" fill="none" stroke={line} strokeWidth="1.5" />
              <path d="M62 52 L52 74 L68 88 L80 116 L92 88 L108 74 L98 52" fill="#000" fillOpacity="0.07" stroke={line} />
              <rect x="30" y="160" width="104" height="9" fill="#000" opacity="0.14" />
              {[132, 190, 222].map((y) => (
                <circle key={y} cx="88" cy={y} r="2.6" fill="#000" opacity="0.4" />
              ))}
            </>
          )}
        </>
      )}
    </svg>
  );
}
