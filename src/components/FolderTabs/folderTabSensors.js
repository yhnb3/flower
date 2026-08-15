import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";

export const folderTabSensors = (defaults) => [
  ...defaults.filter((sensor) => sensor !== PointerSensor),
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })];
      }

      return [new PointerActivationConstraints.Distance({ value: 8 })];
    },
  }),
];
