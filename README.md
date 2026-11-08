# How It Is: How Does a Refrigerator Work?

Episode 1 of How It Is, a YouTube channel about how things work.
An animated explainer built and rendered only with Remotion.
1920x1080, 30 fps, about 80 seconds.

Style: clean 2D cartoon drawn in code with SVG. Bold black outlines,
simple shapes, sharp corners, limited palette (paper, ink, slate blue)
with hot orange and cold cyan accents. Confident and informative,
not cute or childish.

Structure: strong hook (your fridge never makes cold, it moves heat),
then the four step refrigeration loop with animated diagrams, labels
and cutaways, then a recap end card.

1. The compressor squeezes the refrigerant gas, pressure and heat rise.
2. The condenser sheds that heat into the room, gas becomes liquid.
3. The expansion valve drops the pressure, liquid gets below freezing.
4. The evaporator absorbs heat from the food, liquid boils back to gas.

Narration is plain language, captions match the narration word for
word in 3 word groups, pop in with a spring, key words in yellow,
white bold text with a thick black outline, transparent background.

## Assets to add

GitHub only carries the code. Drop this file into `public/assets/`
before rendering:

- `narration.mp3` (Helio voice, 77.6 seconds)

Everything visual is drawn in code, there are no image assets.

## Render

```bash
npm install
npx remotion render HowFridge out/how-a-fridge-works.mp4
```

- `script.md` holds the exact narration and scene plan.
- `src/data.ts` holds the timing: scene and caption frames are
  proportional to word count against the measured audio duration.
- `src/HowFridge.tsx` holds all scenes, diagrams and captions.
