import { NextRequest, NextResponse } from 'next/server';
import { interviewPrepService } from '@/lib/interview-prep-service';

export async function POST(request: NextRequest) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    console.log('� Generating interview prep for job description...');
    const result = await interviewPrepService.generateInterviewPrep(jobDescription);
    
    console.log('✅ Interview prep generated successfully');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in interview prep API:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview preparation materials' },
      { status: 500 }
    );
  }
}
