# ArXiv-Ollama

A tool that searches ArXiv for academic papers and generates summaries using your local Ollama LLM. Perfect for researchers who want to quickly explore a topic without relying on cloud-based LLMs or manual searching.

## Features

- **Search ArXiv**: Easily search for papers on any topic using the ArXiv API
- **Local LLM Processing**: Uses Ollama to run LLMs locally on your machine
- **Customizable Summaries**: Get concise summaries of the latest research
- **Command-line Interface**: Simple CLI with support for customizing searches and model selection
- **Privacy-Focused**: All processing happens locally - no data sent to external API services

## Prerequisites

- Python 3.7+
- [Ollama](https://ollama.com/) installed and running
- At least one model pulled in Ollama (e.g., `llama3`, `mistral`, etc.)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/arxiv-ollama.git
cd arxiv-ollama
```

2. Install required dependencies:
```bash
pip install requests
```

3. Make sure Ollama is installed and running:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags
```

4. Pull a model in Ollama if you haven't already:
```bash
ollama pull llama3
```

## Usage

### Basic Usage

```bash
python arxiv_search.py
```
This will search for "fine-tuning Llama 3" (the default query) and use the "llama3" model to generate a summary.

### Custom Search Query

```bash
python arxiv_search.py -q "quantum computing advances"
```

### Using a Different Model

```bash
python arxiv_search.py -m "mistral"
```

### Changing the Number of Results

```bash
python arxiv_search.py -n 10
```

### Combining Options

```bash
python arxiv_search.py -q "deep reinforcement learning" -m "deepseek-r1:32b" -n 8
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-q`, `--query` | Search query for ArXiv | "fine-tuning Llama 3" |
| `-m`, `--model` | Ollama model to use | "llama3" |
| `-n`, `--num-results` | Maximum number of search results | 5 |

## How It Works

1. The script connects to the ArXiv API and searches for papers matching your query
2. It extracts and formats relevant information from the search results
3. This information is passed to your local Ollama model as a prompt
4. Ollama generates a concise summary of the papers
5. The summary is displayed in your terminal

## Extending the Tool

This tool can be extended in several ways:

- Modify it to search PubMed, Google Scholar, or other academic sources
- Add support for local PDF processing to analyze your own document collection
- Implement semantic search by incorporating embeddings
- Create a web interface or API endpoint

## Troubleshooting

### Common Issues

1. **"No models found in Ollama"**: Make sure to pull at least one model using `ollama pull model_name`
2. **"Error connecting to Ollama server"**: Ensure Ollama is running on your machine
3. **"No papers found"**: Try a broader search query or increase the number of results

## License

[MIT License](LICENSE)

## Acknowledgments

- [ArXiv API](https://arxiv.org/help/api/index) for providing access to research papers
- [Ollama](https://ollama.com/) for making local LLM deployment easy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
