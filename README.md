# Math ⇄ Engineering Twin (RUAS FDP)

Interactive "digital twins" showing where B.Tech maths works inside real engineering.
Each module has a live maths panel, an engineering twin, sliders, performance metrics
(✔ on target / ▲ watch / ✖ fails), a "How the maths connects" table and "Try this" challenges.

| Discipline | Maths | Engineering twin |
|---|---|---|
| Mechanical | PDE (heat equation) | Chip heat-spreader plate temperature |
| Civil | Repeated integration | Beam shear → moment → deflection vs L/250 |
| Automotive | 2nd-order ODE | Quarter-car suspension over a speed hump |
| Electrical | Fourier series | Inverter harmonics, THD and LC filter |
| Electronics & Comm. | Convolution & Fourier transform | Filtering a noisy sensor signal |
| Computer Science | Matrices & eigenvectors | PCA data compression |
| Aerospace | Vectors | Lift, drag, thrust, weight → climb / stall |
| Chemical | ODE system, dB/dt = 0 | Optimal batch-reactor stopping time |
| Biology & Health | Nonlinear ODE (SIR) | Epidemic vs hospital capacity |
| Quantum & Materials | Eigenvalues | Quantum-dot size → QLED colour |

## Publish on GitHub Pages
1. Create a public repository (e.g. `math-twin`) and upload **all files in this folder** (keep them flat, include `.nojekyll`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Open `https://<your-user>.github.io/math-twin/` (direct link to a module: add `#me`, `#civil`, `#auto`, `#ee`, `#ece`, `#cse`, `#aero`, `#chem`, `#bio`, `#quantum`).

No libraries, no internet needed after loading. Models are simplified for teaching intuition, not final design.
