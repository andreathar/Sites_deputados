import "./index.css";
import { Composition } from "remotion";
import { Intro } from "./Intro/Intro";
import { introSchema, introDefaults } from "./Intro/schema";

// Cada <Composition> vira uma entrada na barra lateral do Studio.
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={150} // 5s @ 30fps
        fps={30}
        width={1080}
        height={1920} // vertical, para reels/stories
        schema={introSchema}
        defaultProps={introDefaults}
      />
    </>
  );
};
