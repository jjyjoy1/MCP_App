# pip install requests
"""
ArXiv Search Script using Ollama

This script searches ArXiv for papers and uses a local Ollama model to summarize the results.

USAGE:
  python arxiv_search.py -q "your search query" -m "ollama model name" -n 5

OPTIONS:
  -q, --query        Search query for ArXiv (default: "fine-tuning Llama 3")
  -m, --model        Ollama model to use (default: "llama3")
  -n, --num-results  Maximum number of search results (default: 5)

EXAMPLES:
  python arxiv_search.py
  python arxiv_search.py -q "quantum computing" -m "mistral" -n 10

OLLAMA SETUP:
1. Install Ollama:
   - macOS/Linux: curl -fsSL https://ollama.com/install.sh | sh
   - Windows: Download from https://ollama.com/download/windows
   
2. Start Ollama:
   - macOS/Linux: It should start automatically
   - Windows: Launch from the Start menu
   - Verify it is running by checking http://localhost:11434
   
3. Pull the model:
   - In terminal: ollama pull llama3
   - Or whatever model you want to use
"""

import os
import requests
import sys
import json
import argparse
import xml.etree.ElementTree as ET
import urllib.parse
import urllib.request

# Check if Ollama is running and has the required model
def check_ollama(model_name="llama3"):
    try:
        # Check if Ollama server is running
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code != 200:
            print("Error: Ollama server is not running or not responding.")
            print("Please make sure Ollama is installed and running.")
            sys.exit(1)
            
        # Check if the model is available
        models = response.json().get("models", [])
        model_names = [model.get("name") for model in models]
        
        if not model_names:
            print("Warning: No models found in Ollama.")
            print(f"Please run: ollama pull {model_name}")
            sys.exit(1)
            
        if model_name not in model_names:
            print(f"Error: Model '{model_name}' not found in Ollama.")
            print(f"Available models: {', '.join(model_names)}")
            print(f"Please run: ollama pull {model_name}")
            sys.exit(1)
            
        print(f"✓ Ollama is running with model '{model_name}' available.")
        return True
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Ollama server at http://localhost:11434")
        print("Please make sure Ollama is installed and running.")
        sys.exit(1)

# Custom Ollama API client
class OllamaClient:
    def __init__(self, model_name, base_url="http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
    
    def generate(self, prompt):
        """Generate a response using Ollama API"""
        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            return response.json().get("response", "")
        except Exception as e:
            print(f"Error calling Ollama API: {str(e)}")
            return f"Error: {str(e)}"

# Direct API function for ArXiv search
def search_arxiv(query, max_results=5):
    try:
        print(f"Searching ArXiv for: {query}")
        import xml.etree.ElementTree as ET
        import urllib.parse
        import urllib.request
        
        # Format the query for the ArXiv API
        encoded_query = urllib.parse.quote(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"
        
        # Make the request
        with urllib.request.urlopen(url) as response:
            response_text = response.read()
        
        # Parse XML
        root = ET.fromstring(response_text)
        
        # Extract papers
        papers = []
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        for entry in root.findall(".//atom:entry", ns):
            title = entry.find("atom:title", ns).text.strip()
            summary = entry.find("atom:summary", ns).text.strip()
            published = entry.find("atom:published", ns).text.strip()
            link = entry.find("atom:id", ns).text.strip()
            
            # Get authors
            authors = []
            for author in entry.findall(".//atom:author/atom:name", ns):
                authors.append(author.text.strip())
            
            papers.append({
                "title": title,
                "authors": ", ".join(authors),
                "summary": summary,
                "published": published,
                "link": link
            })
        
        return papers
    except Exception as e:
        print(f"Error searching ArXiv: {str(e)}")
        return []

# Main function to run the ArXiv search
def main():
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Search ArXiv for papers and summarize them using Ollama.')
    parser.add_argument('-q', '--query', type=str, default="fine-tuning Llama 3",
                        help='The search query for ArXiv (default: "fine-tuning Llama 3")')
    parser.add_argument('-m', '--model', type=str, default="llama3",
                        help='The Ollama model to use (default: "llama3")')
    parser.add_argument('-n', '--num-results', type=int, default=5,
                        help='Maximum number of search results (default: 5)')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Get values from arguments
    search_query = args.query
    model_name = args.model
    max_results = args.num_results
    
    # Verify Ollama is set up correctly
    check_ollama(model_name)
    
    # Create Ollama client
    ollama = OllamaClient(model_name)
    
    # Search ArXiv
    print(f"\nSearching ArXiv for: {search_query}")
    papers = search_arxiv(search_query, max_results=max_results)
    
    if not papers:
        print("No papers found or an error occurred.")
        return
    
    # Prepare a summary of the papers for the LLM
    papers_summary = "\n\n".join([
        f"Paper {i+1}:\nTitle: {paper['title']}\nAuthors: {paper['authors']}\nPublished: {paper['published']}\nSummary: {paper['summary'][:300]}...\nLink: {paper['link']}"
        for i, paper in enumerate(papers)
    ])
    
    # Create a prompt for the LLM to summarize the papers
    prompt = f"""You are a helpful research assistant. You've searched ArXiv for '{search_query}' and found the following papers:
            {papers_summary}
             Please provide a brief overview of these papers on {search_query}. What are the key approaches and findings? Organize your summary by important themes or techniques.
             """
    
    # Get response from Ollama
    print("\nGenerating summary using Ollama. This may take a moment...")
    response = ollama.generate(prompt)
    
    # Print the results
    print("\n--- ArXiv Search Results Summary ---\n")
    print(response)

if __name__ == "__main__":
    main()


