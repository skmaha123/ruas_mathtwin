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

## AI & LLM — maths for everyone (new section)
Start page `#ai` shows the LLM pipeline (inputs → embeddings → transformer → next token → training), then:

| Twin | Maths | What you see |
|---|---|---|
| Text → tokens → vectors (`#tokens`) | Vectors, cosine similarity | Tokenizer, token IDs, embedding space, king − man + woman |
| Images & video (`#vision`) | Matrices & tensors | Pixel matrix, RGB channels, vision-transformer patches, frame differences |
| Audio (`#audio`) | Sampling, Fourier transform | Waveform, spectrogram, Nyquist/aliasing |
| Neural network learns (`#nn`) | Matrix multiply, chain rule | Live training, decision map, loss curve |
| Gradient descent (`#gd`) | Partial derivatives | Loss surface, learning rate, momentum, divergence |
| Convolutional network (`#cnn`) | 2-D convolution | Sliding kernel, feature maps, weight sharing |
| Attention (`#attn`) | Dot products, softmax | Attention matrix, "it" → "motor" |
| Next-word prediction (`#llm`) | Probability, softmax, entropy | Temperature, top-k, live text generation |

All AI twins are small teaching models running in the browser, using the same equations as real systems.

## Publish on GitHub Pages
1. Create a public repository (e.g. `math-twin`) and upload **all files in this folder** (including `ai.js`) (keep them flat, include `.nojekyll`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Open `https://<your-user>.github.io/math-twin/` (direct link to a module: add `#me`, `#civil`, `#auto`, `#ee`, `#ece`, `#cse`, `#aero`, `#chem`, `#bio`, `#quantum`).

No libraries, no internet needed after loading. Models are simplified for teaching intuition, not final design.
