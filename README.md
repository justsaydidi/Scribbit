# Scribbit — Distraction-Free AI Writing App

Scribbit is an open source desktop writing app that helps you write more by removing every excuse not to. Full-screen focus mode, AI-generated prompts based on your interests, a 30-minute writing timer, and post-session AI coaching — all stored locally on your machine.

Website: https://justsaydidi.github.io/Scribbit/

## Supported AI Providers
Scribbit works with any of these providers — bring your own key:
- **Google Gemini** (default — has a free tier, recommended for most users)
- **Anthropic Claude**
- **OpenAI (GPT-4o mini)**
- **Mistral AI**

## Getting Started

### 1. Clone or download this project

### 2. Install dependencies
`npm install`

### 3. Get an API key from your chosen provider
- Gemini (free tier): https://aistudio.google.com/app/apikey
- Anthropic: https://console.anthropic.com/account/keys
- OpenAI: https://platform.openai.com/api-keys
- Mistral: https://console.mistral.ai/api-keys

### 4. Run the app
`npm start`

When the app opens for the first time, select your provider and paste your API key. It is stored only on your computer and never shared.

## Important
- No API key is ever included in this codebase
- Your writing and profile data are stored locally only
- Nothing is sent to any server except the temporary API call to your chosen AI provider
- Switching providers is possible anytime from Settings

## Built With
- Electron.js
- Multi-provider AI support: Gemini, Anthropic, OpenAI, Mistral

## Contributing
Fork the repo, make your changes, open a pull request. Never commit API keys or personal data.
