import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Simple recategorization stats request');
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`📊 Getting basic stats for user: ${userId}`);

    // Get basic job count
    const jobsRef = collection(db, 'jobApplications');
    const q = query(jobsRef, where('userId', '==', userId));
    const jobsSnapshot = await getDocs(q);
    
    console.log(`📄 Found ${jobsSnapshot.docs.length} job documents`);

    const stats = {
      totalJobs: jobsSnapshot.docs.length,
      jobsWithEmailData: 0,
      jobsWithoutEmailData: jobsSnapshot.docs.length,
      recentlyAnalyzed: 0,
      needsAnalysis: jobsSnapshot.docs.length,
      statusBreakdown: {
        applied: 0,
        interviewing: 0,
        offered: 0,
        rejected: 0,
        ghosted: 0
      }
    };

    // Count status breakdown safely
    jobsSnapshot.docs.forEach(doc => {
      try {
        const job = doc.data();
        if (job.status) {
          switch (job.status) {
            case 'applied':
              stats.statusBreakdown.applied++;
              break;
            case 'interviewing':
              stats.statusBreakdown.interviewing++;
              break;
            case 'offered':
              stats.statusBreakdown.offered++;
              break;
            case 'rejected':
              stats.statusBreakdown.rejected++;
              break;
            case 'ghosted':
              stats.statusBreakdown.ghosted++;
              break;
          }
        }

        // Check for email data
        if (job.emailSubject || job.emailFrom) {
          stats.jobsWithEmailData++;
          stats.jobsWithoutEmailData--;
        }
      } catch (docError) {
        console.error('Error processing job document:', docError);
      }
    });

    console.log('📊 Basic stats calculated:', stats);

    return NextResponse.json({
      message: 'Basic recategorization analysis',
      stats,
      aiServiceAvailable: false, // Simplified for now
      recommendations: {
        shouldRunRecategorization: stats.totalJobs > 0,
        potentialImpact: stats.jobsWithEmailData,
        message: stats.totalJobs > 0 
          ? `${stats.totalJobs} jobs available for analysis`
          : 'No jobs found to analyze'
      }
    });

  } catch (error) {
    console.error('❌ Error in simple stats endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to get basic stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Analysis functionality temporarily disabled for debugging',
    message: 'Please use the basic stats view for now'
  }, { status: 503 });
}
