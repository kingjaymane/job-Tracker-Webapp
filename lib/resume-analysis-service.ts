import { GoogleGenerativeAI } from '@google/generative-ai';

interface ResumeAnalysisResult {
  score: number; // 0-100
  strengths: string[];
  improvements: string[];
  missingSkills: string[];
  keywordGaps: string[];
  experienceAlignment: {
    score: number;
    feedback: string;
  };
  skillsAlignment: {
    score: number;
    feedback: string;
  };
  overallFeedback: string;
  actionableRecommendations: string[];
}

interface ResumeAnalysisInput {
  jobDescription: string;
  resumeText: string;
}

class ResumeAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized = false;

  constructor() {
    try {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      
      if (apiKey && apiKey !== 'your_gemini_api_key_here') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.isInitialized = true;
        console.log('✅ Resume Analysis AI service initialized successfully');
      } else {
        console.log('⚠️ Gemini API key not configured for resume analysis');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Resume Analysis AI:', error);
    }
  }

  async analyzeResume(input: ResumeAnalysisInput): Promise<ResumeAnalysisResult | null> {
    if (!this.isInitialized || !this.genAI) {
      // Use fallback analysis if AI is not available
      return this.performFallbackAnalysis(input);
    }

    try {
      console.log('🤖 Starting resume analysis...');

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', // Use Flash instead of Pro for better quota management
        generationConfig: {
          temperature: 0.2, // Low temperature for consistent, analytical results
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048, // Reduced tokens to save quota
        }
      });

      const prompt = this.buildResumeAnalysisPrompt(input);
      
      console.log('📤 Sending resume analysis request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📥 Received resume analysis response');
      return this.parseResumeAnalysisResponse(text);
    } catch (error) {
      console.error('❌ Resume analysis failed:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('quota')) {
          // Use fallback analysis for quota issues
          console.log('🔄 Using fallback analysis due to quota limits...');
          return this.performFallbackAnalysis(input);
        } else if (error.message.includes('API key')) {
          throw new Error('Invalid API key. Please check your Gemini API configuration.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
      }
      
      // Use fallback for other errors too
      console.log('🔄 Using fallback analysis due to error...');
      return this.performFallbackAnalysis(input);
    }
  }

  private buildResumeAnalysisPrompt(input: ResumeAnalysisInput): string {
    return `
You are an expert ATS (Applicant Tracking System) and resume optimization specialist. Analyze how well this resume matches the given job description and provide a comprehensive assessment.

JOB DESCRIPTION:
"""
${input.jobDescription}
"""

RESUME:
"""
${input.resumeText}
"""

ANALYSIS REQUIREMENTS:
1. Calculate an overall match score (0-100) where 100 = perfect alignment
2. Identify specific strengths where the resume aligns well
3. Point out areas for improvement
4. List missing skills/technologies/keywords from the job description
5. Suggest specific keywords and phrases to add
6. Evaluate experience level alignment
7. Assess technical skills alignment
8. Provide actionable recommendations

Respond with ONLY valid JSON in this exact format:

{
  "score": number (0-100),
  "strengths": [
    "Specific strength 1",
    "Specific strength 2"
  ],
  "improvements": [
    "Improvement area 1",
    "Improvement area 2"
  ],
  "missingSkills": [
    "Missing skill/technology 1",
    "Missing skill/technology 2"
  ],
  "keywordGaps": [
    "Important keyword 1 not found in resume",
    "Important keyword 2 not found in resume"
  ],
  "experienceAlignment": {
    "score": number (0-100),
    "feedback": "Detailed feedback about experience alignment"
  },
  "skillsAlignment": {
    "score": number (0-100),
    "feedback": "Detailed feedback about skills alignment"
  },
  "overallFeedback": "Comprehensive summary of the analysis",
  "actionableRecommendations": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3"
  ]
}

ANALYSIS GUIDELINES:
- Be specific and actionable in recommendations
- Focus on ATS-friendly improvements
- Consider both hard and soft skills
- Look for quantifiable achievements alignment
- Check for industry-specific terminology
- Evaluate formatting and keyword density
- Consider experience level requirements
- Look for certification/education alignment

Provide detailed, professional analysis that helps improve the resume's ATS compatibility and human reviewer appeal.
`;
  }

  private parseResumeAnalysisResponse(response: string): ResumeAnalysisResult {
    try {
      // Clean the response to extract JSON
      let jsonStr = response.trim();
      
      // Remove any markdown formatting
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields and provide defaults
      const result: ResumeAnalysisResult = {
        score: Math.max(0, Math.min(100, parsed.score || 0)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        keywordGaps: Array.isArray(parsed.keywordGaps) ? parsed.keywordGaps : [],
        experienceAlignment: {
          score: Math.max(0, Math.min(100, parsed.experienceAlignment?.score || 0)),
          feedback: parsed.experienceAlignment?.feedback || 'No experience feedback available'
        },
        skillsAlignment: {
          score: Math.max(0, Math.min(100, parsed.skillsAlignment?.score || 0)),
          feedback: parsed.skillsAlignment?.feedback || 'No skills feedback available'
        },
        overallFeedback: parsed.overallFeedback || 'Analysis completed',
        actionableRecommendations: Array.isArray(parsed.actionableRecommendations) 
          ? parsed.actionableRecommendations 
          : []
      };

      console.log('✅ Resume analysis parsed successfully:', {
        score: result.score,
        strengthsCount: result.strengths.length,
        improvementsCount: result.improvements.length,
        recommendationsCount: result.actionableRecommendations.length
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to parse resume analysis response:', error);
      console.log('Raw response:', response);
      
      // Return a fallback result
      return {
        score: 0,
        strengths: [],
        improvements: ['Unable to analyze resume - please try again'],
        missingSkills: [],
        keywordGaps: [],
        experienceAlignment: {
          score: 0,
          feedback: 'Analysis failed'
        },
        skillsAlignment: {
          score: 0,
          feedback: 'Analysis failed'
        },
        overallFeedback: 'Unable to complete analysis. Please check your inputs and try again.',
        actionableRecommendations: ['Verify your resume text and job description are complete', 'Try again with the analysis']
      };
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  private performFallbackAnalysis(input: ResumeAnalysisInput): ResumeAnalysisResult {
    console.log('🔧 Performing pattern-based fallback analysis...');
    
    const jobDesc = input.jobDescription.toLowerCase();
    const resume = input.resumeText.toLowerCase();
    
    // Basic keyword matching
    const jobKeywords = this.extractKeywords(jobDesc);
    const resumeKeywords = this.extractKeywords(resume);
    
    // Calculate basic matches
    const matchedKeywords = jobKeywords.filter(keyword => 
      resumeKeywords.some(rKeyword => rKeyword.includes(keyword) || keyword.includes(rKeyword))
    );
    
    const keywordMatchRate = jobKeywords.length > 0 ? 
      (matchedKeywords.length / jobKeywords.length) * 100 : 0;
    
    // Basic scoring
    const baseScore = Math.min(Math.max(keywordMatchRate * 0.8, 20), 85);
    
    // Missing skills analysis
    const missingSkills = jobKeywords.filter(keyword => 
      !resumeKeywords.some(rKeyword => rKeyword.includes(keyword) || keyword.includes(rKeyword))
    ).slice(0, 10); // Limit to top 10
    
    return {
      score: Math.round(baseScore),
      strengths: this.generateFallbackStrengths(matchedKeywords),
      improvements: this.generateFallbackImprovements(baseScore),
      missingSkills: missingSkills,
      keywordGaps: missingSkills.slice(0, 5),
      experienceAlignment: {
        score: Math.round(baseScore * 0.9),
        feedback: 'Basic pattern analysis completed. For detailed experience analysis, AI service is required.'
      },
      skillsAlignment: {
        score: Math.round(baseScore * 1.1),
        feedback: `Found ${matchedKeywords.length} matching keywords out of ${jobKeywords.length} job requirements.`
      },
      overallFeedback: `Pattern-based analysis complete. Resume matches ${Math.round(keywordMatchRate)}% of key job requirements. For detailed AI analysis, please try again when quota resets.`,
      actionableRecommendations: this.generateFallbackRecommendations(missingSkills, baseScore)
    };
  }

  private extractKeywords(text: string): string[] {
    // Common tech skills and job-related keywords
    const techSkills = [
      'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'node',
      'express', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'docker', 'kubernetes',
      'git', 'ci/cd', 'agile', 'scrum', 'rest', 'graphql', 'html', 'css', 'sass',
      'tailwind', 'bootstrap', 'webpack', 'babel', 'jest', 'cypress', 'testing',
      'leadership', 'management', 'communication', 'problem-solving', 'teamwork'
    ];
    
    const foundKeywords: string[] = [];
    
    techSkills.forEach(skill => {
      if (text.includes(skill)) {
        foundKeywords.push(skill);
      }
    });
    
    // Also extract years of experience
    const experienceMatch = text.match(/(\d+)\+?\s*(years?|yrs?)/g);
    if (experienceMatch) {
      foundKeywords.push(...experienceMatch);
    }
    
    return foundKeywords;
  }

  private generateFallbackStrengths(matchedKeywords: string[]): string[] {
    if (matchedKeywords.length === 0) {
      return ['Resume contains relevant professional content'];
    }
    
    return [
      `Resume includes ${matchedKeywords.length} relevant technical skills`,
      `Good keyword alignment with job requirements`,
      'Professional formatting and structure detected'
    ].slice(0, Math.min(matchedKeywords.length + 1, 5));
  }

  private generateFallbackImprovements(score: number): string[] {
    const improvements = [];
    
    if (score < 50) {
      improvements.push('Consider adding more technical skills that match the job requirements');
      improvements.push('Include specific technologies mentioned in the job description');
      improvements.push('Add quantifiable achievements and metrics');
    } else if (score < 75) {
      improvements.push('Fine-tune keyword usage to better match job requirements');
      improvements.push('Add more specific technical details');
    } else {
      improvements.push('Minor keyword optimizations could improve ATS compatibility');
    }
    
    improvements.push('Use action verbs to describe accomplishments');
    improvements.push('Ensure consistent formatting throughout the document');
    
    return improvements;
  }

  private generateFallbackRecommendations(missingSkills: string[], score: number): string[] {
    const recommendations = [];
    
    if (missingSkills.length > 0) {
      recommendations.push(`Add these missing skills if you have them: ${missingSkills.slice(0, 3).join(', ')}`);
    }
    
    if (score < 60) {
      recommendations.push('Consider taking courses or gaining experience in the key technologies listed in the job description');
      recommendations.push('Restructure your resume to highlight relevant experience first');
    }
    
    recommendations.push('Use the exact terminology from the job description where applicable');
    recommendations.push('Include a skills section with relevant technologies');
    recommendations.push('Quantify your achievements with specific numbers and metrics');
    
    return recommendations.slice(0, 5);
  }
}

export const resumeAnalysisService = new ResumeAnalysisService();
export type { ResumeAnalysisResult, ResumeAnalysisInput };
