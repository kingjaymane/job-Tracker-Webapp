import { GoogleGenerativeAI } from '@google/generative-ai';

interface InterviewPrepResult {
  behavioralQuestions: string[];
  technicalQuestions: string[];
  starMethodGuidance: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  generalTips: string[];
  companyResearchTips: string[];
  questionsToAsk: string[];
}

class InterviewPrepService {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized = false;

  constructor() {
    try {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      
      if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.isInitialized = true;
        console.log('✅ Interview Prep AI service initialized successfully');
      } else {
        console.log('⚠️ Gemini API key not configured for Interview Prep');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Interview Prep AI:', error);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.genAI !== null;
  }

  async generateInterviewPrep(jobDescription: string): Promise<InterviewPrepResult> {
    if (!this.isAvailable() || !this.genAI) {
      console.log('🔄 AI service not available, using fallback questions');
      return this.getFallbackQuestions();
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
Based on the following job description, generate comprehensive interview preparation materials:

JOB DESCRIPTION:
${jobDescription}

Please provide a JSON response with the following structure:
{
  "behavioralQuestions": [
    "Array of 8-10 behavioral interview questions tailored to this specific role and company type"
  ],
  "technicalQuestions": [
    "Array of 5 technical/coding questions relevant to the role's requirements and technologies mentioned"
  ],
  "starMethodGuidance": {
    "situation": "Specific guidance for describing situations relevant to this role",
    "task": "How to articulate tasks and responsibilities for this type of position", 
    "action": "Types of actions that would impress for this role",
    "result": "What kind of results and metrics matter for this position"
  },
  "generalTips": [
    "Array of 6-8 general interview tips specific to this role/industry"
  ],
  "companyResearchTips": [
    "Array of 5-6 specific areas to research about this type of company/role"
  ],
  "questionsToAsk": [
    "Array of 6-8 thoughtful questions the candidate should ask the interviewer, tailored to this role"
  ]
}

Guidelines:
- Make behavioral questions specific to the role's requirements and responsibilities
- Technical questions should match the skill level and technologies mentioned
- STAR method guidance should be tailored to this specific role type
- Include industry-specific tips and research areas
- Questions to ask should demonstrate genuine interest in the role and company
- Ensure all content is professional and actionable

Return ONLY the JSON object, no additional text or markdown formatting.`;

      console.log('📤 Sending request to Gemini API for interview prep...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('📥 Received response from Gemini API');
      console.log('Response length:', text.length);
      
      // Clean the response text and parse JSON
      const cleanedText = text.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*{/, '{')  // Remove any text before the first {
        .replace(/}[^}]*$/, '}'); // Remove any text after the last }
      
      const parsedResult: InterviewPrepResult = JSON.parse(cleanedText);

      // Validate the structure
      if (!this.validateResult(parsedResult)) {
        throw new Error('Invalid response structure from AI');
      }

      console.log('✅ Successfully generated interview prep with AI');
      return parsedResult;
    } catch (error) {
      console.error('❌ Failed to generate AI interview prep:', error);
      console.log('🔄 Falling back to default questions');
      return this.getFallbackQuestions();
    }
  }

  private validateResult(result: any): result is InterviewPrepResult {
    return (
      result &&
      Array.isArray(result.behavioralQuestions) &&
      Array.isArray(result.technicalQuestions) &&
      result.starMethodGuidance &&
      typeof result.starMethodGuidance.situation === 'string' &&
      typeof result.starMethodGuidance.task === 'string' &&
      typeof result.starMethodGuidance.action === 'string' &&
      typeof result.starMethodGuidance.result === 'string' &&
      Array.isArray(result.generalTips) &&
      Array.isArray(result.companyResearchTips) &&
      Array.isArray(result.questionsToAsk)
    );
  }

  private getFallbackQuestions(): InterviewPrepResult {
    return {
      behavioralQuestions: [
        "Tell me about a time when you had to work under pressure to meet a deadline.",
        "Describe a situation where you had to learn a new technology quickly.",
        "Give me an example of a time when you had to work with a difficult team member.",
        "Tell me about a project you're particularly proud of and your role in it.",
        "Describe a time when you had to make a decision without all the information you needed.",
        "Give me an example of when you had to adapt to a significant change at work.",
        "Tell me about a time when you received constructive criticism and how you handled it.",
        "Describe a situation where you had to take initiative on a project.",
        "Give me an example of a time when you had to explain a complex technical concept to non-technical stakeholders.",
        "Tell me about a time when you made a mistake and how you handled it."
      ],
      technicalQuestions: [
        "How would you approach debugging a performance issue in a web application?",
        "Explain the difference between synchronous and asynchronous programming.",
        "How do you ensure code quality in your projects?",
        "Describe your experience with version control and collaboration workflows.",
        "What factors do you consider when choosing between different technology solutions?"
      ],
      starMethodGuidance: {
        situation: "Set the context by briefly describing the background, company, team, or project you were involved in.",
        task: "Explain what you needed to accomplish, your responsibilities, or the challenge you faced.",
        action: "Describe the specific steps you took, decisions you made, and skills you applied to address the situation.",
        result: "Share the outcomes of your actions, including quantifiable results, lessons learned, and impact on the team or project."
      },
      generalTips: [
        "Research the company's mission, values, and recent news or developments.",
        "Practice your elevator pitch and be ready to explain your background concisely.",
        "Prepare specific examples that demonstrate your problem-solving abilities.",
        "Dress appropriately for the company culture and role level.",
        "Bring multiple copies of your resume and a notepad for taking notes.",
        "Arrive 10-15 minutes early to show punctuality and professionalism.",
        "Maintain good eye contact and positive body language throughout the interview.",
        "Follow up with a thank-you email within 24 hours of the interview."
      ],
      companyResearchTips: [
        "Study the company's website, mission statement, and core values.",
        "Research recent company news, press releases, and industry developments.",
        "Look up the interview team members on LinkedIn if their names are provided.",
        "Understand the company's products, services, and target market.",
        "Research the company's competitors and market position.",
        "Check employee reviews on sites like Glassdoor for company culture insights."
      ],
      questionsToAsk: [
        "What does success look like in this role after the first 90 days?",
        "What are the biggest challenges facing the team/department right now?",
        "How does this role contribute to the company's overall goals?",
        "What opportunities are there for professional development and growth?",
        "Can you describe the team dynamics and collaboration style?",
        "What technologies or tools does the team currently use?",
        "How do you measure performance and provide feedback?",
        "What do you enjoy most about working at this company?"
      ]
    };
  }
}

export const interviewPrepService = new InterviewPrepService();
