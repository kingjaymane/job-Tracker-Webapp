// Test API endpoint to check Gemini AI integration
import { NextRequest, NextResponse } from 'next/server';
import { aiEmailAnalysisService } from '../../../lib/ai-service';

export async function GET(request: NextRequest) {
  console.log('🧪 Testing AI service...');
  
  const testEmail = {
    subject: "Thank you for your interest in the Software Engineer position",
    from: "hr@testcompany.com",
    content: "Dear Candidate, Thank you for applying to the Software Engineer position at TestCompany. We have received your application and will review it."
  };

  try {
    console.log('🔍 Checking AI service availability...');
    const isAvailable = aiEmailAnalysisService.isAvailable();
    console.log('AI Service Available:', isAvailable);

    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'AI service not available',
        hasApiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
        apiKeyLength: process.env.GOOGLE_GEMINI_API_KEY?.length || 0
      });
    }

    console.log('🤖 Testing AI analysis...');
    const result = await aiEmailAnalysisService.analyzeEmail(testEmail);
    
    return NextResponse.json({
      success: true,
      aiAvailable: true,
      testResult: result,
      message: 'AI service is working correctly'
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      aiAvailable: aiEmailAnalysisService.isAvailable()
    });
  }
}
