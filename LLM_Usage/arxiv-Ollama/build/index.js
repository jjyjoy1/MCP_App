"""
ArXiv Search Script using Autogen with Ollama

This script sets up an Autogen agent that uses a local Ollama model to search ArXiv for academic papers.

OLLAMA SETUP:
1. Install Ollama:
   - macOS/Linux: curl -fsSL https://ollama.com/install.sh | sh
   - Windows: Download from https://ollama.com/download/windows
   
2. Start Ollama:
   - macOS/Linux: It should start automatically
   - Windows: Launch from the Start menu
   - Verify it's running by checking http://localhost:11434
   
3. Pull the model (before running this script):
   - In terminal: ollama pull llama3
   - You can substitute llama3 with another model if preferred
"""

# Step 1: Installation
# Run these commands in your terminal to install required packages:
# pip install -U "autogen-agentchat[mcp]" "autogen-agentchat"

# Step 2: Set up the ArXiv search server
# You'll need to install Node.js and set up the ArXiv search server.
# Create a directory for the server:
# mkdir -p arxiv-search/build
#
# Create a file arxiv-search/build/index.js with the following content:
"""
// ArXiv search server
const axios = require('axios');
const xml2js = require('xml2js');

// Function to search ArXiv by query
async function searchArxiv(query, maxResults = 5) {
  const baseUrl = 'http://export.arxiv.org/api/query';
  const url = `${baseUrl}?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  
  try {
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    if (!result.feed.entry) {
      return { papers: [] };
    }
    
    const papers = result.feed.entry.map(entry => {
      return {
        title: entry.title[0],
        authors: entry.author ? entry.author.map(author => author.name[0]).join(', ') : 'Unknown',
        summary: entry.summary[0],
        published: entry.published[0],
        link: entry.id[0]
      };
    });
    
    return { papers };
  } catch (error) {
    return { error: error.message };
  }
}

// MCP server protocol
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.type === 'tool_definition') {
      // Define the tool
      console.log(JSON.stringify({
        type: 'tool_definition_response',
        tools: [{
          name: 'searchArxiv',
          description: 'Search for papers on ArXiv by query',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 5
              }
            },
            required: ['query']
          }
        }]
      }));
    } else if (request.type === 'tool_call') {
      // Handle the tool call
      if (request.name === 'searchArxiv') {
        const { query, maxResults = 5 } = request.parameters;
        const result = await searchArxiv(query, maxResults);
        console.log(JSON.stringify({
          type: 'tool_response',
          id: request.id,
          result
        }));
      } else {
        console.log(JSON.stringify({
          type: 'tool_response',
          id: request.id,
          error: `Unknown tool: ${request.name}`
        }));
      }
    }
  } catch (error) {
    console.log(JSON.stringify({
      type: 'error',
      error: error.message
    }));
  }
});

// Signal ready
console.log(JSON.stringify({ type: 'ready' }));



