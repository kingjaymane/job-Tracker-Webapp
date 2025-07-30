// Debug utility to check new job flagging
// This can help diagnose why some jobs don't get the 'new' flag

export const debugJobImport = (scanResult: any, existingJobs: any[]) => {
  console.log('=== DEBUG JOB IMPORT ===');
  
  const existingEmailMessageIds = new Set(
    existingJobs.filter(job => job.emailMessageId).map(job => job.emailMessageId)
  );
  
  console.log('Existing jobs with email message IDs:', existingEmailMessageIds.size);
  console.log('Jobs found in email scan:', scanResult.jobApplications.length);
  
  const newJobs = scanResult.jobApplications.filter((job: any) => 
    !existingEmailMessageIds.has(job.messageId)
  );
  
  const duplicateJobs = scanResult.jobApplications.filter((job: any) => 
    existingEmailMessageIds.has(job.messageId)
  );
  
  console.log('Jobs that will be added as NEW:', newJobs.length);
  console.log('Jobs that will be skipped (duplicates):', duplicateJobs.length);
  
  console.log('NEW JOBS:', newJobs.map((job: any) => ({
    company: job.company,
    title: job.jobTitle,
    messageId: job.messageId,
    willGetNewFlag: true
  })));
  
  console.log('DUPLICATE JOBS:', duplicateJobs.map((job: any) => ({
    company: job.company,
    title: job.jobTitle,
    messageId: job.messageId,
    alreadyExists: true
  })));
  
  return {
    totalFound: scanResult.jobApplications.length,
    newJobs: newJobs.length,
    duplicates: duplicateJobs.length,
    expectedNewWithFlag: newJobs.length
  };
};
