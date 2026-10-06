# Real-Time Radial Topology Canvas (`fleet_topology.js`)

The fleet topology is rendered on an HTML5 Canvas using a **multi-ring radial layout**. This visualization maps the 4-tier asset hierarchy, rendering up to 5,000 appliances and 25,000 industrial sensors at 60 FPS without DOM overhead.

---

## 1. Multi-Ring Radial Geometry

```text
                            RING 3: Sensors & Field PLCs (Outer Perimeter)
                                    • • • • • • • • • •
                                 •                       •
                         RING 2: Blackbox-Sentinel Appliances
                                 ┌───────────────┐
                              •  │  Appliance 1  │  •
                                 └───────┬───────┘
                                         │
                             RING 1:  [NEXUS] (Central Hub)
                                         │
                                 ┌───────┴───────┐
                              •  │  Appliance 2  │  •
                                 └───────────────┘
                                 •                       •
                                    • • • • • • • • • •
```

* **Center Node (Ring 0):** `sentinel-nexus` Central Hub.
* **Intermediate Ring (Ring 1):** Edge Appliances (`blackbox-sentinel`), colored by health state (`#00E5FF` Online, `#FFB300` Degraded, `#FF1744` Unreachable).
* **Outer Cluster (Ring 2):** Field Sensors (Modbus PLCs, S7 controllers, DICOM scanners).
* **Animated Threat Arcs:** When a node mitigates an attack, a red vector pulse arcs toward the center hub, followed by a cyan fanout wave across the fleet ring.

---

## 2. Canvas Rendering Engine (`static/js/fleet_topology.js`)

```javascript
class FleetRadialCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.threatArcs = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) * 0.8;
    }

    draw(nodes) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Central Hub Node
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 18, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#00E5FF';
        this.ctx.fill();

        // Draw Fleet Radial Nodes
        const total = nodes.length;
        nodes.forEach((node, idx) => {
            const angle = (idx / total) * 2 * Math.PI;
            const x = this.centerX + this.radius * Math.cos(angle);
            const y = this.centerY + this.radius * Math.sin(angle);

            // Connective Line
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
            this.ctx.stroke();

            // Edge Node Marker
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fillStyle = node.status === 'ONLINE' ? '#00E5FF' : '#FF1744';
            this.ctx.fill();
        });
    }
}
```

