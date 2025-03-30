# Ollama Database & Research Tools

This repository contains a collection of Python tools that leverage Ollama's large language models to interact with databases and search academic literature using natural language.

## Overview

These tools allow you to:

1. **Search ArXiv papers** and get AI-generated summaries of research findings
2. **Query databases in plain English** without writing SQL
3. **Visualize database schemas** to understand table relationships

The tools use Ollama, a local AI inference server that runs LLMs on your machine, providing privacy, cost-efficiency, and customizability.

## Tools Included

### 1. ArXiv Research Assistant

The `arxiv_search.py` script lets you search ArXiv for academic papers and uses Ollama to summarize the results.

**Features:**
- Search ArXiv by keywords
- Get AI-generated summaries of multiple papers
- Identify key themes and findings
- Works with multiple Ollama models

### 2. SQLite Schema Explorer

The `sqlite_explorer.py` script connects to SQLite databases and allows you to:

**Features:**
- Explore database structure and relationships
- Query databases using natural language
- Visualize schema information
- Get sample data from tables

### 3. Test Database Setup

The `sqlite_test_setup.py` script creates a sample e-commerce database for testing.

**Features:**
- Creates realistic table structures with relationships
- Populates tables with sample data
- Sets up proper foreign key constraints
- Perfect for learning and testing

## How It Works

1. **ArXiv Search:** Retrieves papers from ArXiv API, then uses Ollama to generate a coherent summary across all results

2. **Database Explorer:** 
   - Extracts database schema information
   - Sends schema + natural language query to Ollama
   - Gets SQL query back from Ollama
   - Executes the query and displays results
   - Falls back to predefined templates when needed

3. **Hybrid Approach:** Combines predefined templates for common queries with LLM-generated SQL for complex questions

## Customization

- **Models:** Change which Ollama model to use with the `-m` flag
- **SQL Generation:** Modify the fallback templates in `OllamaClient.fallback_sql_generator()` 
- **Output Format:** Adjust the table formatting in `format_table()`

## Troubleshooting

### Common Issues

- **"Ollama not running" error**: Ensure Ollama is started with `ollama serve`
- **Timeout errors**: Try using a smaller model or increase the timeout in the code
- **"Model not found"**: Pull the model with `ollama pull model_name`
- **Import errors**: Make sure all required packages are installed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Ollama](https://ollama.com/) for making local LLMs accessible
- [ArXiv](https://arxiv.org/) for providing open access to research papers
- The open-source community for libraries like requests, graphviz, and sqlite3

