import React from "react";
import { Composition } from "remotion";
import { HowFridge } from "./HowFridge";
import { DURATION_IN_FRAMES, FPS } from "./data";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HowFridge"
        component={HowFridge}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
