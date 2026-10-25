# Lowkey AI — High Intelligence Multimodal Assistant

[![Netlify Status](https://api.netlify.com/api/v1/badges/602e3e7d-d82b-4479-9910-b689f09efc2c/deploy-status)](https://app.netlify.com/sites/lowkeyaibythuto/deploys)
[![Live Demo](https://img.shields.io/badge/Demo-lowkeyaibythuto.netlify.app-blue?style=flat&logo=netlify)](https://lowkeyaibythuto.netlify.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFA611?style=flat&logo=firebase)](https://firebase.google.com/)

**Lowkey AI** is an ultra-fast, high-intelligence multimodal conversational AI platform built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. Combining the raw conversational intelligence of Google Gemini 3.8 Flash with high-speed reasoning cascades, native OCR transcription, real-time Google search grounding, and LaTeX/KaTeX mathematical precision, Lowkey AI delivers instant answers with zero latency lag.

🔗 **Live Deployment**: [https://lowkeyaibythuto.netlify.app/](https://lowkeyaibythuto.netlify.app/)

---

## ✨ Key Features

### ⚡ 1. Ultra-Fast Sub-Second Streaming Engine
* **High-Speed Flash Core**: Driven by Google's state-of-the-art Gemini 3.8 Flash and Flash-Lite engines, achieving sub-second Time-to-First-Token (TTFT < 0.9s).
* **Multi-Tiered Resilient Cascade**: Automatic failover cascade (Gemini Flash $\to$ Gemini Flash-Lite $\to$ High-Speed Reasoning Core $\to$ Autonomous Knowledge Synthesis) ensures 100% uptime without hanging or blank response bubbles.
* **Instantaneous Stop Button**: Real-time stream abort signal cancellation allows users to halt generation at any time with zero leftover latency or UI lockup.

### 👁️ 2. Multimodal Vision, OCR & Document Transcription
* **Image & Screenshot Comprehension**: Paste directly from the clipboard (`Ctrl+V`) or drag-and-drop screenshots, whiteboard sketches, formulas, and diagrams.
* **Optical Character Recognition (OCR)**: Extracts, transcribes, and explains handwriting, printed tables, mathematical equations, and programming snippets with high accuracy.
* **Document Processing**: Analyze code files, configuration files, and tabular data inline.

### 🌐 3. Real-Time Web Search Grounding (Zenserp Google Search API)
* **Live Web Intelligence**: Automatically triggers verified Google Search API queries when inquiries involve breaking global news, stock quotes, sports results, recent releases, or current temporal facts.
* **Temporal Grounding**: Anchored strictly to the verified present date and year, eliminating hallucinated date cutoffs.

### 📐 4. KaTeX Mathematical & Scientific Formula Rendering
* **Latex Syntax Parsing**: Renders inline ($E = mc^2$) and display-block mathematical formulas with clean typography.
* **Step-by-Step Derivations**: Formats algebra, calculus, matrices, arithmetic breakdowns, and algorithmic complexity cleanly.

### 💾 5. Local-First Resilient Persistence & Chat History
* **0ms Latency Chat Loading**: Conversations and messages are saved instantly to local storage before background network synchronization, eliminating blocking delays.
* **Multi-Session Conversation Recovery**: Robust cross-session aggregation prevents chats from disappearing when users switch between guest mode, new accounts, or different devices.
* **Conversation Management**: Full support for real-time conversation search, archiving/unarchiving, in-place title editing, and conversation deletion.
* **Editable Prompts**: Edit any previously sent message in-place to adjust queries and re-stream responses without starting over.

### 🔐 6. Secure Authentication (Firebase Auth)
* **Google One-Click Sign-In**: Easy authentication via Google OAuth popup.
* **Email & Password**: Full sign-up, sign-in, profile display name management, and self-service password reset.
* **Zero-Friction Guest Mode**: Instant access with no credentials required; all chats remain stored locally on the user's browser.

### 🎨 7. Modern UI/UX Aesthetics
* **Glassmorphism & Sleek Dark Mode**: Minimalist header, backdrop blur effects, animated gradient accents, and responsive layout for mobile and desktop screens.
* **Voice Speech-to-Text Input**: Integrated Web Speech API microphone input for hands-free prompting.
* **Starter Cards**: Quick prompt inspiration covering global intelligence, deep conceptual analysis, and algorithmic engineering.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Design System** | Tailwind CSS, shadcn/ui, Radix UI primitives, Lucide Icons |
| **Math Rendering** | KaTeX, remark-math, rehype-katex |
| **AI Models & Engines** | Google Gemini 3.8 Flash, Gemini Flash-Lite, High-Speed Reasoning LLM |
| **Search & External APIs** | Zenserp Google Search API, Newton Math API |
| **Auth & Database** | Firebase Authentication, Cloud Firestore (with local-first caching) |
| **Deployment & Hosting** | Netlify (Continuous Deployment via GitHub) |

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js**: Version 18.x or later
* **npm**: Version 9.x or later

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ilikeapplesandbananas/lowkey-chat.git
   cd lowkey-chat
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Netlify Deployment

This repository includes continuous deployment configuration for Netlify:

* **`netlify.toml`**: Configures build command (`npm run build`), publish directory (`dist`), and SPA routing rules.
* **`public/_redirects`**: Ensures proper single-page application client-side routing (`/*  /index.html  200`).

To deploy manually via the Netlify CLI:
```bash
npx netlify deploy --site 602e3e7d-d82b-4479-9910-b689f09efc2c --dir=dist --prod
```

Live Site: **[https://lowkeyaibythuto.netlify.app/](https://lowkeyaibythuto.netlify.app/)**

---

## 👤 Author

**Thuto Lephoto**  
* GitHub: [@ilikeapplesandbananas](https://github.com/ilikeapplesandbananas)  
* Portfolio: [lowkeyaibythuto.netlify.app](https://lowkeyaibythuto.netlify.app/)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
