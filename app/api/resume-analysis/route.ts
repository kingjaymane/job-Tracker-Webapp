import { NextRequest, NextResponse } from 'next/server';
import { resumeAnalysisService } from '@/lib/resume-analysis-service';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resumeText } = await request.json();

    // Validate inputs
    if (!jobDescription || !resumeText) {
      return NextResponse.json(
        { error: 'Both job description and resume text are required' },
        { status: 400 }
      );
    }

    if (jobDescription.trim().length < 50) {
      return NextResponse.json(
        { error: 'Job description must be at least 50 characters long' },
        { status: 400 }
      );
    }

    if (resumeText.trim().length < 100) {
      return NextResponse.json(
        { error: 'Resume text must be at least 100 characters long' },
        { status: 400 }
      );
    }

    // Check if AI service is available
    if (!resumeAnalysisService.isAvailable()) {
      console.log('⚠️ AI service not available, using fallback analysis...');
    }

    console.log('🔍 Processing resume analysis request...');

    // Perform the analysis (will use fallback if AI fails)
    const analysis = await resumeAnalysisService.analyzeResume({
      jobDescription: jobDescription.trim(),
      resumeText: resumeText.trim()
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Failed to analyze resume. Please try again.' },
        { status: 500 }
      );
    }

    console.log('✅ Resume analysis completed successfully');

    // Check if this was a fallback analysis
    const usingFallback = analysis.overallFeedback.includes('Pattern-based analysis');
    
    return NextResponse.json({
      success: true,
      analysis,
      fallbackUsed: usingFallback,
      message: usingFallback ? 
        'Analysis completed using pattern matching. AI analysis temporarily unavailable due to quota limits.' :
        'Analysis completed using AI.'
    });

  } catch (error) {
    console.error('❌ Resume analysis API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: 'Please check your inputs and try again'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Resume Analysis API',
    status: 'active',
    aiServiceAvailable: resumeAnalysisService.isAvailable()
  });
}
