import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { aiEmailAnalysisService } from '@/lib/ai-service';

// Import Firebase Admin for server-side operations
let admin: any = null;
try {
  admin = require('firebase-admin');
} catch (err) {
  console.log('Firebase Admin not available, using client SDK');
}

interface JobData {
  id: string;
  companyName: string;
  jobTitle: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'ghosted';
  emailSubject?: string;
  emailFrom?: string;
  confidence?: number;
  lastAnalyzed?: string;
  analysisMethod?: 'ai' | 'regex' | 'manual';
  [key: string]: any;
}

interface RecategorizationResult {
  totalJobs: number;
  analyzedJobs: number;
  updatedJobs: number;
  errors: string[];
  analysisDetails: {
    aiAnalyzed: number;
    regexFallback: number;
    skipped: number;
    statusChanges: {
      from: string;
      to: string;
      company: string;
      jobTitle: string;
    }[];
  };
}

// Enhanced function that uses AI to analyze job data and recategorize
async function analyzeJobWithAI(job: JobData): Promise<{
  newStatus: string;
  newCompany: string | null;
  newJobTitle: string | null;
  confidence: number;
  method: 'ai' | 'regex' | 'insufficient_data';
  reasoning?: string;
}> {
  // Check if we have email data to analyze
  if (!job.emailSubject && !job.emailFrom) {
    return {
      newStatus: job.status,
      newCompany: job.companyName,
      newJobTitle: job.jobTitle,
      confidence: 0.1,
      method: 'insufficient_data',
      reasoning: 'No email data available for AI analysis'
    };
  }

  // Prepare email data for AI analysis
  const emailData = {
    subject: job.emailSubject || '',
    from: job.emailFrom || '',
    content: `Company: ${job.companyName}, Position: ${job.jobTitle}. Subject: ${job.emailSubject || ''}`
  };

  // Try AI analysis first if available
  if (aiEmailAnalysisService.isAvailable()) {
    try {
      console.log(`🤖 AI analyzing job: ${job.companyName} - ${job.jobTitle}`);
      const aiResult = await aiEmailAnalysisService.analyzeEmail(emailData);

      if (aiResult && aiResult.confidence >= 0.3) {
        console.log(`✅ AI analysis successful for ${job.companyName} (confidence: ${aiResult.confidence})`);
        return {
          newStatus: aiResult.status,
          newCompany: aiResult.company || job.companyName,
          newJobTitle: aiResult.jobTitle || job.jobTitle,
          confidence: aiResult.confidence,
          method: 'ai',
          reasoning: aiResult.reasoning
        };
      } else {
        console.log(`⚠️ AI confidence too low for ${job.companyName}, using existing data`);
      }
    } catch (error) {
      console.error(`❌ AI analysis failed for ${job.companyName}:`, error);
    }
  }

  // If AI isn't available or confidence is low, use enhanced pattern matching
  const enhancedStatus = analyzeJobWithPatterns(job);
  return {
    newStatus: enhancedStatus.status,
    newCompany: enhancedStatus.company || job.companyName,
    newJobTitle: enhancedStatus.jobTitle || job.jobTitle,
    confidence: enhancedStatus.confidence,
    method: 'regex',
    reasoning: enhancedStatus.reasoning
  };
}

// Enhanced pattern-based analysis for jobs without AI
function analyzeJobWithPatterns(job: JobData): {
  status: string;
  company: string | null;
  jobTitle: string | null;
  confidence: number;
  reasoning: string;
} {
  const emailSubject = (job.emailSubject || '').toLowerCase();
  const combinedText = emailSubject;

  // Enhanced rejection patterns
  const rejectionIndicators = [
    'we regret to inform',
    'sorry to inform',
    'we are unable to',
    'moving forward with other candidates',
    'decided to pursue other candidates',
    'not a match at this time',
    'not the right fit',
    'unfortunately',
    'position has been filled',
    'we have chosen other candidates',
    'decided not to fill',
    'thank you for your interest, however',
    'wish you the best'
  ];

  // Enhanced offer patterns
  const offerIndicators = [
    'pleased to offer',
    'happy to offer',
    'job offer',
    'offer you the position',
    'congratulations',
    'you have been selected',
    'welcome to the team',
    'offer letter',
    'compensation package',
    'start date'
  ];

  // Enhanced interview patterns
  const interviewIndicators = [
    'interview',
    'phone screen',
    'video call',
    'schedule a call',
    'technical screen',
    'coding challenge',
    'next round',
    'meet with',
    'next step'
  ];

  // Enhanced application confirmation patterns
  const appliedIndicators = [
    'application received',
    'thank you for applying',
    'received your application',
    'under review',
    'will review',
    'will be in touch'
  ];

  let newStatus = job.status;
  let confidence = 0.3;
  let reasoning = 'Status maintained based on existing classification';

  // Check for rejection first (most specific)
  if (rejectionIndicators.some(indicator => combinedText.includes(indicator))) {
    newStatus = 'rejected';
    confidence = 0.8;
    reasoning = 'Strong rejection language detected in email content';
  }
  // Check for offers
  else if (offerIndicators.some(indicator => combinedText.includes(indicator))) {
    newStatus = 'offered';
    confidence = 0.9;
    reasoning = 'Offer language detected in email content';
  }
  // Check for interviews
  else if (interviewIndicators.some(indicator => combinedText.includes(indicator))) {
    newStatus = 'interviewing';
    confidence = 0.7;
    reasoning = 'Interview-related language detected in email content';
  }
  // Check for application confirmations
  else if (appliedIndicators.some(indicator => combinedText.includes(indicator))) {
    newStatus = 'applied';
    confidence = 0.6;
    reasoning = 'Application confirmation language detected';
  }

  return {
    status: newStatus,
    company: job.companyName,
    jobTitle: job.jobTitle,
    confidence,
    reasoning
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Job recategorization request received');
    
    const body = await request.json();
    const { userId, mode = 'analyze', forceUpdate = false } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Starting job recategorization for user: ${userId}, mode: ${mode}`);
    console.log('🔧 AI Service check:', {
      hasGeminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
      aiServiceAvailable: aiEmailAnalysisService.isAvailable()
    });

    // Get all jobs for the user
    const jobsRef = collection(db, 'jobApplications');
    const q = query(jobsRef, where('userId', '==', userId));
    const jobsSnapshot = await getDocs(q);

    if (jobsSnapshot.empty) {
      console.log('No jobs found for user');
      return NextResponse.json({ 
        message: 'No jobs found to recategorize',
        result: {
          totalJobs: 0,
          analyzedJobs: 0,
          updatedJobs: 0,
          errors: [],
          analysisDetails: {
            aiAnalyzed: 0,
            regexFallback: 0,
            skipped: 0,
            statusChanges: []
          }
        }
      });
    }

    console.log(`Found ${jobsSnapshot.docs.length} jobs to analyze`);

    const result: RecategorizationResult = {
      totalJobs: jobsSnapshot.docs.length,
      analyzedJobs: 0,
      updatedJobs: 0,
      errors: [],
      analysisDetails: {
        aiAnalyzed: 0,
        regexFallback: 0,
        skipped: 0,
        statusChanges: []
      }
    };

    // Process each job
    for (const jobDoc of jobsSnapshot.docs) {
      try {
        const jobData = { id: jobDoc.id, ...jobDoc.data() } as JobData;
        
        // Skip if already analyzed recently (unless forced)
        if (!forceUpdate && jobData.lastAnalyzed) {
          const lastAnalyzed = new Date(jobData.lastAnalyzed);
          const daysSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceAnalysis < 7) { // Skip if analyzed within 7 days
            console.log(`Skipping recently analyzed job: ${jobData.companyName}`);
            result.analysisDetails.skipped++;
            continue;
          }
        }

        console.log(`Analyzing job: ${jobData.companyName} - ${jobData.jobTitle} (current status: ${jobData.status})`);
        result.analyzedJobs++;

        // Analyze the job with AI/patterns
        const analysis = await analyzeJobWithAI(jobData);

        // Track analysis method
        if (analysis.method === 'ai') {
          result.analysisDetails.aiAnalyzed++;
        } else if (analysis.method === 'regex') {
          result.analysisDetails.regexFallback++;
        } else {
          result.analysisDetails.skipped++;
        }

        // Check if we need to update the job
        const statusChanged = analysis.newStatus !== jobData.status;
        const companyChanged = analysis.newCompany && analysis.newCompany !== jobData.companyName;
        const titleChanged = analysis.newJobTitle && analysis.newJobTitle !== jobData.jobTitle;

        if (statusChanged || companyChanged || titleChanged) {
          if (mode === 'update') {
            // Update the job in Firestore
            const jobRef = doc(db, 'jobApplications', jobData.id);
            const updates: any = {
              lastAnalyzed: new Date().toISOString(),
              analysisMethod: analysis.method,
              confidence: analysis.confidence
            };

            if (statusChanged) {
              updates.status = analysis.newStatus;
              result.analysisDetails.statusChanges.push({
                from: jobData.status,
                to: analysis.newStatus,
                company: jobData.companyName,
                jobTitle: jobData.jobTitle
              });
            }

            if (companyChanged) {
              updates.companyName = analysis.newCompany;
            }

            if (titleChanged) {
              updates.jobTitle = analysis.newJobTitle;
            }

            if (analysis.reasoning) {
              updates.analysisReasoning = analysis.reasoning;
            }

            await updateDoc(jobRef, updates);
            result.updatedJobs++;

            console.log(`✅ Updated job: ${jobData.companyName}`, {
              statusChange: statusChanged ? `${jobData.status} → ${analysis.newStatus}` : 'none',
              companyChange: companyChanged ? `${jobData.companyName} → ${analysis.newCompany}` : 'none',
              titleChange: titleChanged ? `${jobData.jobTitle} → ${analysis.newJobTitle}` : 'none',
              confidence: analysis.confidence,
              method: analysis.method
            });
          } else {
            // Just log what would be changed (analyze mode)
            console.log(`📋 Would update job: ${jobData.companyName}`, {
              statusChange: statusChanged ? `${jobData.status} → ${analysis.newStatus}` : 'none',
              companyChange: companyChanged ? `${jobData.companyName} → ${analysis.newCompany}` : 'none',
              titleChange: titleChanged ? `${jobData.jobTitle} → ${analysis.newJobTitle}` : 'none',
              confidence: analysis.confidence,
              method: analysis.method,
              reasoning: analysis.reasoning
            });
            
            if (statusChanged) {
              result.analysisDetails.statusChanges.push({
                from: jobData.status,
                to: analysis.newStatus,
                company: jobData.companyName,
                jobTitle: jobData.jobTitle
              });
            }
          }
        } else {
          console.log(`✓ No changes needed for: ${jobData.companyName} (confidence: ${analysis.confidence.toFixed(2)})`);
        }

        // Add a small delay to avoid overwhelming the AI service
        if (analysis.method === 'ai') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Error processing job ${jobDoc.id}:`, error);
        result.errors.push(`Failed to process job ${jobDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('📊 Recategorization Summary:', {
      totalJobs: result.totalJobs,
      analyzedJobs: result.analyzedJobs,
      updatedJobs: result.updatedJobs,
      errors: result.errors.length,
      aiAnalyzed: result.analysisDetails.aiAnalyzed,
      regexFallback: result.analysisDetails.regexFallback,
      skipped: result.analysisDetails.skipped,
      statusChanges: result.analysisDetails.statusChanges.length
    });

    return NextResponse.json({
      message: mode === 'update' 
        ? `Successfully recategorized ${result.updatedJobs} jobs out of ${result.totalJobs}` 
        : `Analysis complete: ${result.analysisDetails.statusChanges.length} jobs would be updated`,
      result
    });

  } catch (error) {
    console.error('Error in job recategorization:', error);
    return NextResponse.json({ 
      error: 'Failed to recategorize jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Recategorization stats request received');
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`📊 Getting stats for user: ${userId}`);

    // Get summary of jobs that could benefit from recategorization
    const jobsRef = collection(db, 'jobApplications');
    const q = query(jobsRef, where('userId', '==', userId));
    
    console.log('🔍 Querying Firestore...');
    const jobsSnapshot = await getDocs(q);
    console.log(`📄 Found ${jobsSnapshot.docs.length} job documents`);

    const stats = {
      totalJobs: jobsSnapshot.docs.length,
      jobsWithEmailData: 0,
      jobsWithoutEmailData: 0,
      recentlyAnalyzed: 0,
      needsAnalysis: 0,
      statusBreakdown: {
        applied: 0,
        interviewing: 0,
        offered: 0,
        rejected: 0,
        ghosted: 0
      }
    };

    jobsSnapshot.docs.forEach(doc => {
      try {
        const job = doc.data() as JobData;
        console.log(`Processing job: ${job.companyName || 'Unknown'} - ${job.jobTitle || 'Unknown'}`);
        
        // Count status breakdown
        if (job.status && stats.statusBreakdown.hasOwnProperty(job.status)) {
          stats.statusBreakdown[job.status as keyof typeof stats.statusBreakdown]++;
        }

        // Check if has email data
        if (job.emailSubject || job.emailFrom) {
          stats.jobsWithEmailData++;
        } else {
          stats.jobsWithoutEmailData++;
        }

        // Check if recently analyzed
        if (job.lastAnalyzed) {
          const lastAnalyzed = new Date(job.lastAnalyzed);
          const daysSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceAnalysis < 7) {
            stats.recentlyAnalyzed++;
          } else {
            stats.needsAnalysis++;
          }
        } else {
          stats.needsAnalysis++;
        }
      } catch (docError) {
        console.error('Error processing job document:', docError);
      }
    });

    console.log('📊 Stats calculated:', stats);

    let aiServiceAvailable = false;
    try {
      aiServiceAvailable = aiEmailAnalysisService.isAvailable();
    } catch (aiError) {
      console.error('Error checking AI service availability:', aiError);
    }

    return NextResponse.json({
      message: 'Recategorization analysis summary',
      stats,
      aiServiceAvailable,
      recommendations: {
        shouldRunRecategorization: stats.needsAnalysis > 0,
        potentialImpact: stats.jobsWithEmailData,
        message: stats.needsAnalysis > 0 
          ? `${stats.needsAnalysis} jobs could benefit from AI recategorization`
          : 'All jobs have been recently analyzed'
      }
    });

  } catch (error) {
    console.error('❌ Error getting recategorization stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
