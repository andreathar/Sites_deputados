import "./index.css";
import { Composition } from "remotion";
import { Intro } from "./Intro/Intro";
import { introSchema, introDefaults } from "./Intro/schema";
import { QuotePost } from "./QuotePost/QuotePost";
import { quotePostSchema, quotePostDefaults } from "./QuotePost/schema";

// Cada <Composition> vira uma entrada na barra lateral do Studio.
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={240} // 8s @ 30fps
        fps={30}
        width={1080}
        height={1920} // vertical, para reels/stories
        schema={introSchema}
        defaultProps={introDefaults}
      />
      <Composition
        id="QuotePost"
        component={QuotePost}
        durationInFrames={240} // 8s @ 30fps
        fps={30}
        width={1080}
        height={1920} // vertical, para reels/stories
        schema={quotePostSchema}
        defaultProps={quotePostDefaults}
      />
    </>
  );
};

