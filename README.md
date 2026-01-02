# Weavy AI Clone

A Next.js-based AI workflow builder inspired by Weavy, featuring modular nodes, LLM integration, and cloud upload support.

## Features

- **Modular Workflow Builder**: Drag-and-drop nodes for text, images, and LLMs.
- **LLM Integration**: Connect to large language models for AI-powered tasks.
- **Cloud Uploads**: Upload files via Cloudinary integration.
- **Modern UI**: Responsive, accessible, and visually appealing interface.
- **Customizable Nodes**: Easily extend with new node types.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
git clone https://github.com/yuvraj7000/weavy.ai-clone.git
cd weavy.ai-clone
npm install
# or
yarn install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
├── app/                # Next.js app directory (routes, API, pages)
│   ├── api/            # API routes (llm, upload, workflows)
│   └── workflow/       # Workflow builder page
├── components/         # React components (nodes, UI, sections)
│   ├── nodes/          # Node components (ImageNode, LLMNode, TextNode)
│   ├── sections/       # Page sections (Hero, Footer, etc.)
│   └── primitives/     # UI primitives (GradientOverlay, NodeHandle, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (cloudinary, db, LLM, constants)
├── public/             # Static assets
├── store/              # Zustand or other state management
├── README.md           # Project documentation
├── package.json        # Project metadata and scripts
└── ...
```

## Usage

1. Build workflows by dragging nodes onto the canvas.
2. Configure each node (e.g., select LLM model, upload images).
3. Run workflows and view results in real time.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for new features, bug fixes, or improvements.

## License

MIT License
