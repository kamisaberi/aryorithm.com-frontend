# Real-Time Process Scheduling

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Round-robin scheduling (SCHED_RR, priority 80, nice -10).

## Policy

Verdict threads preempt everything but interrupts.

## Guard

Watchdogs demote runaways before they wedge the box.

---

*Part of the sentinel-stack documentation set. See mkdocs.yml for navigation.*
