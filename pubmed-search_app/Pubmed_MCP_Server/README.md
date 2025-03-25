Claude Desktop Configuration Guide for PubMed MCP

Now I can use the PubMed search functionality in conversations with Claude. 

For example:

"Can you search PubMed for recent papers on single cell RNA sequencing?"
"Use the PubMed MCP to find papers about CRISPR/Cas9 from the last year"
"Search PubMed for 'spatial transcriptomics' and summarize the top 5 results"

The MCP server provides four main functions:

search - Find papers matching your query
getState - Check the current search state
clear - Clear search results
exportCsv - Export results to CSV format


How to use PubMed MCP server:
step 1: 
cd /to/this/folder
npm install

step 2:
open claude-desk config.json file

vi ~/Library/Application\ Support/Claude/claude_desktop_config.json

Replace the original file using this: 

{
  "mcpServers": {
    "pubmed": {
      "command": "node",
      "args": [
        "/path_to/pubmed-search-app/Pubmed_MCP_Server/index.js"
      ]
    }
  }
}

Step 3:
Restart Claude-desk app. 




