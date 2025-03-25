// server.js - Main entry point for the application

// Required dependencies
const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const bodyParser = require('body-parser');

// Initialize express application
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MODEL: PubMed data fetching service
const pubMedService = {
    async searchPapers(query, maxResults = 10, sortBy = 'date') {
        try {
            // Step 1: Use the ESearch endpoint to get IDs of relevant papers
            const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=${sortBy}&retmode=json`;
            
            const searchResponse = await axios.get(searchUrl);
            const ids = searchResponse.data.esearchresult.idlist;
            
            if (ids.length === 0) {
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
                    const pubDate = this.extractPubDate(articleInfo.Journal[0].JournalIssue[0].PubDate[0]);
                    
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
                    console.error(`Error processing article:`, parseError);
                }
            }
            
            return { success: true, papers };
        } catch (error) {
            console.error("Request failed:", error.message);
            return { success: false, error: error.message };
        }
    },

    extractPubDate(pubDateObj) {
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
};

// CONTROLLER: Route handling
// Home route
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'PubMed Paper Search',
        papers: [],
        query: '',
        showResults: false 
    });
});

// Search route
app.post('/search', async (req, res) => {
    try {
        const { query, maxResults = 10 } = req.body;
        const result = await pubMedService.searchPapers(query, maxResults);
        
        res.render('index', { 
            title: 'PubMed Paper Search',
            papers: result.papers,
            query,
            showResults: true,
            error: result.success ? null : result.error
        });
    } catch (error) {
        res.render('index', { 
            title: 'PubMed Paper Search',
            papers: [],
            query: req.body.query,
            showResults: true,
            error: error.message
        });
    }
});

// API endpoint for AJAX requests
app.post('/api/search', async (req, res) => {
    try {
        const { query, maxResults = 10 } = req.body;
        const result = await pubMedService.searchPapers(query, maxResults);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});




