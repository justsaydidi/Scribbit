'use strict';

/**
 * Multi-Provider AI abstraction for Scribbit.
 * Supports: Google Gemini, Anthropic Claude, OpenAI, and Mistral AI.
 */

const PROVIDERS = {
    gemini: {
        model: 'gemini-2.0-flash',
        sdk: '@google/generative-ai',
    },
    anthropic: {
        model: 'claude-3-haiku-20240307',
        sdk: '@anthropic-ai/sdk',
    },
    openai: {
        model: 'gpt-4o-mini',
        sdk: 'openai',
    },
    mistral: {
        model: 'mistral-small-latest',
        sdk: '@mistralai/mistralai',
    },
};

const DEFAULT_PROVIDER = 'gemini';

// Demo mode responses for testing without API keys
const DEMO_PROMPTS = [
    "Write about a moment when you changed your mind about something important. What caused the shift?",
    "Describe a place that feels like home to you, even if you've never lived there.",
    "Write about a time you failed at something and what it taught you.",
    "Describe a conversation that changed your perspective on a person or situation.",
    "Write about a habit you've been trying to build or break. What's working? What isn't?",
    "Describe a skill you have that you're proud of. How did you develop it?",
    "Write about a time when you had to make a difficult decision. How did you decide?",
    "Describe someone who has influenced your thinking about the world.",
    "Write about a fear you've overcome or are working to overcome.",
    "Describe a routine or ritual that helps you feel grounded."
];

const DEMO_FEEDBACK = `**Writing Type Detected:**
This appears to be reflective personal writing — a stream-of-consciousness exploration of ideas and experiences.

**What's Working:**
Your opening paragraph has a strong, honest voice. The sentence "I keep coming back to this same thought" creates immediate intimacy and draws the reader in. This authenticity is your greatest strength here.

**2–3 Things to Develop:**

1. **Vary your sentence length more deliberately.** You have several long, complex sentences in a row. Try breaking one into two short, punchy sentences to create rhythm and emphasis.

2. **Anchor abstract ideas with specific details.** When you mention "that moment," the reader wants to know — what exactly happened? What did you see, hear, feel? One concrete detail will make the abstract idea land harder.

3. **Consider your ending.** The piece trails off, which can work, but you might experiment with circling back to your opening image or question to give the reader a sense of closure.

**One Question to Take Forward:**
If you had to explain the core insight of this piece to someone in one sentence, what would you say? That clarity might help you sharpen the focus in your next draft.`;

const DEMO_PATTERN_ANALYSIS = `**Your Writing Fingerprint:**
You write with a reflective, questioning voice — someone who processes the world through internal dialogue rather than declarative statements. Across your sessions, there's a consistent searching quality: you're less interested in having answers than in exploring the questions. This creates intimacy with the reader, though it sometimes leaves ideas suspended rather than resolved.

**Patterns That Are Serving You:**

1. **Your habit of returning to the same image or phrase throughout a piece** — this creates cohesion and a sense of ongoing inquiry. In several sessions, you circle back to an opening idea with new context, which rewards attentive readers.

2. **Your willingness to write into uncertainty** — you don't pretend to have everything figured out. This honesty builds trust. When you write "I'm not sure why this matters, but..." it invites the reader to discover with you.

**Patterns Worth Breaking:**

1. **You consistently bury your most interesting insight three-quarters of the way through.** This is a habit of writers who fear being too direct. Your strongest sentences are often hidden in the middle of paragraphs. Try moving one of them to the opening or closing — trust that your reader can handle it.

2. **Your conclusions often trail into questions rather than landing.** While open-endedness can work, try writing one concrete statement about what you've learned or observed. Give the reader something to carry away, even if it's small.

3. **You rely heavily on "I think" and "I feel" as sentence starters.** These hedges soften your authority. Try removing them for one session and notice what happens — you might find the writing gains conviction without losing its thoughtfulness.

**What You Write Best:**
You're most alive when writing about moments of tension or transition — decisions you're weighing, changes you're resisting, realisations that arrived unexpectedly. Your Prompted Writing sessions show more specificity and energy than your Free Writing. You respond well to external structure; the constraint seems to focus your natural introspection into sharper observations.

**One Thing To Try Next:**
Write a piece where you are not allowed to use the word "I" in the first paragraph. Force yourself to establish the scene, the subject, or the idea before introducing your perspective. See what happens to your voice when you can't rely on personal pronouns as an entry point.`;

/**
 * Get the current provider name from the database.
 */
function getProvider(db) {
    return db.get('scribbit_ai_provider') || DEFAULT_PROVIDER;
}

/**
 * Set the current provider name in the database.
 */
function setProvider(db, provider) {
    if (!PROVIDERS[provider]) throw new Error(`Invalid provider: ${provider}`);
    db.set('scribbit_ai_provider', provider);
}

/**
 * Check if demo mode is enabled (no API key or explicitly set).
 */
function isDemoMode(db) {
    const apiKey = db.get('scribbit_api_key');
    return !apiKey || apiKey === 'demo';
}

/**
 * Send a chat completion request to the selected provider.
 * If no API key is set, runs in demo mode with sample responses.
 */
async function complete(db, messages, options = {}) {
    const providerName = getProvider(db);
    const apiKey = db.get('scribbit_api_key');

    // Demo mode: return sample responses without API call
    if (isDemoMode(db)) {
        console.log('[AI] Running in DEMO mode');

        // Check if this is a prompt generation request (contains "interests")
        const isPromptRequest = options.system && options.system.includes('interests');

        // Check if this is a feedback request (contains "writing coach")
        const isFeedbackRequest = options.system && options.system.includes('writing coach');

        // Check if this is a pattern analysis request (contains "body of work")
        const isPatternRequest = options.system && options.system.includes('body of work');

        if (isPromptRequest) {
            // Return a random demo prompt
            const randomPrompt = DEMO_PROMPTS[Math.floor(Math.random() * DEMO_PROMPTS.length)];
            return randomPrompt;
        } else if (isFeedbackRequest) {
            // Return demo feedback
            return DEMO_FEEDBACK;
        } else if (isPatternRequest) {
            // Return demo pattern analysis
            return DEMO_PATTERN_ANALYSIS;
        } else {
            // Generic demo response
            return "This is a demo response. In production mode, this would be generated by AI.";
        }
    }

    console.log(`[AI] Requesting completion from ${providerName}`);

    const config = PROVIDERS[providerName];
    if (!config) throw new Error(`Unsupported provider: ${providerName}`);

    try {
        switch (providerName) {
            case 'gemini':
                return await completeGemini(apiKey, messages, options);
            case 'anthropic':
                return await completeAnthropic(apiKey, messages, options);
            case 'openai':
                return await completeOpenAI(apiKey, messages, options);
            case 'mistral':
                return await completeMistral(apiKey, messages, options);
            default:
                throw new Error(`Provider implementation missing: ${providerName}`);
        }
    } catch (err) {
        console.error(`[AI] ${providerName} error:`, err);
        throw err;
    }
}

async function completeGemini(apiKey, messages, options) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: options.model || PROVIDERS.gemini.model,
        systemInstruction: options.system,
    });

    // Convert message format
    const prompt = messages.map(m => m.content).join('\n\n');
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function completeAnthropic(apiKey, messages, options) {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
        model: options.model || PROVIDERS.anthropic.model,
        max_tokens: options.maxTokens || 1024,
        system: options.system,
        messages: messages,
    });
    return response.content[0].text;
}

async function completeOpenAI(apiKey, messages, options) {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const fullMessages = [];
    if (options.system) {
        fullMessages.push({ role: 'system', content: options.system });
    }
    fullMessages.push(...messages);

    const response = await client.chat.completions.create({
        model: options.model || PROVIDERS.openai.model,
        messages: fullMessages,
    });
    return response.choices[0].message.content;
}

async function completeMistral(apiKey, messages, options) {
    const { Mistral } = await import('@mistralai/mistralai');
    const client = new Mistral({ apiKey });
    const fullMessages = [];
    if (options.system) {
        fullMessages.push({ role: 'system', content: options.system });
    }
    fullMessages.push(...messages);

    const response = await client.chat.complete({
        model: options.model || PROVIDERS.mistral.model,
        messages: fullMessages,
    });
    return response.choices[0].message.content;
}

/**
 * Check whether an API key has been saved.
 */
function hasApiKey(db) {
    const key = db.get('scribbit_api_key');
    return Boolean(key && key !== 'demo');
}

/**
 * Validate an API key by making a test request.
 */
async function validateApiKey(db, key, provider) {
    const config = PROVIDERS[provider];
    if (!config) throw new Error(`Invalid provider: ${provider}`);
    
    try {
        switch (provider) {
            case 'gemini': {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: config.model });
                await model.generateContent('test');
                return { valid: true };
            }
            case 'anthropic': {
                const { Anthropic } = await import('@anthropic-ai/sdk');
                const client = new Anthropic({ apiKey: key });
                await client.messages.create({
                    model: config.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'hi' }]
                });
                return { valid: true };
            }
            case 'openai': {
                const { OpenAI } = await import('openai');
                const client = new OpenAI({ apiKey: key });
                await client.chat.completions.create({
                    model: config.model,
                    messages: [{ role: 'user', content: 'hi' }]
                });
                return { valid: true };
            }
            case 'mistral': {
                const { Mistral } = await import('@mistralai/mistralai');
                const client = new Mistral({ apiKey: key });
                await client.chat.complete({
                    model: config.model,
                    messages: [{ role: 'user', content: 'hi' }]
                });
                return { valid: true };
            }
            default:
                return { valid: false, error: 'Unknown provider' };
        }
    } catch (err) {
        console.error('[AI] Validation error:', err);
        return { 
            valid: false, 
            error: err.message || 'Validation failed' 
        };
    }
}

/**
 * Store the API key in the database.
 */
function setApiKey(db, key) {
    db.set('scribbit_api_key', key);
}

module.exports = { complete, setApiKey, hasApiKey, validateApiKey, getProvider, setProvider };
