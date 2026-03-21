import React from "react";
import { Composition } from "remotion";
import { ChapterCard, ChapterCardSchema } from "./components/ChapterCard";
import { CodeShowcase, CodeShowcaseSchema } from "./components/CodeShowcase";
import { CourseIntro } from "./sequences/00-intro/CourseIntro";
import { WhatIsAgent } from "./sequences/01-panorama/WhatIsAgent";
import { PiArchOverview } from "./sequences/01-panorama/PiArchOverview";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Base components */}
      <Composition
        id="ChapterCard"
        component={ChapterCard}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        schema={ChapterCardSchema}
        defaultProps={{
          chapterNumber: 1,
          chapterTitle: "全景总览",
          accentColor: "#D97757",
        }}
      />
      <Composition
        id="CodeShowcase"
        component={CodeShowcase}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        schema={CodeShowcaseSchema}
        defaultProps={{
          code: 'const agent = new Agent();\nawait agent.run("Hello");',
          language: "typescript",
          highlightLines: [2],
          title: "example.ts",
          accentColor: "#D97757",
        }}
      />

      {/* V00: Course Intro */}
      <Composition
        id="CourseIntro"
        component={CourseIntro}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V01: What Is Agent */}
      <Composition
        id="WhatIsAgent"
        component={WhatIsAgent}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V02: Pi Architecture Overview */}
      <Composition
        id="PiArchOverview"
        component={PiArchOverview}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
