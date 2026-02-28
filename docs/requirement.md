Good. I’ll keep this at a product/requirements level — no architecture decisions yet.

---

# 1. What

**A local, framework-agnostic UI Prototype Wall** that displays independently generated UI artifacts (HTML pages or component-level HTML) on an infinite canvas for side-by-side visual comparison.

Core characteristics:

* Runs locally
* Accepts self-contained HTML artifacts
* Displays multiple artifacts simultaneously
* Supports free positioning on an infinite zoomable/pannable surface
* Does not require React or any specific web framework
* Does not require the artifacts to share a runtime

Artifacts can be:

* Full-page prototypes
* Component-level prototypes
* Variants of the same UI
* Different design explorations

The system treats them uniformly as independent HTML documents.

---

# 2. Why

### Primary Motivation

To accelerate UI decision-making before committing to implementation in a production framework (e.g., Rails).

### Problems Being Solved

1. **AI iteration produces many UI variants**

   * Hard to compare sequentially in a browser
   * Hard to reason about design tradeoffs

2. **Storybook-like tools assume a component system**

   * Not suitable for raw HTML prototypes
   * Overkill when framework independence is desired

3. **Figma is not the source of truth**

   * Final UI will be written in HTML (Rails views)
   * Want prototype close to implementation reality

4. **Avoid premature framework coupling**

   * Prototype in pure HTML
   * Later migrate to Rails/ERB manually

The tool exists to separate:

> UI exploration phase
> from
> Production implementation phase

---

# 3. Use Cases

## Primary Use Case (Your Context)

**Rails developer iterating on UI with AI assistance**

1. Ask AI to generate a dashboard layout as pure HTML.
2. Save as `dashboard_v1.html`.
3. Generate alternative `dashboard_v2.html`.
4. View both side-by-side on the wall.
5. Decide direction.
6. Implement final version in Rails views.

---

## Secondary Use Cases

### A. Component-level experimentation

* Generate multiple card variants
* Compare different button styles
* Test layout density variations

Even if these are “components”, they are just standalone HTML documents.

---

### B. Design Variant Exploration

* A/B UI direction comparison
* Light vs dark themes
* Information hierarchy experiments

---

### C. AI Output Evaluation

* Compare outputs from different prompts
* Compare outputs from different models
* Evaluate prompt engineering impact visually

---

### D. Responsive Testing

* Display same artifact at different widths
* Compare mobile vs desktop layouts

---

# 4. How (High-Level Functional Requirements)

Not implementation details — just behavior.

---

## 4.1 Artifact Model

* Each artifact is an independent HTML document.
* It must be renderable without build steps.
* It may include its own CSS and JS.
* It must not affect other artifacts.

The system does not parse or interpret the HTML.
It only renders it.

---

## 4.2 Viewer Behavior

The viewer must support:

### Infinite Canvas

* Pan
* Zoom
* Large coordinate space

### Independent Nodes

Each artifact:

* Is displayed as a movable node
* Has position state
* Can be rearranged freely

### Isolation

Artifacts must:

* Not share CSS scope
* Not share JS scope
* Not leak globals

---

## 4.3 Layout Management

Minimum:

* Auto-arrange in grid on load

Optional:

* Manual drag-and-drop placement
* Persisted layout state

---

## 4.4 Developer Workflow

Minimal friction:

1. Create HTML file.
2. Save it in a directory.
3. Viewer detects it.
4. It appears automatically.

No registration ceremony required.

---

## 4.5 Optional Capabilities (Non-Core)

* Screenshot export
* Metadata display (title, version)
* Variant tagging
* Responsive viewport toggle
* Diff mode (visual or screenshot-based)

---

# 5. Tech Stack (Constraints + Options)

This is not final architecture — just directional.

---

## Core Constraints

* Must run locally
* Must not require a specific web framework
* Must handle raw HTML
* Must support isolation

---

## Runtime

### Minimalist Option

* Static file server (bun)
* Vanilla TypeScript 
* DOM transforms for canvas
* iframe-based rendering
* Still artifact-agnostic

---

## Rendering Layer

Artifacts should be rendered as:

* Independent document contexts
* Sandboxed execution environments

Isolation is mandatory.

---

## File System Integration

Options:

* Directory scanning at startup
* File watcher for hot updates
* Generated registry file

---

## State Persistence

Optional:

* LocalStorage for layout state
* JSON file for layout persistence

---

# Clarified Scope Statement

The tool is not:

* A design tool (like Figma)
* A component documentation tool (like Storybook)
* A production preview environment
* A framework-dependent playground

It is:

> A local visual comparison wall for independent UI artifacts.

---

# Important Abstraction

The key design decision (conceptually):

Do not treat items as “pages” or “components”.

Treat them as:

> Renderable HTML Artifacts

This keeps the system:

* Framework-agnostic
* Scale-agnostic
* Semantically neutral
