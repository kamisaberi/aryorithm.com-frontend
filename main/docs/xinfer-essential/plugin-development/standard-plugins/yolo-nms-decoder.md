# YOLO NMS Decoder

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Vision: non-maximum suppression bounding-box parser for YOLOv8 tensors.

## Inputs/outputs

Consumes raw box+score tensors, emits filtered detections with class ids.

## Tuning

IoU and confidence thresholds are runtime parameters, not compile constants.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
