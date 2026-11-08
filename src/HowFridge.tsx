import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  captionForFrame,
  CAPTIONS,
  DURATION_IN_FRAMES,
  FPS,
  LINES,
  NARR_FRAMES,
} from "./data";

// How It Is, Episode 1: How Does a Refrigerator Work?
// Remotion only, drawn in code with SVG. Clean 2D cartoon: bold black
// outlines, simple shapes, sharp corners, limited palette (paper, ink,
// slate) with hot orange and cold cyan accents. Confident and informative,
// not cute. 1920x1080, 30 fps. Captions: exact narration words in 3-word
// groups, pop-in spring, key words yellow, white bold text with thick
// black outline on a transparent background.

export const INK = "#16161A";
const PAPER = "#F2EFE9";
const SLATE = "#33507A";
const STEEL = "#9AA7B8";
const PANEL = "#DDE3EA";
const HOT = "#FF5D2E";
const WARM = "#FF9E2C";
const COLD = "#00A8CC";
const ICE = "#7FDBF0";
const YELLOW = "#FFD60A";
const GREEN = "#3FA34D";
const RED = "#D64545";

const OUTLINE =
  "3px 0 0 #000, -3px 0 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FONT = "Arial Black, Arial, Helvetica, sans-serif";
const BODY = "Arial, Helvetica, sans-serif";

const rnd = (i: number, seed = 0) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Scene frame ranges derived from LINES.
const sceneRange = (scene: number) => {
  const ls = LINES.filter((l) => l.scene === scene);
  return { start: ls[0].startFrame, end: ls[ls.length - 1].endFrame };
};
const SCENE_STARTS = [0, 1, 2, 3, 4, 5, 6, 7].map((s) => sceneRange(s).start);

// --- Shared bits -----------------------------------------------------------

const Bg: React.FC = () => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
    <rect x={0} y={0} width={1920} height={1080} fill={PAPER} />
    {Array.from({ length: 23 }).map((_, i) => (
      <line key={`v${i}`} x1={i * 84} y1={0} x2={i * 84} y2={1080} stroke={INK} strokeWidth={1} opacity={0.05} />
    ))}
    {Array.from({ length: 13 }).map((_, i) => (
      <line key={`h${i}`} x1={0} y1={i * 84} x2={1920} y2={i * 84} stroke={INK} strokeWidth={1} opacity={0.05} />
    ))}
  </svg>
);

const StepChip: React.FC<{ n?: string; title: string; color?: string }> = ({ n, title, color = SLATE }) => (
  <div style={{ position: "absolute", top: 44, left: 48, display: "flex", alignItems: "stretch", fontFamily: FONT }}>
    {n ? (
      <div style={{ backgroundColor: color, color: "white", fontSize: 40, padding: "10px 22px", border: `5px solid ${INK}`, borderRight: "none" }}>{n}</div>
    ) : null}
    <div style={{ backgroundColor: INK, color: "white", fontSize: 40, padding: "10px 26px", border: `5px solid ${INK}`, letterSpacing: 1 }}>{title}</div>
  </div>
);

const Tag: React.FC<{ x: number; y: number; text: string; fill?: string; size?: number }> = ({ x, y, text, fill = INK, size = 34 }) => {
  const w = text.length * size * 0.62 + 30;
  return (
    <g>
      <rect x={x} y={y} width={w} height={size + 22} fill={fill} stroke={INK} strokeWidth={4} />
      <text x={x + 15} y={y + size + 13} fill="white" fontSize={size} fontWeight={900} fontFamily={FONT}>{text}</text>
    </g>
  );
};

const Thermo: React.FC<{ x: number; y: number; level: number; color: string }> = ({ x, y, level, color }) => {
  const H = 300;
  return (
    <g>
      <rect x={x - 16} y={y} width={32} height={H} fill="white" stroke={INK} strokeWidth={6} />
      <rect x={x - 16} y={y + H * (1 - level)} width={32} height={H * level} fill={color} />
      <circle cx={x} cy={y + H + 26} r={34} fill={color} stroke={INK} strokeWidth={6} />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={x + 16} y1={y + H * t} x2={x + 34} y2={y + H * t} stroke={INK} strokeWidth={4} />
      ))}
    </g>
  );
};

const Gauge: React.FC<{ x: number; y: number; level: number; label: string }> = ({ x, y, level, label }) => {
  const ang = interpolate(level, [0, 1], [-120, 120]);
  const rad = ((ang - 90) * Math.PI) / 180;
  return (
    <g>
      <circle cx={x} cy={y} r={78} fill="white" stroke={INK} strokeWidth={7} />
      <line x1={x} y1={y} x2={x + Math.cos(rad) * 56} y2={y + Math.sin(rad) * 56} stroke={HOT} strokeWidth={8} strokeLinecap="square" />
      <circle cx={x} cy={y} r={10} fill={INK} />
      <text x={x} y={y + 118} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>{label}</text>
    </g>
  );
};

// The refrigerant loop diagram, reused in scenes 1 and 6.
const LoopDiagram: React.FC<{ frame: number; active: number; speed?: number; x?: number; y?: number; scale?: number }> = ({
  frame, active, speed = 2.2, x = 0, y = 0, scale = 1,
}) => {
  const X = 560, Y = 250, W = 820, H = 500;
  const per = 2 * (W + H);
  const dot = (i: number) => {
    let p = (frame * speed + i * (per / 14)) % per;
    if (p < W) return { cx: X + p, cy: Y };
    p -= W;
    if (p < H) return { cx: X + W, cy: Y + p };
    p -= H;
    if (p < W) return { cx: X + W - p, cy: Y + H };
    p -= W;
    return { cx: X, cy: Y + H - p };
  };
  const halo = (on: boolean) => (on ? YELLOW : "none");
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={X} y={Y} width={W} height={H} fill="none" stroke={SLATE} strokeWidth={26} />
      {Array.from({ length: 14 }).map((_, i) => {
        const d = dot(i);
        return <circle key={i} cx={d.cx} cy={d.cy} r={13} fill={WARM} stroke={INK} strokeWidth={4} />;
      })}
      {/* 1 compressor, bottom left */}
      <rect x={X - 70} y={Y + H - 62} width={124} height={124} fill={INK} stroke={halo(active === 0)} strokeWidth={10} />
      <circle cx={X - 8} cy={Y + H} r={34} fill="none" stroke="white" strokeWidth={8} />
      <text x={X - 8} y={Y + H + 108} fill={INK} fontSize={32} fontWeight={900} textAnchor="middle" fontFamily={FONT}>1 COMPRESSOR</text>
      {/* 2 condenser, top middle */}
      <path d={`M ${X + 250} ${Y} l 40 -52 l 56 52 l 56 -52 l 56 52 l 56 -52 l 56 52 l 40 -52`} fill="none" stroke={active === 1 ? HOT : SLATE} strokeWidth={16} />
      <rect x={X + 236} y={Y - 96} width={348} height={10} fill={halo(active === 1)} />
      <text x={X + 410} y={Y - 118} fill={INK} fontSize={32} fontWeight={900} textAnchor="middle" fontFamily={FONT}>2 CONDENSER</text>
      {/* 3 valve, right middle */}
      <polygon points={`${X + W},${Y + 190} ${X + W + 58},${Y + 250} ${X + W},${Y + 310} ${X + W - 58},${Y + 250}`} fill={WARM} stroke={halo(active === 2)} strokeWidth={8} />
      <text x={X + W + 8} y={Y + 392} fill={INK} fontSize={32} fontWeight={900} textAnchor="middle" fontFamily={FONT}>3 VALVE</text>
      {/* 4 evaporator, left middle */}
      <rect x={X - 58} y={Y + 168} width={116} height={164} fill={ICE} stroke={halo(active === 3)} strokeWidth={8} />
      <path d={`M ${X - 40} ${Y + 208} h 80 M ${X - 40} ${Y + 250} h 80 M ${X - 40} ${Y + 292} h 80`} stroke={SLATE} strokeWidth={9} />
      <text x={X} y={Y + 392} fill={INK} fontSize={32} fontWeight={900} textAnchor="middle" fontFamily={FONT}>4 EVAPORATOR</text>
      <text x={X + W / 2} y={Y + H / 2 + 16} fill={SLATE} fontSize={44} fontWeight={900} textAnchor="middle" fontFamily={FONT}>REFRIGERANT LOOP</text>
    </g>
  );
};

// --- Scenes ----------------------------------------------------------------

const SceneHook: React.FC<{ frame: number; local: number }> = ({ frame, local }) => {
  const stamp = spring({ frame: local - 96, fps: FPS, config: { damping: 10, stiffness: 200 } });
  const flow = (frame * 3) % 60;
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: "absolute", top: 64, left: 80, fontFamily: FONT, lineHeight: 1.04 }}>
        <div style={{ color: INK, fontSize: 96 }}>HOW DOES A FRIDGE</div>
        <div style={{ display: "inline-block", backgroundColor: YELLOW, color: INK, fontSize: 96, padding: "2px 18px", border: `6px solid ${INK}`, marginTop: 10 }}>ACTUALLY WORK?</div>
      </div>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {/* fridge front */}
        <rect x={300} y={330} width={430} height={660} fill={PANEL} stroke={INK} strokeWidth={8} />
        <line x1={300} y1={560} x2={730} y2={560} stroke={INK} strokeWidth={8} />
        <rect x={676} y={392} width={18} height={110} fill={INK} />
        <rect x={676} y={606} width={18} height={150} fill={INK} />
        <rect x={352} y={392} width={34} height={34} fill={HOT} stroke={INK} strokeWidth={4} />
        <rect x={404} y={392} width={34} height={34} fill={YELLOW} stroke={INK} strokeWidth={4} />
        <rect x={352} y={444} width={34} height={34} fill={COLD} stroke={INK} strokeWidth={4} />
        {[0, 1, 2].map((i) => (
          <line key={i} x1={352} y1={916 + i * 26} x2={678} y2={916 + i * 26} stroke={INK} strokeWidth={6} />
        ))}
        {/* heat dots inside, then escaping */}
        {Array.from({ length: 7 }).map((_, i) => {
          const t = ((frame * 0.012 + i / 7) % 1);
          const cx = mix(430 + rnd(i, 3) * 160, 1330, t);
          const cy = mix(430 + rnd(i, 5) * 90, 400 + Math.sin(t * 9 + i) * 40, t);
          return <circle key={i} cx={cx} cy={cy} r={13} fill={HOT} stroke={INK} strokeWidth={3} opacity={1 - t * 0.4} />;
        })}
        <path d="M 760 470 H 1300" stroke={HOT} strokeWidth={10} strokeDasharray={`26 18`} strokeDashoffset={-flow} />
        <polygon points="1300,446 1360,470 1300,494" fill={HOT} stroke={INK} strokeWidth={4} />
        <Tag x={1150} y={300} text="HEAT OUT" fill={HOT} />
        <Tag x={340} y={606} text="FOOD INSIDE" fill={SLATE} size={28} />
      </svg>
      <div style={{
        position: "absolute", right: 110, bottom: 210, transform: `rotate(-6deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
        opacity: stamp, border: `9px solid ${HOT}`, color: HOT, fontFamily: FONT, fontSize: 64,
        padding: "16px 30px", backgroundColor: PAPER,
      }}>IT MOVES HEAT!</div>
    </AbsoluteFill>
  );
};

const SceneFluid: React.FC<{ frame: number; local: number }> = ({ frame }) => {
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip title="THE KEY INGREDIENT" color={SLATE} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {/* canister */}
        <rect x={120} y={300} width={210} height={480} fill={PANEL} stroke={INK} strokeWidth={8} />
        <rect x={120} y={620} width={210} height={160} fill={ICE} stroke={INK} strokeWidth={8} />
        <rect x={185} y={248} width={80} height={52} fill={STEEL} stroke={INK} strokeWidth={6} />
        {Array.from({ length: 6 }).map((_, i) => {
          const by = 760 - ((frame * 2.4 + i * 62) % 130);
          return <circle key={i} cx={160 + rnd(i, 7) * 120} cy={by} r={9 + rnd(i, 8) * 6} fill="white" stroke={SLATE} strokeWidth={3} opacity={0.9} />;
        })}
        <text x={225} y={880} fill={INK} fontSize={36} fontWeight={900} textAnchor="middle" fontFamily={FONT}>REFRIGERANT</text>
        <LoopDiagram frame={frame} active={-1} />
        <Tag x={96} y={936} text="BOILS BELOW FREEZING" fill={COLD} size={30} />
      </svg>
      <div style={{ position: "absolute", right: 90, top: 150, width: 330, fontFamily: BODY }}>
        <ThermoSvgNote />
      </div>
    </AbsoluteFill>
  );
};

const ThermoSvgNote: React.FC = () => (
  <svg width={330} height={430} viewBox="0 0 330 430">
    <rect x={130} y={10} width={34} height={300} fill="white" stroke={INK} strokeWidth={6} />
    <rect x={130} y={240} width={34} height={70} fill={COLD} />
    <circle cx={147} cy={336} r={36} fill={COLD} stroke={INK} strokeWidth={6} />
    <text x={147} y={410} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>STAYS COLD</text>
  </svg>
);

const SceneCompressor: React.FC<{ frame: number; local: number; dur: number }> = ({ local, dur }) => {
  const squeeze = interpolate(local, [50, 150], [0, 1], CLAMP);
  const pistonX = mix(1010, 760, squeeze);
  const temp = squeeze;
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip n="STEP 1" title="THE COMPRESSOR: SQUEEZE" color={HOT} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {/* cylinder cutaway */}
        <rect x={330} y={360} width={980} height={330} fill="#E9EDF2" stroke={INK} strokeWidth={8} />
        <rect x={330} y={360} width={980} height={54} fill={STEEL} stroke={INK} strokeWidth={6} />
        {/* gas particles, compressed as piston moves */}
        {Array.from({ length: 26 }).map((_, i) => {
          const cx = 395 + rnd(i, 11) * Math.max(50, pistonX - 455);
          const cy = 450 + rnd(i, 12) * 200 + Math.sin(local * 0.3 + i) * 4;
          const hot = squeeze > 0.55;
          return <circle key={i} cx={Math.min(cx, pistonX - 26)} cy={cy} r={13} fill={hot ? HOT : SLATE} stroke={INK} strokeWidth={3} />;
        })}
        {/* piston, rod and crank wheel */}
        <rect x={pistonX} y={360} width={64} height={330} fill={INK} />
        <rect x={pistonX + 64} y={490} width={1362 - pistonX - 64} height={64} fill={STEEL} stroke={INK} strokeWidth={6} />
        <circle cx={1420} cy={522} r={58} fill={PANEL} stroke={INK} strokeWidth={7} />
        <line x1={1420} y1={522} x2={1420 + Math.cos(local * 0.24) * 40} y2={522 + Math.sin(local * 0.24) * 40} stroke={INK} strokeWidth={8} />
        <Tag x={330} y={236} text="GAS IN" fill={SLATE} />
        <Tag x={1240} y={236} text="HOT GAS OUT" fill={HOT} />
        <path d="M 1120 330 V 250" stroke={HOT} strokeWidth={12} />
        <polygon points="1102,252 1120,214 1138,252" fill={HOT} stroke={INK} strokeWidth={3} />
        <Gauge x={1620} y={430} level={squeeze} label="PRESSURE" />
        <Thermo x={1720} y={330} level={0.15 + temp * 0.8} color={HOT} />
        <text x={1720} y={760} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>TEMP</text>
        {local > dur * 0.62 ? <Tag x={560} y={790} text="SQUEEZE = PRESSURE UP = HEAT UP" fill={HOT} size={36} /> : null}
      </svg>
    </AbsoluteFill>
  );
};

const SceneCondenser: React.FC<{ frame: number; local: number; dur: number }> = ({ frame, local, dur }) => {
  const prog = interpolate(local, [20, dur - 10], [0, 1], CLAMP);
  const segColor = (i: number) => {
    const t = Math.max(0, Math.min(1, prog * 9 - i));
    const r = Math.round(mix(0xff, 0x33, t)), g = Math.round(mix(0x5d, 0x50, t)), b = Math.round(mix(0x2e, 0x7a, t));
    return `rgb(${r},${g},${b})`;
  };
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip n="STEP 2" title="THE CONDENSER: SHED THE HEAT" color={WARM} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <rect x={200} y={260} width={760} height={620} fill={PANEL} stroke={INK} strokeWidth={8} />
        <text x={580} y={322} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>BACK OF THE FRIDGE</text>
        {Array.from({ length: 8 }).map((_, i) => {
          const y = 380 + i * 62;
          return <line key={i} x1={i % 2 ? 880 : 280} y1={y} x2={i % 2 ? 280 : 880} y2={y} stroke={segColor(i)} strokeWidth={22} />;
        })}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`c${i}`} x1={i % 2 ? 280 : 880} y1={380 + i * 62} x2={i % 2 ? 280 : 880} y2={442 + i * 62} stroke={segColor(i)} strokeWidth={22} />
        ))}
        {/* heat waves escaping right */}
        {Array.from({ length: 5 }).map((_, i) => {
          const off = ((frame * 2 + i * 46) % 230);
          const x = 1010 + off;
          const y = 360 + i * 110;
          return (
            <path key={i} d={`M ${x} ${y} q 26 -34 0 -68 q -26 -34 0 -68`} fill="none" stroke={HOT} strokeWidth={9} opacity={1 - off / 240} />
          );
        })}
        <Tag x={1100} y={270} text="HEAT OUT TO THE ROOM" fill={HOT} />
        {/* liquid drops at exit */}
        {Array.from({ length: 4 }).map((_, i) => {
          const dy = ((frame * 3 + i * 40) % 120);
          return prog > 0.5 ? <path key={i} d={`M ${420 + i * 60} ${896 + dy} l 13 22 a 14 14 0 1 1 -26 0 Z`} fill={COLD} stroke={INK} strokeWidth={3} opacity={1 - dy / 130} /> : null;
        })}
        <Tag x={300} y={920} text="LIQUID OUT" fill={SLATE} />
        <Thermo x={1640} y={330} level={1 - prog * 0.72} color={WARM} />
        <text x={1640} y={760} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>COOLING</text>
      </svg>
    </AbsoluteFill>
  );
};

const SceneValve: React.FC<{ frame: number; local: number; dur: number }> = ({ frame, local, dur }) => {
  const cold = interpolate(local, [dur * 0.35, dur * 0.8], [0, 1], CLAMP);
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip n="STEP 3" title="THE EXPANSION VALVE: DROP THE PRESSURE" color={COLD} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {/* left high pressure pipe */}
        <rect x={120} y={450} width={700} height={130} fill="#E9EDF2" stroke={INK} strokeWidth={8} />
        {Array.from({ length: 9 }).map((_, i) => {
          const cx = 160 + ((frame * 5 + i * 82) % 640);
          return <circle key={i} cx={cx} cy={515 + Math.sin(i * 2.2) * 26} r={14} fill={SLATE} stroke={INK} strokeWidth={3} />;
        })}
        {/* valve block with tiny orifice */}
        <polygon points="820,400 960,492 960,538 820,630" fill={INK} />
        <polygon points="1080,400 940,492 940,538 1080,630" fill={INK} />
        <rect x={820} y={492} width={260} height={46} fill={INK} />
        <line x1={820} y1={515} x2={1080} y2={515} stroke={YELLOW} strokeWidth={7} />
        {/* right expansion chamber with spray */}
        <rect x={1080} y={380} width={720} height={270} fill="#EAF6FA" stroke={INK} strokeWidth={8} />
        {Array.from({ length: 22 }).map((_, i) => {
          const t = ((frame * 0.02 + rnd(i, 21)) % 1);
          const cx = 1100 + t * 640;
          const spread = t * 105;
          const cy = 515 + (rnd(i, 22) - 0.5) * 2 * spread + Math.sin(i * 3.1) * 12;
          return <circle key={i} cx={cx} cy={cy} r={10} fill={ICE} stroke={SLATE} strokeWidth={3} />;
        })}
        <Tag x={770} y={248} text="TINY OPENING" fill={INK} />
        <line x1={950} y1={300} x2={950} y2={470} stroke={INK} strokeWidth={5} />
        <Gauge x={330} y={790} level={0.92} label="PRESSURE IN" />
        <Gauge x={700} y={790} level={0.08} label="PRESSURE OUT" />
        {/* angular snowflake */}
        <g transform="translate(1420 830)" stroke={COLD} strokeWidth={11} strokeLinecap="square">
          {[0, 60, 120].map((a) => (
            <line key={a} x1={-64} y1={0} x2={64} y2={0} transform={`rotate(${a})`} />
          ))}
          <circle r={13} fill={COLD} stroke="none" />
        </g>
        <text x={1420} y={950} fill={INK} fontSize={32} fontWeight={900} textAnchor="middle" fontFamily={FONT}>BELOW FREEZING</text>
        <Thermo x={1700} y={330} level={interpolate(cold, [0, 1], [0.55, 0.06])} color={COLD} />
        <text x={1700} y={760} fill={INK} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>TEMP</text>
      </svg>
    </AbsoluteFill>
  );
};

const SceneEvaporator: React.FC<{ frame: number; local: number }> = ({ frame }) => {
  const foods = [
    { x: 470, y: 700 }, { x: 700, y: 700 }, { x: 950, y: 690 }, { x: 560, y: 470 }, { x: 880, y: 460 },
  ];
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip n="STEP 4" title="THE EVAPORATOR: ABSORB THE HEAT" color={SLATE} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {/* interior cutaway */}
        <rect x={280} y={210} width={940} height={740} fill="#EAF6FA" stroke={INK} strokeWidth={9} />
        <path d="M 330 300 h 840 M 330 330 h 840 M 330 360 h 840" stroke={COLD} strokeWidth={13} fill="none" />
        <Tag x={330} y={224} text="COLD COILS" fill={COLD} size={28} />
        <line x1={280} y1={580} x2={1220} y2={580} stroke={INK} strokeWidth={7} />
        <line x1={280} y1={800} x2={1220} y2={800} stroke={INK} strokeWidth={7} />
        {/* cold air swirls down */}
        {Array.from({ length: 4 }).map((_, i) => {
          const yy = 400 + ((frame * 2.2 + i * 90) % 300);
          return <path key={i} d={`M ${420 + i * 220} ${yy} q 30 26 60 0`} fill="none" stroke={COLD} strokeWidth={7} opacity={0.75} />;
        })}
        {/* food: milk carton, apple, cheese, jar, bottle */}
        <g stroke={INK} strokeWidth={6}>
          <rect x={420} y={640} width={110} height={160} fill="white" />
          <polygon points="420,640 475,592 530,640" fill={PANEL} />
          <text x={475} y={740} fill={INK} fontSize={27} fontWeight={900} textAnchor="middle" fontFamily={FONT} stroke="none">MILK</text>
          <circle cx={700} cy={726} r={56} fill={RED} />
          <line x1={700} y1={672} x2={712} y2={638} stroke={INK} strokeWidth={7} />
          <polygon points="880,800 1010,800 1010,724" fill={YELLOW} />
          <rect x={520} y={408} width={76} height={172} fill={GREEN} />
          <rect x={538} y={376} width={40} height={32} fill={STEEL} />
          <circle cx={900} cy={500} r={52} fill={WARM} />
          <line x1={900} y1={448} x2={900} y2={410} stroke={INK} strokeWidth={7} />
        </g>
        {/* heat dots travel from food up to coils */}
        {foods.map((f, fi) =>
          Array.from({ length: 2 }).map((_, k) => {
            const t = ((frame * 0.014 + fi * 0.21 + k * 0.5) % 1);
            const cx = mix(f.x, 420 + rnd(fi * 3 + k, 31) * 700, t);
            const cy = mix(f.y - 60, 330, t);
            return <circle key={`${fi}-${k}`} cx={cx} cy={cy} r={12} fill={HOT} stroke={INK} strokeWidth={3} opacity={1 - t * 0.35} />;
          })
        )}
        {/* return pipe */}
        <rect x={1310} y={260} width={90} height={620} fill="#E9EDF2" stroke={INK} strokeWidth={7} />
        {Array.from({ length: 6 }).map((_, i) => {
          const cy = 300 + ((frame * 4 + i * 105) % 540);
          return <circle key={i} cx={1355} cy={cy} r={13} fill={WARM} stroke={INK} strokeWidth={3} />;
        })}
        <Tag x={1270} y={920} text="GAS BACK TO START" fill={WARM} size={30} />
      </svg>
    </AbsoluteFill>
  );
};

const SceneLoop: React.FC<{ frame: number; local: number }> = ({ frame, local }) => {
  const active = Math.floor(local / 26) % 4;
  const cycles = Math.min(99, Math.floor(local * 1.1));
  return (
    <AbsoluteFill>
      <Bg />
      <StepChip title="THE LOOP REPEATS" color={SLATE} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        <LoopDiagram frame={frame} active={active} speed={7} x={-160} y={60} />
      </svg>
      <div style={{ position: "absolute", right: 90, top: 330, textAlign: "center", fontFamily: FONT }}>
        <div style={{ color: INK, fontSize: 44 }}>CYCLES TODAY</div>
        <div style={{ color: HOT, fontSize: 170, lineHeight: 1.05 }}>{cycles}</div>
        <div style={{ color: SLATE, fontSize: 38, marginTop: 8 }}>AND COUNTING</div>
      </div>
    </AbsoluteFill>
  );
};

const SceneRecap: React.FC<{ local: number }> = ({ local }) => {
  const chips = [
    { n: "1", t: "SQUEEZE IT", c: HOT },
    { n: "2", t: "SHED THE HEAT", c: WARM },
    { n: "3", t: "EXPAND IT", c: COLD },
    { n: "4", t: "ABSORB THE HEAT", c: SLATE },
  ];
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: "absolute", top: 90, left: 0, width: 1920, textAlign: "center", fontFamily: FONT, color: INK, fontSize: 84 }}>REMEMBER THE LOOP</div>
      <div style={{ position: "absolute", top: 300, left: 0, width: 1920, display: "flex", justifyContent: "center", gap: 16 }}>
        {chips.map((ch, i) => {
          const s = spring({ frame: local - 14 - i * 16, fps: FPS, config: { damping: 11, stiffness: 190 } });
          return (
            <React.Fragment key={ch.n}>
              <div style={{
                transform: `scale(${s})`, opacity: s, display: "flex", alignItems: "center", gap: 13,
                backgroundColor: "white", border: `6px solid ${INK}`, padding: "18px 18px", fontFamily: FONT,
              }}>
                <div style={{ backgroundColor: ch.c, color: "white", fontSize: 36, padding: "4px 14px", border: `4px solid ${INK}` }}>{ch.n}</div>
                <div style={{ color: INK, fontSize: 35, whiteSpace: "nowrap" }}>{ch.t}</div>
              </div>
              {i < 3 ? <div style={{ alignSelf: "center", fontSize: 42, color: INK, fontFamily: FONT }}>→</div> : null}
            </React.Fragment>
          );
        })}
      </div>
      {local > 118 ? (
        <div style={{ position: "absolute", top: 560, left: 0, width: 1920, textAlign: "center", fontFamily: FONT, lineHeight: 1.2 }}>
          <div style={{ color: INK, fontSize: 76 }}>YOUR FRIDGE IS NOT A <span style={{ color: COLD }}>COLD MAKER</span>.</div>
          <div style={{ color: INK, fontSize: 76 }}>IT IS A <span style={{ color: HOT }}>HEAT MOVER</span>.</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// --- Captions, end card, main ----------------------------------------------

const HIGHLIGHT = new Set([
  "COLD.", "COLD", "HEAT.", "HEAT", "REFRIGERANT.", "REFRIGERANT", "COMPRESSOR.", "COMPRESSOR",
  "PRESSURE,", "PRESSURE", "CONDENSER.", "CONDENSER", "EXPANSION", "VALVE.", "VALVE",
  "EVAPORATOR.", "EVAPORATOR", "SQUEEZE", "SQUEEZES", "LOOP", "LOOP.", "FREEZING.", "FREEZING",
  "GAS.", "GAS", "LIQUID.", "LIQUID",
]);

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const cue = captionForFrame(frame);
  if (!cue) return null;
  const pop = spring({ frame: frame - cue.startFrame, fps: FPS, config: { damping: 11, stiffness: 230 } });
  const scale = interpolate(pop, [0, 1], [0.65, 1]);
  return (
    <div style={{ position: "absolute", left: 0, width: 1920, bottom: 54, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        maxWidth: 1560, transform: `scale(${scale})`, color: "white", fontSize: 58, fontWeight: 900,
        fontFamily: FONT, lineHeight: 1.22, textAlign: "center", textShadow: OUTLINE,
      }}>
        {cue.text.split(" ").map((w, i) => (
          <span key={i} style={{ color: HIGHLIGHT.has(w) ? YELLOW : "white" }}>{w} </span>
        ))}
      </div>
    </div>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK, justifyContent: "center", alignItems: "center" }}>
    <div style={{ textAlign: "center", fontFamily: FONT }}>
      <div style={{ color: "white", fontSize: 130, letterSpacing: 2 }}>HOW IT IS</div>
      <div style={{ width: 560, height: 14, backgroundColor: YELLOW, margin: "26px auto" }} />
      <div style={{ color: ICE, fontSize: 52 }}>HOW DOES A FRIDGE WORK?</div>
      <div style={{ color: "white", fontSize: 40, marginTop: 54 }}>SQUEEZE → SHED → EXPAND → ABSORB</div>
      <div style={{
        display: "inline-block", marginTop: 64, backgroundColor: HOT, color: "white", fontSize: 44,
        padding: "16px 44px", border: "6px solid white",
      }}>SUBSCRIBE FOR MORE</div>
    </div>
  </AbsoluteFill>
);

export const HowFridge: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= NARR_FRAMES) return <EndCard />;
  const line = LINES.find((l) => frame >= l.startFrame && frame < l.endFrame) ?? LINES[LINES.length - 1];
  const scene = line.scene;
  const start = SCENE_STARTS[scene];
  const end = scene < 7 ? SCENE_STARTS[scene + 1] : NARR_FRAMES;
  const local = frame - start;
  const dur = end - start;
  const enter = interpolate(local, [0, 9], [0, 1], CLAMP);
  const slide = interpolate(local, [0, 9], [48, 0], CLAMP);
  const progress = frame / DURATION_IN_FRAMES;
  void CAPTIONS;
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Audio src={staticFile("assets/narration.mp3")} />
      <div style={{ position: "absolute", inset: 0, opacity: enter, transform: `translateX(${slide}px)` }}>
        {scene === 0 ? <SceneHook frame={frame} local={local} /> : null}
        {scene === 1 ? <SceneFluid frame={frame} local={local} /> : null}
        {scene === 2 ? <SceneCompressor frame={frame} local={local} dur={dur} /> : null}
        {scene === 3 ? <SceneCondenser frame={frame} local={local} dur={dur} /> : null}
        {scene === 4 ? <SceneValve frame={frame} local={local} dur={dur} /> : null}
        {scene === 5 ? <SceneEvaporator frame={frame} local={local} /> : null}
        {scene === 6 ? <SceneLoop frame={frame} local={local} /> : null}
        {scene === 7 ? <SceneRecap local={local} /> : null}
      </div>
      <Caption frame={frame} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1920, height: 12, backgroundColor: "rgba(0,0,0,0.15)" }}>
        <div style={{ width: progress * 1920, height: 12, backgroundColor: SLATE }} />
      </div>
    </AbsoluteFill>
  );
};
