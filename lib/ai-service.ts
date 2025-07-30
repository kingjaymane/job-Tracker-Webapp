import { GoogleGenerativeAI } from '@google/generative-ai';

interface EmailAnalysisResult {
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'ghosted';
  company: string | null;
  jobTitle: string | null;
  confidence: number;
  reasoning?: string;
}

interface EmailData {
  subject: string;
  from: string;
  content: string;
}

class AIEmailAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized = false;

  constructor() {
    try {
      // Force reload environment variables
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      console.log('🔑 Detailed API Key check:', { 
        hasApiKey: !!apiKey, 
        keyLength: apiKey?.length || 0,
        keyPreview: apiKey?.substring(0, 10) + '...' || 'none',
        isValidKey: apiKey && apiKey !== 'your_gemini_api_key_here',
        envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI')).length
      });
      
      if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.isInitialized = true;
        console.log('✅ Gemini AI service initialized successfully');
      } else {
        console.log('⚠️ Gemini API key not configured, falling back to regex patterns');
        console.log('Available env vars with GEMINI:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
      }
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
    }
  }

  async analyzeEmail(emailData: EmailData): Promise<EmailAnalysisResult | null> {
    if (!this.isInitialized || !this.genAI) {
      console.log('🔄 AI service not available, skipping AI analysis');
      return null; // Fall back to regex patterns
    }

    try {
      console.log('🤖 Starting AI analysis for email:', {
        subject: emailData.subject.substring(0, 50),
        from: emailData.from.substring(0, 30),
        contentLength: emailData.content.length
      });

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent results
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });

      const prompt = this.buildAnalysisPrompt(emailData);
      
      console.log('📤 Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📥 Received AI response:', text.substring(0, 200));
      return this.parseAIResponse(text);
    } catch (error) {
      console.error('❌ Gemini AI analysis failed:', error);
      if (error instanceof Error && error.message?.includes('API key')) {
        console.error('🔑 API Key issue - check your environment variables');
      }
      return null; // Fall back to regex patterns
    }
  }

  private buildAnalysisPrompt(emailData: EmailData): string {
    return `
You are an expert at analyzing job application emails. Analyze this email and extract structured information.

EMAIL DETAILS:
Subject: "${emailData.subject}"
From: "${emailData.from}"
Content: "${emailData.content.substring(0, 2000)}" ${emailData.content.length > 2000 ? '...[truncated]' : ''}

TASK: Extract the following information and respond with ONLY valid JSON:

{
  "status": "applied|interviewing|offered|rejected|ghosted",
  "company": "company name or null",
  "jobTitle": "job title or null", 
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

STATUS DEFINITIONS:
- "applied": Application confirmation, received, under review
- "interviewing": Interview invitation, schedule request, phone screen
- "offered": Job offer, congratulations, welcome to team
- "rejected": Declined, moving forward with other candidates, not selected
- "ghosted": No clear status (very rare, only if truly ambiguous)

COMPANY EXTRACTION:
- Extract from email domain (avoid gmail, yahoo, noreply, etc.)
- Look for "Thank you for applying to [Company]"
- Find company signatures or letterheads
- Return null if clearly generic/automated

JOB TITLE EXTRACTION:
- Look for "applying for [Title]", "position of [Title]"
- Extract from subject line if clear
- Common formats: "Software Engineer", "Product Manager", etc.
- Return null if too generic or unclear

CONFIDENCE SCORING:
- 0.9-1.0: Very clear, unambiguous
- 0.7-0.8: Good indicators, likely correct
- 0.5-0.6: Some ambiguity, moderate confidence
- 0.3-0.4: Unclear, low confidence
- 0.0-0.2: Very uncertain

Respond with ONLY the JSON object, no additional text.
`;
  }

  private parseAIResponse(response: string): EmailAnalysisResult | null {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = response.trim();
      
      // Extract JSON if wrapped in markdown
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanResponse);
      
      // Validate the response structure
      if (!this.isValidAnalysisResult(parsed)) {
        console.error('❌ Invalid AI response structure:', parsed);
        return null;
      }

      console.log('✅ AI analysis successful:', {
        status: parsed.status,
        company: parsed.company,
        jobTitle: parsed.jobTitle,
        confidence: parsed.confidence
      });

      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.error('Raw response:', response);
      return null;
    }
  }

  private isValidAnalysisResult(obj: any): obj is EmailAnalysisResult {
    const validStatuses = ['applied', 'interviewing', 'offered', 'rejected', 'ghosted'];
    
    return (
      obj &&
      typeof obj === 'object' &&
      validStatuses.includes(obj.status) &&
      (obj.company === null || typeof obj.company === 'string') &&
      (obj.jobTitle === null || typeof obj.jobTitle === 'string') &&
      typeof obj.confidence === 'number' &&
      obj.confidence >= 0 &&
      obj.confidence <= 1
    );
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const aiEmailAnalysisService = new AIEmailAnalysisService();
export type { EmailAnalysisResult, EmailData };
