// index.js - Complete MCP Server implementation
const axios = require('axios');
const xml2js = require('xml2js');

// Store the current state
const state = {
  query: '',
  maxResults: 10,
  sortBy: 'date',
  papers: [],
  isLoading: false,
  error: null,
  lastSearchTime: null
};

// Log to stderr for debugging
const log = (message) => {
  console.error(message);
};

log('PubMed MCP server starting...');

// Accept messages from stdin and send responses to stdout
process.stdin.on('data', async (buffer) => {
  const data = buffer.toString();
  
  try {
    // Parse incoming message
    const message = JSON.parse(data);
    
    // Log the received message
    log(`Received message: ${JSON.stringify(message)}`);
    
    // Handle methods according to JSON-RPC 2.0 specification
    if (message.jsonrpc === '2.0') {
      // Handle standard MCP methods
      switch (message.method) {
        case 'initialize':
          handleInitialize(message);
          break;
          
        case 'shutdown':
          handleShutdown(message);
          break;
          
        case 'exit':
          process.exit(0);
          break;
          
        case 'notifications/initialized':
          // Just acknowledge this notification
          // No response needed for notifications (no ID)
          break;
          
        case 'resources/list':
          // Return empty resources list
          sendResponse({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              resources: []
            }
          });
          break;
          
        case 'tools/list':
          // Return our available tools
          sendResponse({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              tools: [
                {
                  name: 'search',
                  description: 'Search PubMed for scientific papers',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search terms'
                      },
                      maxResults: {
                        type: 'number',
                        description: 'Maximum number of results',
                        default: 10
                      },
                      sortBy: {
                        type: 'string',
                        description: 'Sort order',
                        enum: ['date', 'relevance'],
                        default: 'date'
                      }
                    },
                    required: ['query']
                  }
                },
                {
                  name: 'getState',
                  description: 'Get current search state',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'clear',
                  description: 'Clear search results',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'exportCsv',
                  description: 'Export search results to CSV',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                }
              ]
            }
          });
          break;
          
        case 'prompts/list':
          // Return empty prompts list
          sendResponse({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              prompts: []
            }
          });
          break;
          
        // Custom methods
        case 'search':
          handleSearch(message);
          break;
          
        case 'getState':
          handleGetState(message);
          break;
          
        case 'clear':
          handleClear(message);
          break;
          
        case 'exportCsv':
          handleExportCsv(message);
          break;
          
        default:
          // Method not supported
          sendErrorResponse(message.id, new Error(`Method not supported: ${message.method}`), -32601);
      }
    }
  } catch (error) {
    log(`Error processing message: ${error.message}`);
    // If we can't parse the message, we can't get the ID for the response
    sendErrorResponse(null, error);
  }
});

// Handle initialize method
function handleInitialize(message) {
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: {
      protocolVersion: message.params.protocolVersion,
      capabilities: {
        tools: {
          schema: {
            properties: {
              // Define schema for our tools
            }
          }
        }
      },
      serverInfo: {
        name: 'pubmed-search-mcp',
        version: '1.0.0'
      }
    }
  });
}

// Handle shutdown method
function handleShutdown(message) {
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: null
  });
}

// Handle search method
async function handleSearch(message) {
  try {
    const query = message.params?.query || '';
    const maxResults = message.params?.maxResults || 10;
    const sortBy = message.params?.sortBy || 'date';
    
    const result = await searchPapers(query, maxResults, sortBy);
    sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: result
    });
  } catch (error) {
    sendErrorResponse(message.id, error);
  }
}

// Handle getState method
function handleGetState(message) {
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: { state: { ...state } }
  });
}

// Handle clear method
function handleClear(message) {
  clearResults();
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: { success: true }
  });
}

// Handle exportCsv method
function handleExportCsv(message) {
  const csvResult = exportToCsv();
  sendResponse({
    jsonrpc: '2.0',
    id: message.id,
    result: csvResult
  });
}

// Search PubMed for papers
async function searchPapers(query, maxResults = 10, sortBy = 'date') {
  try {
    log(`Searching PubMed for: ${query}, max: ${maxResults}, sort: ${sortBy}`);
    
    // Update state to indicate loading
    state.isLoading = true;
    state.query = query;
    state.maxResults = maxResults;
    state.sortBy = sortBy;
    state.error = null;
    
    // Step 1: Use the ESearch endpoint to get IDs of relevant papers
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=${sortBy}&retmode=json`;
    
    const searchResponse = await axios.get(searchUrl);
    const ids = searchResponse.data.esearchresult.idlist;
    
    if (ids.length === 0) {
      state.papers = [];
      state.isLoading = false;
      state.lastSearchTime = new Date();
      return { success: true, papers: [] };
    }
    
    // Step 2: Use the EFetch endpoint to get details for these IDs
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchResponse = await axios.get(fetchUrl);
    
    // Parse the XML response
    const parser = new xml2js.Parser();
    const parsedResult = await new Promise((resolve, reject) => {
      parser.parseString(fetchResponse.data, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    // Process the articles
    const papers = [];
    const articles = parsedResult.PubmedArticleSet.PubmedArticle || [];
    
    for (const article of articles) {
      try {
        const articleData = article.MedlineCitation[0];
        const articleInfo = articleData.Article[0];
        
        // Extract basic information
        const pmid = articleData.PMID[0]._;
        const title = articleInfo.ArticleTitle[0].replace(/(<([^>]+)>)/gi, "");
        
        // Extract authors
        const authorList = articleInfo.AuthorList?.[0]?.Author || [];
        const authors = authorList.map(author => {
          if (author.LastName && author.Initials) {
            return `${author.LastName[0]} ${author.Initials[0]}`;
          } else if (author.CollectiveName) {
            return author.CollectiveName[0];
          }
          return 'Unknown Author';
        }).join(', ');
        
        // Extract journal and date
        const journal = articleInfo.Journal[0].Title?.[0] || 'Unknown Journal';
        const pubDate = extractPubDate(articleInfo.Journal[0].JournalIssue[0].PubDate[0]);
        
        // Extract abstract
        let abstract = 'No abstract available';
        if (articleInfo.Abstract && articleInfo.Abstract[0].AbstractText) {
          abstract = articleInfo.Abstract[0].AbstractText.map(text => {
            if (typeof text === 'string') return text;
            // Handle structured abstracts
            if (text.$ && text.$.Label) {
              return `${text.$.Label}: ${text._}`;
            }
            return text._ || text;
          }).join('\n');
        }
        
        papers.push({
          pmid,
          title,
          authors,
          journal,
          pubDate,
          abstract,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        });
      } catch (parseError) {
        log(`Error processing article: ${parseError.message}`);
      }
    }
    
    // Update state with the results
    state.papers = papers;
    state.isLoading = false;
    state.lastSearchTime = new Date();
    
    return { success: true, papers };
  } catch (error) {
    log(`Search error: ${error.message}`);
    
    // Update state with error
    state.isLoading = false;
    state.error = error.message;
    state.lastSearchTime = new Date();
    
    return { success: false, error: error.message };
  }
}

// Helper function to extract publication date
function extractPubDate(pubDateObj) {
  try {
    if (pubDateObj.Year) {
      const year = pubDateObj.Year[0];
      const month = pubDateObj.Month ? pubDateObj.Month[0] : '';
      const day = pubDateObj.Day ? pubDateObj.Day[0] : '';
      
      if (month && day) {
        return `${year}-${month}-${day}`;
      } else if (month) {
        return `${year}-${month}`;
      } else {
        return year;
      }
    } else if (pubDateObj.MedlineDate) {
      return pubDateObj.MedlineDate[0];
    }
  } catch (e) {
    // If any error occurs, return a fallback
  }
  return 'Date unknown';
}

// Clear current results
function clearResults() {
  state.papers = [];
  state.query = '';
  state.error = null;
  return { success: true };
}

// Export search results to CSV
function exportToCsv() {
  if (state.papers.length === 0) {
    return { success: false, error: 'No papers to export' };
  }
  
  // Create CSV header
  let csv = 'Title,Authors,Journal,Publication Date,PMID,URL\n';
  
  // Add each paper as a row
  state.papers.forEach(paper => {
    // Escape fields that might contain commas
    const escapedTitle = `"${paper.title.replace(/"/g, '""')}"`;
    const escapedAuthors = `"${paper.authors.replace(/"/g, '""')}"`;
    const escapedJournal = `"${paper.journal.replace(/"/g, '""')}"`;
    
    csv += `${escapedTitle},${escapedAuthors},${escapedJournal},${paper.pubDate},${paper.pmid},${paper.url}\n`;
  });
  
  return { success: true, data: csv };
}

// Helper to send responses back via stdout
function sendResponse(response) {
  log(`Sending response: ${JSON.stringify(response)}`);
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Helper to send error responses
function sendErrorResponse(id, error, code = -32603) {
  const response = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: error.message || 'Internal error'
    }
  };
  log(`Sending error: ${JSON.stringify(response)}`);
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Log startup message
log('PubMed MCP server started');
