// Client-side service for job recategorization
// This runs in the browser with proper Firebase Auth context

import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

interface RecategorizationStats {
  totalJobs: number;
  jobsWithEmailData: number;
  jobsWithoutEmailData: number;
  recentlyAnalyzed: number;
  needsAnalysis: number;
  statusBreakdown: {
    applied: number;
    interviewing: number;
    offered: number;
    rejected: number;
    ghosted: number;
  };
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
      reasoning: 'No email data available for analysis'
    };
  }

  // For now, use enhanced pattern matching (client-side doesn't have AI service access)
  console.log(`🔄 Analyzing job with patterns: ${job.companyName} - ${job.jobTitle}`);
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

export class JobRecategorizationService {
  
  async getRecategorizationStats(userId: string): Promise<{
    stats: RecategorizationStats;
    aiServiceAvailable: boolean;
    recommendations: {
      shouldRunRecategorization: boolean;
      potentialImpact: number;
      message: string;
    };
  }> {
    try {
      console.log('🔍 Getting recategorization stats for user:', userId);

      // Get all jobs for the user using the existing client-side approach
      const jobsRef = collection(db, 'jobApplications');
      const q = query(jobsRef, where('userId', '==', userId));
      const jobsSnapshot = await getDocs(q);

      console.log(`📄 Found ${jobsSnapshot.docs.length} job documents`);

      const stats: RecategorizationStats = {
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

      let aiServiceAvailable = false;
      // Client-side doesn't have direct AI service access
      // AI analysis would need to be done through API calls
      console.log('ℹ️ AI service not available in client-side context');

      console.log('📊 Stats calculated:', stats);

      return {
        stats,
        aiServiceAvailable,
        recommendations: {
          shouldRunRecategorization: stats.needsAnalysis > 0,
          potentialImpact: stats.jobsWithEmailData,
          message: stats.needsAnalysis > 0 
            ? `${stats.needsAnalysis} jobs could benefit from AI recategorization`
            : 'All jobs have been recently analyzed'
        }
      };

    } catch (error) {
      console.error('❌ Error getting recategorization stats:', error);
      throw error;
    }
  }

  async runRecategorization(
    userId: string, 
    mode: 'analyze' | 'update' = 'analyze', 
    forceUpdate: boolean = false
  ): Promise<RecategorizationResult> {
    try {
      console.log(`🔄 Starting job recategorization for user: ${userId}, mode: ${mode}`);

      // Get all jobs for the user
      const jobsRef = collection(db, 'jobApplications');
      const q = query(jobsRef, where('userId', '==', userId));
      const jobsSnapshot = await getDocs(q);

      if (jobsSnapshot.empty) {
        console.log('No jobs found for user');
        return {
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
        };
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
            if (daysSinceAnalysis < 7) {
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

      console.log('📊 Recategorization Summary:', result);
      return result;

    } catch (error) {
      console.error('Error in job recategorization:', error);
      throw error;
    }
  }
}

export const jobRecategorizationService = new JobRecategorizationService();
