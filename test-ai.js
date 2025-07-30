import { aiEmailAnalysisService } from '../lib/ai-service';

// Test email data
const testEmail = {
  subject: "Thank you for your interest in the Software Engineer position at TechCorp",
  from: "hr@techcorp.com",
  content: `Dear Candidate,

Thank you for applying to the Software Engineer position at TechCorp. We have received your application and our hiring team will review it carefully.

We will be in touch within the next week with updates on your application status.

Best regards,
TechCorp Hiring Team`
};

async function testAIService() {
  console.log('🧪 Testing Gemini AI Service...');
  console.log('📧 Test Email:', {
    subject: testEmail.subject,
    from: testEmail.from,
    contentPreview: testEmail.content.substring(0, 100) + '...'
  });

  if (!aiEmailAnalysisService.isAvailable()) {
    console.log('❌ AI Service not available - check your API key');
    return;
  }

  try {
    const result = await aiEmailAnalysisService.analyzeEmail(testEmail);
    
    if (result) {
      console.log('✅ AI Analysis Result:', {
        status: result.status,
        company: result.company,
        jobTitle: result.jobTitle,
        confidence: result.confidence,
        reasoning: result.reasoning
      });
    } else {
      console.log('❌ AI Analysis returned null');
    }
  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
  }
}

// Run the test
testAIService();
