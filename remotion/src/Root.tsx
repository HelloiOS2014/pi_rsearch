import React from "react";
import { Composition } from "remotion";
import { ChapterCard, ChapterCardSchema } from "./components/ChapterCard";
import { CodeShowcase, CodeShowcaseSchema } from "./components/CodeShowcase";
import { CourseIntro } from "./sequences/00-intro/CourseIntro";
import { WhatIsAgent } from "./sequences/01-panorama/WhatIsAgent";
import { PiArchOverview } from "./sequences/01-panorama/PiArchOverview";
import { LoopAnimation } from "./sequences/02-core-loop/LoopAnimation";
import { ToolCallFlow } from "./sequences/03-tool-system/ToolCallFlow";
import { EventTimeline } from "./sequences/04-streaming/EventTimeline";
import { ProviderAbstract } from "./sequences/05-multi-model/ProviderAbstract";
import { FullArchitecture } from "./sequences/06-build-agent/FullArchitecture";

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

      {/* V04: Agent Loop Animation */}
      <Composition
        id="LoopAnimation"
        component={LoopAnimation}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V08: Tool Call Flow */}
      <Composition
        id="ToolCallFlow"
        component={ToolCallFlow}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V12: Event Timeline */}
      <Composition
        id="EventTimeline"
        component={EventTimeline}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V15: Provider Abstraction */}
      <Composition
        id="ProviderAbstract"
        component={ProviderAbstract}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V19: Full Architecture */}
      <Composition
        id="FullArchitecture"
        component={FullArchitecture}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
