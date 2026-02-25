# RoboULM

RoboULM is a web-based tool for uncertainty analysis in self-adaptive robotic systems using large language models (LLMs). It provides an interactive interface for practitioners to analyze uncertainty at design time based on robotic system requirements and to iteratively refine LLM-generated responses. RoboULM supports three refinement options: *ranking-based refinement*, *example-driven refinement*, and *taxonomy-guided refinement*. The uncertainty taxonomy (*UncerTax*) used by RoboULM is publicly available at [github.com/Simula-COMPLEX/uncertax](https://github.com/Simula-COMPLEX/uncertax), in both PDF format and as an interactive webpage. 

## Requirements

### Basic Requirements
- Machine: Minimum 4GB RAM, 2 CPU cores, 2GB available disk space
- OS: MacOS or Windows
- IDE: VSCode

### Software Requirements
- Node.js 18.0 or higher
- npm 8.0 or higher
- Git for version control

## Dependencies

### Backend Dependencies
- Express.js - Web framework
- OpenAI - LLM integration
- Dotenv - Environment variable management
- Multer - File upload handling
- Mammoth - Word document parsing
- PDF.js - PDF document parsing
- PDF-parse - PDF text extraction

### Frontend Dependencies
- React 19.1.1 - UI framework
- React Scripts - Build tooling
- Axios - HTTP client
- React Markdown - Markdown rendering

## Installation

### Prerequisites
1. Install Node.js (version 18.0 or higher)
2. Install npm (version 8.0 or higher)
3. Install Git

### Backend Setup
```bash
cd RoboULM/backend
npm install
```

### Frontend Setup
```bash
cd RoboULM/frontend
npm install
```

## Configuration

### Environment Variables
Update `.env` file in the backend directory to add your model key. 

```
GEMINI_API_KEY=your_google_api_key
```


## Running the Application

### Start Backend Server
```bash
cd RoboULM/backend
npm run dev
```

### Start Frontend Development Server
```bash
cd RoboULM/frontend
npm start
```

### Build for Production
```bash
cd RoboULM/frontend
npm run build
```

## Usage

1. Open your browser and navigate to the link shown on terminal
2. Complete the user setup by providing your name and use case
3. Upload requirement documents for context setup
4. Use the chat interface to ask questions about uncertainty
5. Refine responses using the ranking, taxonomy, or examples


## License

This project is licensed under the Creative Commons Attribution 4.0 International License. See the `LICENSE-CC-BY.txt` file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
