# AI Integration Guide for CBZ API Delta

This document provides a comprehensive guide on how to integrate and configure AI-powered diff summarization in the CBZ API Delta tool. It covers the implementation details, configuration options, and how to switch between different AI providers.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Configuration](#configuration)
3. [Adding New AI Providers](#adding-new-ai-providers)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Troubleshooting](#troubleshooting)
7. [Reverting Changes](#reverting-changes)

## Architecture Overview

The AI integration follows a modular design with these key components:

1. **Frontend** (`public/main.js`):
   - Handles UI for toggling AI summaries
   - Manages client-side caching of summaries
   - Makes API requests to the backend

2. **Backend** (`server.js` and `api-summary.js`):
   - Provides API endpoint for summary generation
   - Manages AI provider integration
   - Handles caching and rate limiting

3. **Configuration** (`.env`):
   - Centralized configuration for AI providers
   - API keys and model settings

## Configuration

### Environment Variables

Create a `.env` file in the project root with these variables:

```env
# AI Provider Configuration
AI_PROVIDER=gemini  # Options: gemini, openai, anthropic
AI_API_KEY=your_api_key_here

# Optional: Provider-specific settings
GEMINI_MODEL=gemini-1.5-pro
OPENAI_MODEL=gpt-4-turbo
ANTHROPIC_MODEL=claude-3-opus-20240229

# Caching (in milliseconds, 0 to disable)
AI_CACHE_TTL=3600000  # 1 hour

# Rate limiting (requests per minute)
AI_RATE_LIMIT=30
```

### Supported AI Providers

1. **Google Gemini**
   - Provider ID: `gemini`
   - Required Env: `GEMINI_API_KEY`
   - Default Model: `gemini-1.5-pro`

2. **OpenAI**
   - Provider ID: `openai`
   - Required Env: `OPENAI_API_KEY`
   - Default Model: `gpt-4-turbo`

3. **Anthropic Claude**
   - Provider ID: `anthropic`
   - Required Env: `ANTHROPIC_API_KEY`
   - Default Model: `claude-3-opus-20240229`

## Adding New AI Providers

To add a new AI provider:

1. Create a new provider class in `src/ai-providers/` following this pattern:

```javascript
// src/ai-providers/NewProvider.js
class NewProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || 'default-model';
    this.client = this.initializeClient();
  }

  initializeClient() {
    // Initialize the provider's SDK/client
    return new ProviderSDK(this.apiKey, { /* options */ });
  }

  async generateSummary(diffs, context = {}) {
    // Implement the logic to generate a summary
    const prompt = this.buildPrompt(diffs, context);
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    
    return {
      summary: response.choices[0].message.content,
      model: this.model,
      provider: 'new-provider',
    };
  }

  buildPrompt(diffs, context) {
    // Build the prompt for the AI model
    return `Analyze these API diffs and provide a concise summary:
${JSON.stringify(diffs, null, 2)}

Endpoint: ${context.endpointName}
Focus on breaking changes and important modifications.`;
  }
}

module.exports = NewProvider;
```

2. Update the provider factory in `src/ai-providers/index.js`:

```javascript
const NewProvider = require('./NewProvider');

function createProvider(provider, apiKey, options = {}) {
  switch (provider) {
    case 'new-provider':
      return new NewProvider(apiKey, options);
    // ... other providers
  }
}
```

## Frontend Implementation

The frontend handles the UI for AI summaries and makes requests to the backend API.

### Key Components

1. **AI Summary Toggle**
   - Added to each endpoint card
   - Shows loading state and error messages
   - Caches responses to avoid redundant API calls

2. **API Client**
   - Makes POST requests to `/api/ai-summary`
   - Handles errors and loading states
   - Implements client-side caching

### Example Request

```javascript
// Example of how to call the AI summary API
async function fetchAISummary(diffs, endpointName) {
  const response = await fetch('/api/ai-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      diffs: diffs.map(d => ({
        path: d.path,
        kind: d.kind,
        lhs: d.lhs,
        rhs: d.rhs,
        severity: d.severity
      })),
      endpointName: endpointName
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate AI summary');
  }
  
  return response.json();
}
```

## Backend Implementation

The backend handles the AI provider integration and request processing.

### API Endpoint

```javascript
// Example API endpoint in server.js
app.post('/api/ai-summary', async (req, res) => {
  try {
    const { diffs, endpointName } = req.body;
    
    // Validate input
    if (!Array.isArray(diffs) || !endpointName) {
      return res.status(400).json({ 
        error: 'Invalid request. Missing required fields.' 
      });
    }
    
    // Generate summary using the configured AI provider
    const summary = await aiService.generateSummary(diffs, { endpointName });
    
    res.json({
      summary: summary.text,
      model: summary.model,
      provider: summary.provider,
      cached: false
    });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});
```

### AI Service

The AI service handles provider selection and request forwarding:

```javascript
// src/services/ai-service.js
const { createProvider } = require('../ai-providers');

class AIService {
  constructor() {
    this.provider = this.initializeProvider();
  }
  
  initializeProvider() {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    
    if (!apiKey) {
      console.warn(`No API key found for provider: ${provider}`);
      return null;
    }
    
    return createProvider(provider, apiKey, {
      model: process.env[`${provider.toUpperCase()}_MODEL`]
    });
  }
  
  async generateSummary(diffs, context = {}) {
    if (!this.provider) {
      throw new Error('No AI provider configured');
    }
    
    return this.provider.generateSummary(diffs, context);
  }
}

module.exports = new AIService();
```

## Troubleshooting

### Common Issues

1. **Missing API Key**
   - Ensure the correct environment variable is set in `.env`
   - Verify the variable name matches the provider's expected name

2. **Rate Limiting**
   - Check the provider's rate limits
   - Implement exponential backoff for retries

3. **Model Not Found**
   - Verify the model name is correct for the provider
   - Check if the model is available in your region/plan

### Logging

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=ai:*,api:* node src/server.js
```

## Reverting Changes

To disable AI features:

1. Remove or comment out the AI provider configuration in `.env`
2. The UI will automatically hide AI-related elements when no provider is configured

## Future Enhancements

1. **Support for Local Models**
   - Add support for locally-hosted models (e.g., Ollama, vLLM)

2. **Custom Prompts**
   - Allow users to customize the prompt template

3. **Multi-provider Fallback**
   - Try multiple providers if the primary one fails

4. **Feedback Mechanism**
   - Allow users to rate the quality of AI summaries

## License

This integration is part of the CBZ API Delta project and follows the same licensing terms.
