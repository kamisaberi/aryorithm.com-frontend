# Real-Time YOLO Edge Vision

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


30 FPS camera inference on Rockchip RK3588 and Jetson Orin Nano.

## Graph

NVDEC unpack → YOLOv8 backbone → NMS plugin → tracked boxes.

## Budget

33 ms frame budget holds with 11 ms headroom on both targets.

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
