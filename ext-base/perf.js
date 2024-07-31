import { widgetPhase } from "./constant";
import { getPhaseName } from "./utils";

const { performance } = self;
export const performanceMarker = (phase) =>
  performance.mark(`${getPhaseName(phase)?.[0] || phase}`);

export const performanceMeasure = () => {
  Object.entries(widgetPhase)
    .map(([name, phase]) => {
      const entries = performance.getEntriesByName(name);
      const marker = entries.find((entry) => entry.entryType === "mark");
      return marker;
    })
    .reduce((acc, cur, index, arr) => {
      if (acc && cur) {
        const { name } = acc;
        const { name: endMarker } = cur;
        const measure = performance.measure(name, name, endMarker);
        console.log(`${name}'s duration:`, Math.ceil(measure.duration));
        performance.clearMarks(name);
        performance.clearMeasures(name);
      }
      return cur;
    });
};
