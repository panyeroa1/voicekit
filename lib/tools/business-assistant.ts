/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionCall } from '../state';
import { FunctionResponseScheduling } from '@google/genai';

export const businessAssistantTools: FunctionCall[] = [
  {
    name: 'place_call',
    description: 'Places a phone call to a specified person at a given international phone number. Can optionally include a voice message.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'The name of the person to call.' },
        phoneNumber: { type: 'STRING', description: 'The international phone number to dial in E.164 format (e.g., +14155552671).' },
        voice_message: { type: 'STRING', description: 'An optional voice message to be played to the recipient.' },
      },
      required: ['name', 'phoneNumber'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'call',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'create_calendar_event',
    description: 'Creates a new event in the user\'s calendar, collecting details like title, start/end times, and location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING', description: 'The title or summary of the event.' },
        startTime: { type: 'STRING', description: 'The start time of the event in ISO 8601 format.' },
        endTime: { type: 'STRING', description: 'The end time of the event in ISO 8601 format.' },
        location: { type: 'STRING', description: 'The location of the event.' },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'event',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'recall_from_conversation',
    description: 'Searches the current user\'s past conversation history to find relevant information or context to answer a question. Use this when the user asks about something discussed previously (e.g., "what did we talk about yesterday?", "what was the name of the client I mentioned?").',
    parameters: {
      type: 'OBJECT',
      properties: {
        search_query: { type: 'STRING', description: 'A specific question or topic to search for in the conversation history.' },
      },
      required: ['search_query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'history',
    postWebhookUrl: 'USE_SUPABASE_FUNCTION', // Placeholder for Supabase function
    getStatusWebhookUrl: '',
  },
  {
    name: 'search_long_term_memory',
    description: "Searches the user's entire conversation history from all past sessions to find information about previous discussions, decisions, or facts. Use this for questions about the distant past.",
    parameters: {
      type: 'OBJECT',
      properties: {
        search_query: { type: 'STRING', description: 'A specific question or topic to search for in the long-term memory.' },
      },
      required: ['search_query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'manage_search',
    postWebhookUrl: 'USE_SUPABASE_FUNCTION', // Placeholder for Supabase function
    getStatusWebhookUrl: '',
  },
  {
    name: 'generate_image',
    description: 'Generates a photorealistic image using the imagen-4.0-generate-001 model based on a detailed text description. Specify subject, style, and aspect ratio (e.g., "1:1", "9:16").',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'A detailed description of the image to generate.' },
        aspectRatio: { type: 'STRING', description: 'The aspect ratio of the image. Defaults to "1:1".' },
      },
      required: ['prompt'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'image',
    postWebhookUrl: '', // This tool is handled natively
    getStatusWebhookUrl: '',
  },
  {
    name: 'edit_image',
    description: 'Edits an image based on a text prompt using the gemini-2.5-flash-image-preview model. You must first provide an image in the chat.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'A detailed description of the edits to make to the image.' },
      },
      required: ['prompt'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'tune',
    postWebhookUrl: '', // This tool would be handled natively
    getStatusWebhookUrl: '',
  },
  {
    name: 'generate_video',
    description: 'Generates a short, high-quality video using the veo-2.0-generate-001 model based on a text prompt. This process may take a few minutes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'A detailed description of the video to generate.' },
      },
      required: ['prompt'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'movie',
    postWebhookUrl: '', // This tool is handled natively
    getStatusWebhookUrl: '',
  },
  {
    name: 'create_document',
    description: 'Creates a professional business document of a specified type. The document will be generated as a downloadable PDF file. Available document types: Invoice, Purchase Order, Expense Report, Payslip, Balance Sheet, Income Statement, Cash Flow Statement, Financial Projections, Offer Letter, Employment Contract, Employee Handbook, Job Description, Performance Review, Termination Letter, Onboarding Checklist, Business Plan, Non-Disclosure Agreement (NDA), Meeting Minutes, Terms of Service, Privacy Policy, Lease Agreement, Shareholder Agreement, Sales Proposal, Marketing Plan, Press Release, Sales Report, Standard Operating Procedures (SOPs), Project Plan, Inventory Report, Supplier Contract.',
    parameters: {
        type: 'OBJECT',
        properties: {
            document_type: { type: 'STRING', description: 'The type of business document to create (e.g., "Offer Letter", "Invoice").' },
            details: { type: 'STRING', description: 'Any specific details or content to include in the document. For example, for an invoice, this could be "Invoice for 10 hours of consulting work at $100/hour for client XYZ Corp".' }
        },
        required: ['document_type', 'details'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'description',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'create_business_presentation',
    description: 'Generates a complete business presentation with images, narration, and transitions based on a topic. The final output is a downloadable video file (WEBM format).',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: { type: 'STRING', description: 'The main topic of the presentation.' },
        num_slides: { type: 'NUMBER', description: 'The desired number of slides for the presentation. Defaults to 5.' },
      },
      required: ['topic'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'slideshow',
    postWebhookUrl: '', // Natively handled
    getStatusWebhookUrl: '',
  },
  {
    name: 'create_music',
    description: 'Generates a musical piece. Describe the genre, mood, instruments, and desired duration. Requires a webhook or a future compatible Gemini model (e.g., Lyra 2).',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'A detailed description of the music to generate (e.g., "A melancholic piano melody with ambient rain sounds").' },
        duration: { type: 'NUMBER', description: 'The desired duration of the music in seconds. Defaults to 30.' },
      },
      required: ['prompt'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'music_note',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'summarize_text',
    description: 'Summarizes a long piece of text into key points using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The text to be summarized.' },
        length: { type: 'STRING', description: 'The desired length of the summary (e.g., "one sentence", "a paragraph", "3 bullet points"). Defaults to "a paragraph".' },
      },
      required: ['text'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'subject',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'translate_text',
    description: 'Translates text from a source language to a target language using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The text to be translated.' },
        target_language: { type: 'STRING', description: 'The language to translate the text into (e.g., "Spanish", "Japanese").' },
        source_language: { type: 'STRING', description: 'The source language of the text. If omitted, the model will attempt to auto-detect it.' },
      },
      required: ['text', 'target_language'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'translate',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'draft_social_media_post',
    description: 'Drafts a social media post for a specific platform using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: { type: 'STRING', description: 'The topic or content of the post.' },
        platform: { type: 'STRING', description: 'The social media platform (e.g., "LinkedIn", "Twitter", "Instagram").' },
        tone: { type: 'STRING', description: 'The desired tone of the post (e.g., "professional", "witty", "inspirational"). Defaults to "professional".' },
      },
      required: ['topic', 'platform'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'campaign',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'analyze_sentiment',
    description: 'Analyzes the sentiment (e.g., positive, negative, neutral) of a block of text using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The text to be analyzed.' },
      },
      required: ['text'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'sentiment_satisfied',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'extract_keywords',
    description: 'Extracts the main keywords or topics from a block of text using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING', description: 'The text to extract keywords from.' },
      },
      required: ['text'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'key',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'generate_quiz',
    description: 'Creates a multiple-choice quiz on a given subject using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: { type: 'STRING', description: 'The subject or topic for the quiz.' },
        num_questions: { type: 'NUMBER', description: 'The number of questions to generate. Defaults to 5.' },
      },
      required: ['topic'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'quiz',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'write_code_snippet',
    description: 'Generates a code snippet in a specified programming language using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        task: { type: 'STRING', description: 'A description of the problem the code should solve.' },
        language: { type: 'STRING', description: 'The programming language for the code snippet (e.g., "Python", "JavaScript").' },
      },
      required: ['task', 'language'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'code',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'explain_code_snippet',
    description: 'Explains what a given piece of code does in plain language using gemini-2.5-flash.',
    parameters: {
      type: 'OBJECT',
      properties: {
        code: { type: 'STRING', description: 'The code snippet to be explained.' },
      },
      required: ['code'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'integration_instructions',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'manage_google_drive',
    description: 'Finds, shares, and manages files and documents within Google Drive.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'The action to perform (e.g., "find_file", "share_document").' },
        fileName: { type: 'STRING', description: 'The name of the file or document.' },
        recipient: { type: 'STRING', description: 'The person or email to share the file with.' },
      },
      required: ['action', 'fileName'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'folder_managed',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'send_gmail_message',
    description: 'Sends an email to a specified recipient via Gmail.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'The email address of the recipient.' },
        subject: { type: 'STRING', description: 'The subject line of the email.' },
        message: { type: 'STRING', description: 'The body content of the email.' },
      },
      required: ['recipient', 'subject', 'message'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'mail',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'send_whatsapp_message',
    description: 'Sends a message to a contact on WhatsApp.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'The name or phone number of the WhatsApp contact in E.164 format (e.g., +14155552671).' },
        message: { type: 'STRING', description: 'The content of the message.' },
      },
      required: ['recipient', 'message'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'sms',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'send_telegram_message',
    description: 'Sends a message to a contact or channel on Telegram.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'The username or channel ID of the recipient.' },
        message: { type: 'STRING', description: 'The content of the message.' },
      },
      required: ['recipient', 'message'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'send',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'post_to_facebook_page',
    description: 'Posts a status update to a connected Facebook Page.',
    parameters: {
      type: 'OBJECT',
      properties: {
        content: { type: 'STRING', description: 'The text content of the post.' },
      },
      required: ['content'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'facebook',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'send_messenger_message',
    description: 'Sends a message to a contact on Facebook Messenger.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipient: { type: 'STRING', description: 'The name of the Messenger contact.' },
        message: { type: 'STRING', description: 'The content of the message.' },
      },
      required: ['recipient', 'message'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'message',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'post_on_linkedin',
    description: 'Shares a professional update or post on a LinkedIn profile.',
    parameters: {
      type: 'OBJECT',
      properties: {
        content: { type: 'STRING', description: 'The content of the LinkedIn post.' },
      },
      required: ['content'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'work',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'search_web',
    description: 'Performs a web search to find up-to-date information.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search query.' },
      },
      required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'search',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'set_reminder',
    description: 'Sets a reminder for the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        task: {
          type: 'STRING',
          description: 'The task for the reminder.',
        },
        time: {
          type: 'STRING',
          description: 'The time for the reminder in ISO 8601 format.',
        },
      },
      required: ['task', 'time'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'alarm',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
  {
    name: 'manage_files',
    description: 'Handles file uploads and provides information about uploaded files.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'The file action to perform (e.g., "summarize", "analyze").' },
        fileName: { type: 'STRING', description: 'The name of the file to manage.' },
      },
      required: ['action', 'fileName'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
    icon: 'upload_file',
    postWebhookUrl: '',
    getStatusWebhookUrl: '',
  },
];