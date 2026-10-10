import type { Metadata } from "next";
import ModelsView from "./ModelsView";

export const metadata: Metadata = {
  title: "AI Models | Aryorithm Hub",
  description:
    "Foundation and community models for edge inference and forge retraining: ONNX, SafeTensors, OpenVINO IR, TensorRT engines.",
};

export default function ModelsPage() {
  return <ModelsView />;
}
