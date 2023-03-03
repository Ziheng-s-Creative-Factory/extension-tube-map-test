import { initialProperties, template, definition, controller, updateData, paint, resize } from "./methods";
import "./style.css";

window.define(["qlik", "./static/js/jtopo-1.3.8_trial-min.umd"], function (qlik, jtopo) {
  return {
    initialProperties,
    template,
    definition,
    controller,
    updateData: updateData(qlik),
    paint: paint(qlik, jtopo),
    resize,
    support: {
      snapshot: true,
      export: true,
      exportData: true
    },
  };
});
