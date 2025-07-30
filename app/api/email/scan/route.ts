import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { aiEmailAnalysisService } from '../../../../lib/ai-service';

// Enhanced email analysis functions with job board filtering
function isJobBoardNotification(content: string, from: string, subject: string): boolean {
  // Job board notification patterns to filter out
  const notificationPatterns = [
    // LinkedIn notifications
    'jobs you may be interested in',
    'recommended for you',
    'new jobs posted',
    'job alert',
    'daily job digest',
    'weekly job digest',
    'jobs matching your preferences',
    'similar jobs to ones you',
    'jobs like',
    'jobs near you',
    'trending jobs',
    'premium job insights',
    
    // Indeed notifications
    'jobs matching your search',
    'recommended jobs',
    'jobs from your search',
    'new jobs on indeed',
    'indeed job alert',
    'similar to jobs you',
    'jobs posted today',
    'more jobs like',
    
    // Glassdoor notifications
    'jobs for you',
    'personalized job recommendations',
    'glassdoor job alert',
    'companies hiring',
    'salary insights',
    
    // ZipRecruiter notifications
    'ziprecruiter job alert',
    'jobs posted near',
    'apply to these jobs',
    'one-click apply',
    
    // BeeBee notifications (spam job board)
    'bebee job alert',
    'bebee job notification',
    'new jobs on bebee',
    'bebee professional network',
    'bebee opportunities',
    
    // Generic notification patterns
    'newsletter',
    'weekly update',
    'digest',
    'subscription',
    'unsubscribe',
    'marketing',
    'promotional',
    'sponsored',
    'advertisement',
    'ad:',
    'jobs you might like',
    'might interest you',
    'explore opportunities',
    'browse jobs',
    'view all jobs',
    'see more jobs',
    'apply now to',
    'quick apply',
    'easy apply'
  ];

  const senderPatterns = [
    'notifications@',
    'alerts@',
    'digest@',
    'newsletter@',
    'updates@',
    'marketing@',
    'jobs@indeed',
    'jobs@linkedin',
    'alerts@glassdoor',
    'notification@',
    'automated@',
    'bebee',
    '@bebee.com',
    'jobs@bebee'
  ];

  const contentLower = content.toLowerCase();
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Don't filter out application confirmations even if they're from noreply
  const isApplicationConfirmation = (
    contentLower.includes('thank you for applying') ||
    contentLower.includes('thanks for applying') ||
    contentLower.includes('application received') ||
    contentLower.includes('we have received your application') ||
    contentLower.includes('your application has been received') ||
    contentLower.includes('thank you for your interest') && (
      contentLower.includes('application') || 
      contentLower.includes('position') || 
      contentLower.includes('role')
    )
  );

  if (isApplicationConfirmation) {
    console.log(`Not filtering application confirmation: ${subject.substring(0, 50)}`);
    return false;
  }

  // Check if it's from a notification sender (but be more specific)
  const isNotificationSender = senderPatterns.some(pattern => fromLower.includes(pattern));
  
  // Check if content matches notification patterns
  const hasNotificationPattern = notificationPatterns.some(pattern => 
    contentLower.includes(pattern) || subjectLower.includes(pattern)
  );

  // Additional checks for automated content
  const hasAutomatedIndicators = (
    contentLower.includes('this is an automated') ||
    contentLower.includes('do not reply to this') ||
    contentLower.includes('automatically generated') ||
    subjectLower.includes('[automated]') ||
    subjectLower.includes('auto:')
  );

  return isNotificationSender || hasNotificationPattern || hasAutomatedIndicators;
}

function isJobRelatedEmail(content: string, from: string, subject: string): boolean {
  // First check if it's a job board notification we should filter out
  if (isJobBoardNotification(content, from, subject)) {
    console.log(`Filtered out as job board notification: ${subject.substring(0, 50)}`);
    return false;
  }

  const jobKeywords = [
    'job', 'application', 'position', 'role', 'interview', 'hiring', 'recruiter',
    'hr', 'human resources', 'talent', 'career', 'opportunity', 'employment',
    'candidate', 'resume', 'cv', 'screening', 'phone screen'
  ];

  // Enhanced patterns for application confirmations - expanded based on user feedback
  const applicationConfirmationPatterns = [
    'thank you for applying',
    'thanks for applying',
    'thanks for your application',
    'application received',
    'we have received your application',
    'thanks for your interest',
    'thank you for your interest',
    'application confirmation',
    'successfully submitted',
    'application status',
    'received your resume',
    'thank you for your submission',
    'we received your application',
    'your application has been received',
    'application has been received',
    'we will review your application',
    'we will review it right away',
    'we will review as soon as possible',
    // Additional patterns based on common application confirmations
    'thanks for applying to',
    'thank you for your interest in',
    'application received -',
    'thanks for your application -',
    'we have received your',
    'thank you for submitting',
    'your application for',
    'application for the',
    'received your application for',
    'thank you for your application to',
    'thanks for your application to',
    'application submitted successfully',
    'we appreciate your interest',
    'received your job application',
    'application confirmation number',
    'reference number',
    'application id',
    'next steps in our process',
    'our hiring team will review',
    'your candidacy for',
    'position you applied for',
    'role you applied for'
  ];

  const commonJobSites = [
    'linkedin', 'indeed', 'glassdoor', 'monster', 'ziprecruiter', 'dice',
    'stackoverflow', 'github', 'angel.co', 'wellfound', 'hired', 'bebee'
  ];

  const hasJobKeywords = jobKeywords.some(keyword => content.includes(keyword));
  const hasApplicationConfirmation = applicationConfirmationPatterns.some(pattern => content.includes(pattern));
  const isFromJobSite = commonJobSites.some(site => from.toLowerCase().includes(site));
  
  // Additional check for recruiter emails
  const recruiterIndicators = [
    'recruiter', 'recruiting', 'talent acquisition', 'hr specialist',
    'hiring manager', 'people operations', 'people team'
  ];
  const isFromRecruiter = recruiterIndicators.some(indicator => 
    content.includes(indicator) || from.toLowerCase().includes(indicator)
  );
  
  const isJobRelated = hasJobKeywords || hasApplicationConfirmation || isFromJobSite || isFromRecruiter;
  
  if (!isJobRelated) {
    console.log(`Not job related - Subject: ${subject.substring(0, 50)}, Keywords: ${hasJobKeywords}, Confirmation: ${hasApplicationConfirmation}`);
  }
  
  return isJobRelated;
}

function extractCompany(from: string, body: string = '', subject: string = ''): string | null {
  // Enhanced company extraction with better filtering and patterns
  
  // First try to extract from email domain
  const domainMatch = from.match(/@([^.]+)\./);
  if (domainMatch) {
    const domain = domainMatch[1].toLowerCase();
    
    // Extended list of domains to exclude
    const excludedDomains = [
      'gmail', 'yahoo', 'outlook', 'hotmail', 'aol', 'icloud',
      'linkedin', 'indeed', 'glassdoor', 'monster', 'ziprecruiter', 'dice',
      'stackoverflow', 'github', 'angel', 'wellfound', 'hired', 'bebee',
      'workday', 'greenhouse', 'lever', 'jobvite', 'smartrecruiters',
      'brassring', 'icims', 'kronos', 'successfactors', 'taleo',
      'bamboohr', 'namely', 'zenefits', 'gusto', 'adp',
      'noreply', 'no-reply', 'donotreply', 'automated', 'notifications'
    ];
    
    if (!excludedDomains.includes(domain)) {
      // Clean up and format domain name
      let companyName = domain;
      
      // Remove common prefixes and suffixes
      companyName = companyName.replace(/^(www\.|mail\.|hr\.|jobs\.|careers\.|recruiting\.|talent\.)/, '');
      companyName = companyName.replace(/(corp|inc|llc|ltd|co)$/, '');
      
      // Capitalize properly
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      
      // Only return if it's a reasonable company name
      if (companyName.length >= 2 && companyName.length <= 50) {
        return companyName;
      }
    }
  }

  // Try to extract from email signature or body with enhanced patterns
  const companyPatterns = [
    // Enhanced specific patterns from common application emails
    /thanks?\s+for\s+applying\s+(?:to|at|with)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+for|\s+as|\s+\(|[\.,!]|\s+team|\s+hr|\s+and|\s+we|\s+your|\s+today|\s+yesterday|\s+on|\s*$)/i,
    /thank\s+you\s+for\s+your\s+interest\s+in\s+(?:joining\s+)?([A-Z][a-zA-Z\s&.\-']+?)(?:\s+as|\s+for|\s+\(|[\.,!]|\s+team|\s+we|\s+and|\s+your|\s*$)/i,
    /(?:we\s+at|team\s+at|here\s+at|from\s+the\s+team\s+at)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+are|\s+have|\s+would|\s+want|[\.,!]|\s*$)/i,
    /application\s+(?:to|at|with)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+for|\s+as|\s+has|[\.,!]|\s+team|\s*$)/i,
    
    // Position-specific patterns
    /position\s+(?:at|with)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+as|\s+for|[\.,!]|\s+team|\s*$)/i,
    /role\s+(?:at|with)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+as|\s+for|[\.,!]|\s+team|\s*$)/i,
    
    // Company signature patterns (more specific)
    /([A-Z][a-zA-Z\s&.\-']+?)(?:\s+Inc\.?|\s+Corp\.?|\s+LLC|\s+Ltd\.?|\s+Company|\s+Co\.)/i,
    
    // "From [Company Name]" patterns
    /from\s+(?:the\s+)?([A-Z][a-zA-Z\s&.\-']+?)(?:\s+team|\s+hiring|\s+hr|\s+recruiting|\s+talent|[\.,]|\s*$)/i,
    
    // "We are [Company Name]" patterns
    /(?:we\s+are|i\s+am\s+with|i\s+work\s+at|i\s+represent)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+and|\s+team|[\.,]|\s*$)/i,
    
    // Subject line patterns
    /your\s+application\s+(?:to|at|with)\s+([A-Z][a-zA-Z\s&.\-']+?)(?:\s+for|\s+\-|[\.,]|\s*$)/i
  ];

  const fullText = `${subject} ${body}`;
  
  for (const pattern of companyPatterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      let companyName = match[1].trim();
      
      // Enhanced filtering of generic terms
      const genericTerms = [
        'team', 'hr', 'human resources', 'recruiting', 'talent', 'hiring',
        'notification', 'noreply', 'no reply', 'automated', 'system',
        'admin', 'support', 'customer service', 'help desk', 'info',
        'sales', 'marketing', 'newsletter', 'updates', 'alerts',
        'jobs', 'careers', 'opportunities', 'positions', 'roles',
        'application', 'applications', 'candidate', 'candidates',
        'recruiter', 'recruiters', 'staffing', 'employment',
        'department', 'office', 'division', 'group', 'unit'
      ];
      
      const isGeneric = genericTerms.some(term => 
        companyName.toLowerCase().includes(term) || 
        companyName.toLowerCase() === term
      );
      
      // Check minimum length and format
      if (!isGeneric && companyName.length >= 2 && companyName.length <= 50) {
        // Clean up company name
        companyName = companyName.replace(/[^\w\s&.\-']/g, '').trim();
        
        // Skip if it's just numbers, single letters, or too short after cleaning
        if (companyName.length >= 2 && !/^[\d\s]+$/.test(companyName) && !/^[A-Za-z]\s*$/.test(companyName)) {
          // Proper case formatting
          companyName = companyName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          
          return companyName;
        }
      }
    }
  }

  // Try to extract from "From:" header more intelligently
  const fromNameMatch = from.match(/^(.+?)\s*<.*>$/);
  if (fromNameMatch) {
    let fromName = fromNameMatch[1].trim().replace(/['"]/g, '');
    
    // Skip if it looks like a person's name (first last format)
    const nameWords = fromName.split(/\s+/);
    const looksLikePersonName = nameWords.length === 2 && 
      nameWords.every(word => word.length >= 2 && word.charAt(0) === word.charAt(0).toUpperCase()) &&
      !nameWords.some(word => ['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Co'].includes(word));
    
    if (!looksLikePersonName && fromName.length >= 2 && fromName.length <= 50) {
      const genericTerms = [
        'noreply', 'no-reply', 'donotreply', 'automated', 'system',
        'notification', 'notifications', 'alerts', 'updates', 'digest',
        'jobs', 'careers', 'recruiting', 'hr', 'hiring', 'talent'
      ];
      
      const isGeneric = genericTerms.some(term => fromName.toLowerCase().includes(term));
      
      if (!isGeneric) {
        return fromName;
      }
    }
  }

  return null;
}

function extractJobTitle(content: string, subject: string = ''): string | null {
  // Enhanced job title extraction with more comprehensive patterns
  const fullText = `${subject} ${content}`;
  
  const titlePatterns = [
    // Enhanced specific application patterns
    /(?:applied\s+for|applying\s+for|application\s+for)\s+(?:the\s+|a\s+|an\s+)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+opening|\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Position/role patterns with better context
    /(?:for\s+the|for\s+a|for\s+an|as\s+a|as\s+an)\s+([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+at|\s+with|[\.,]|\s*$)/i,
    /(?:position\s+of|role\s+of|job\s+of|title\s+of)\s+([a-zA-Z0-9\s\-\/]+?)(?:\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Interest and regarding patterns
    /(?:interested\s+in|regarding)\s+(?:the\s+|a\s+|an\s+)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+opening|\s+opportunity|\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Opening and opportunity patterns
    /(?:opening\s+for|opportunity\s+for|vacancy\s+for)\s+(?:a\s+|an\s+|the\s+)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Subject line patterns (more specific)
    /^(?:re:\s*)?(?:application|apply|applying|interested).*?(?:for\s+(?:the\s+|a\s+|an\s+)?)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+at|\s+with|\s+-|[\.,]|\s*$)/i,
    
    // Thank you patterns (from application confirmations)
    /thanks?\s+for\s+applying\s+(?:for\s+(?:the\s+|a\s+|an\s+)?)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+at|\s+with|[\.,]|\s*$)/i,
    /thank\s+you\s+for\s+your\s+interest\s+in\s+(?:the\s+|a\s+|an\s+)?([a-zA-Z0-9\s\-\/]+?)(?:\s+position|\s+role|\s+job|\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Common job titles with better matching
    /(software\s+engineer|full[\s\-]?stack\s+developer|frontend\s+developer|front[\s\-]?end\s+developer|backend\s+developer|back[\s\-]?end\s+developer|web\s+developer|mobile\s+developer|ios\s+developer|android\s+developer|react\s+developer|angular\s+developer|vue\s+developer|node\.?js\s+developer|python\s+developer|java\s+developer|\.net\s+developer|php\s+developer|ruby\s+developer|go\s+developer|rust\s+developer|data\s+scientist|data\s+analyst|data\s+engineer|machine\s+learning\s+engineer|ai\s+engineer|product\s+manager|project\s+manager|program\s+manager|scrum\s+master|agile\s+coach|ui\/ux\s+designer|ux\s+designer|ui\s+designer|graphic\s+designer|visual\s+designer|interaction\s+designer|product\s+designer|devops\s+engineer|site\s+reliability\s+engineer|system\s+administrator|database\s+administrator|network\s+administrator|cloud\s+engineer|aws\s+engineer|azure\s+engineer|gcp\s+engineer|security\s+engineer|cybersecurity\s+analyst|qa\s+engineer|test\s+engineer|automation\s+engineer|quality\s+assurance\s+engineer|business\s+analyst|systems\s+analyst|financial\s+analyst|marketing\s+analyst|technical\s+writer|documentation\s+specialist|sales\s+manager|marketing\s+manager|hr\s+manager|operations\s+manager|customer\s+success\s+manager|account\s+manager|sales\s+representative|business\s+development|software\s+architect|solutions\s+architect|enterprise\s+architect|technical\s+architect|cloud\s+architect|security\s+architect|network\s+engineer|infrastructure\s+engineer|platform\s+engineer|release\s+engineer|build\s+engineer)/i,
    
    // Level-specific titles
    /((?:senior|sr\.?|junior|jr\.?|lead|principal|staff|principal\s+staff|associate|entry[\s\-]?level|mid[\s\-]?level|experienced)\s+[a-zA-Z0-9\s\-\/]+?(?:engineer|developer|programmer|analyst|manager|designer|architect|specialist|coordinator|director|consultant|advisor))/i,
    
    // Generic titles with context (more restrictive)
    /(?:for\s+(?:the\s+|a\s+|an\s+)?)(engineer|developer|programmer|analyst|manager|designer|architect|specialist|coordinator|director|consultant|advisor|lead|supervisor|executive)(?:\s+position|\s+role|\s+job|\s+at|\s+with|[\.,]|\s*$)/i,
    
    // Internship patterns
    /((?:intern|internship|co[\s\-]?op|cooperative\s+education)\s+.*?(?:engineer|developer|analyst|designer|marketing|sales|hr|finance|operations|product|data))/i,
    /((?:summer|winter|spring|fall)\s+(?:intern|internship))/i
  ];

  for (const pattern of titlePatterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();
      
      // Clean up the title
      title = title.replace(/[^\w\s\-\/\.]/g, '').trim();
      
      // Filter out generic terms that aren't job titles
      const excludeTerms = [
        'application', 'position', 'role', 'job', 'opportunity', 'opening',
        'notification', 'alert', 'update', 'digest', 'newsletter',
        'team', 'company', 'organization', 'department', 'division',
        'and', 'or', 'the', 'a', 'an', 'of', 'in', 'at', 'for', 'with',
        'email', 'message', 'confirmation', 'response', 'reply'
      ];
      
      const isValidTitle = title.length >= 3 && 
        title.length <= 80 && 
        !excludeTerms.includes(title.toLowerCase()) &&
        !/^\d+$/.test(title) && // Not just numbers
        /[a-zA-Z]/.test(title) && // Contains letters
        !title.toLowerCase().includes('thank') && // Not part of thank you message
        !title.toLowerCase().includes('application received'); // Not part of confirmation
      
      if (isValidTitle) {
        // Enhanced capitalization for technical terms
        const techWords: Record<string, string> = {
          'ui': 'UI', 'ux': 'UX', 'api': 'API', 'sdk': 'SDK', 'ai': 'AI', 'ml': 'ML',
          'aws': 'AWS', 'gcp': 'GCP', 'ios': 'iOS', 'android': 'Android',
          'javascript': 'JavaScript', 'typescript': 'TypeScript', 'nodejs': 'Node.js',
          'reactjs': 'React.js', 'vuejs': 'Vue.js', 'angularjs': 'Angular.js',
          'devops': 'DevOps', 'qa': 'QA', 'hr': 'HR', 'cto': 'CTO', 'ceo': 'CEO',
          'php': 'PHP', 'sql': 'SQL', 'nosql': 'NoSQL', 'html': 'HTML', 'css': 'CSS',
          'rest': 'REST', 'graphql': 'GraphQL', 'ci/cd': 'CI/CD'
        };
        
        // Split and capitalize each word properly
        title = title.split(/\s+/)
          .map(word => {
            const lowerWord = word.toLowerCase();
            if (techWords[lowerWord]) {
              return techWords[lowerWord];
            }
            // Handle hyphenated words and slashes
            if (word.includes('-') || word.includes('/')) {
              return word.split(/[-\/]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(word.includes('-') ? '-' : '/');
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
        
        return title;
      }
    }
  }

  return null;
}

function determineStatus(content: string): 'applied' | 'interviewing' | 'offered' | 'rejected' | 'ghosted' {
  const contentLower = content.toLowerCase();
  
  // Enhanced rejection patterns - check these first since they're most specific
  const rejectionIndicators = [
    // Direct rejection phrases
    'we regret to inform you',
    'we regret to inform',
    'sorry to inform you',
    'sorry to inform',
    'we are unable to',
    'we cannot',
    'we will not be',
    'we have decided not to',
    'we have chosen to',
    'we are moving forward with other candidates',
    'moving forward with other candidates',
    'we are proceeding with other candidates',
    'proceeding with other candidates',
    'we have selected other candidates',
    'selected other candidates',
    'we have chosen other candidates',
    'chosen other candidates',
    'decided to pursue other candidates',
    'pursue other candidates',
    'going with another candidate',
    'chosen another candidate',
    'selected another candidate',
    
    // Polite rejection phrases
    'not a match at this time',
    'not the right fit',
    'not a good fit',
    'not the best fit',
    'better suited candidates',
    'more qualified candidates',
    'stronger candidates',
    'different direction',
    'different path',
    'other direction',
    'will not be moving forward',
    'not moving forward',
    'will not be proceeding',
    'not proceeding',
    'will not be advancing',
    'not advancing',
    'will not be continuing',
    'not continuing',
    
    // Unfortunately patterns
    'unfortunately',
    'regrettably',
    'we must inform you',
    'we have to inform you',
    'we need to inform you',
    'we are writing to inform you',
    
    // Thank you but no patterns
    'thank you for your interest, however',
    'thank you for your interest but',
    'thank you for applying, however',
    'thank you for applying but',
    'we appreciate your interest, however',
    'we appreciate your interest but',
    'appreciate your time, however',
    'appreciate your time but',
    
    // Position specific rejections
    'position has been filled',
    'role has been filled',
    'job has been filled',
    'position is no longer available',
    'role is no longer available',
    'job is no longer available',
    'decided not to fill',
    'chose not to fill',
    
    // Competition-based rejections
    'highly competitive',
    'many qualified applicants',
    'numerous qualified candidates',
    'large pool of candidates',
    'extensive candidate pool',
    'other applicants',
    'alternative candidates',
    
    // Future opportunity rejections
    'keep your resume on file',
    'keep you in mind for future',
    'future opportunities',
    'future openings',
    'will keep your information',
    'consider you for future',
    'future positions',
    
    // Generic rejection closers
    'wish you the best',
    'best of luck',
    'success in your job search',
    'good luck with your search',
    'wish you success',
    'best wishes',
    'all the best'
  ];

  // Check for rejection first (most specific)
  for (const indicator of rejectionIndicators) {
    if (contentLower.includes(indicator)) {
      return 'rejected';
    }
  }

  // Enhanced offer patterns
  const offerIndicators = [
    'pleased to offer',
    'happy to offer',
    'excited to offer',
    'delighted to offer',
    'thrilled to offer',
    'offer you the position',
    'offer you a position',
    'extend an offer',
    'job offer',
    'employment offer',
    'offer of employment',
    'congratulations',
    'you have been selected',
    'we would like to hire',
    'we want to hire',
    'welcome to the team',
    'welcome aboard',
    'offer letter',
    'compensation package',
    'salary offer',
    'starting salary',
    'benefits package',
    'start date',
    'first day of work',
    'orientation date'
  ];

  for (const indicator of offerIndicators) {
    if (contentLower.includes(indicator)) {
      return 'offered';
    }
  }

  // Enhanced interview patterns
  const interviewIndicators = [
    'interview',
    'phone screen',
    'phone call',
    'video call',
    'zoom call',
    'teams call',
    'schedule a call',
    'set up a call',
    'arrange a call',
    'technical screen',
    'coding challenge',
    'assessment',
    'next round',
    'second round',
    'final round',
    'meet with',
    'speak with',
    'chat with',
    'discussion',
    'conversation',
    'would like to talk',
    'like to speak',
    'schedule a meeting',
    'set up a meeting',
    'arrange a meeting',
    'next step',
    'next steps',
    'follow up',
    'follow-up',
    'move forward',
    'proceed to',
    'advance to'
  ];

  for (const indicator of interviewIndicators) {
    if (contentLower.includes(indicator)) {
      return 'interviewing';
    }
  }

  // Enhanced application confirmation patterns
  const appliedIndicators = [
    'application received',
    'thank you for applying',
    'thanks for applying',
    'received your application',
    'application has been received',
    'thank you for your application',
    'thanks for your application',
    'application confirmation',
    'thank you for your interest',
    'thanks for your interest',
    'we have received your',
    'successfully submitted',
    'application submitted',
    'under review',
    'being reviewed',
    'review your application',
    'reviewing your application',
    'will review',
    'team will review',
    'hiring team will',
    'will be in touch',
    'will contact you',
    'will reach out',
    'will get back to you',
    'hear from us',
    'application status',
    'keep you updated',
    'update you'
  ];

  for (const indicator of appliedIndicators) {
    if (contentLower.includes(indicator)) {
      return 'applied';
    }
  }

  // Default to applied if no clear indicators found
  return 'applied';
}

// Enhanced function that tries AI first, then falls back to regex
async function determineStatusWithAI(content: string, subject: string, from: string): Promise<{
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'ghosted';
  company: string | null;
  jobTitle: string | null;
  confidence: number;
  method: 'ai' | 'regex';
}> {
  // Try AI analysis first if available
  if (aiEmailAnalysisService.isAvailable()) {
    try {
      console.log('🤖 Attempting AI analysis...');
      const aiResult = await aiEmailAnalysisService.analyzeEmail({
        subject,
        from,
        content
      });

      // Lower confidence threshold from 0.5 to 0.3 to accept more AI results
      if (aiResult && aiResult.confidence >= 0.2) { // Even lower threshold
        console.log(`✅ AI analysis successful (confidence: ${aiResult.confidence})`);
        return {
          status: aiResult.status,
          company: aiResult.company,
          jobTitle: aiResult.jobTitle,
          confidence: aiResult.confidence,
          method: 'ai'
        };
      } else if (aiResult) {
        console.log(`⚠️ AI confidence too low (${aiResult.confidence}), falling back to regex`);
      } else {
        console.log('⚠️ AI returned null result, falling back to regex');
      }
    } catch (error) {
      console.error('❌ AI analysis failed, falling back to regex:', error);
    }
  } else {
    console.log('⚠️ AI service not available, using regex patterns');
  }

  // Fallback to regex patterns
  console.log('🔄 Using regex patterns for analysis');
  const regexStatus = determineStatus(content);
  const regexCompany = extractCompany(from, content, subject);
  const regexJobTitle = extractJobTitle(content, subject);
  
  // Calculate confidence based on regex results
  let regexConfidence = 0.3; // Base confidence for regex
  if (regexCompany && regexCompany !== 'Unknown Company') regexConfidence += 0.2;
  if (regexJobTitle && regexJobTitle !== 'Unknown Position') regexConfidence += 0.2;
  if (regexStatus === 'rejected' || regexStatus === 'offered') regexConfidence += 0.2;
  
  return {
    status: regexStatus,
    company: regexCompany,
    jobTitle: regexJobTitle,
    confidence: Math.min(regexConfidence, 0.9),
    method: 'regex'
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Email scan request received');
    console.log('🔧 Environment check:', {
      hasGeminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
      aiServiceAvailable: aiEmailAnalysisService.isAvailable()
    });
    
    const body = await request.json();
    const { credentials } = body;
    
    console.log('Request body:', { credentials: credentials ? 'present' : 'missing' });
    
    if (!credentials) {
      console.log('No credentials provided');
      return NextResponse.json({ error: 'Credentials are required' }, { status: 400 });
    }

    console.log('Setting up OAuth client...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials(credentials);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log('Searching for emails...');
    // Search for job-related emails (expanded date range and even broader search)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180); // Extended to 6 months
    
    // Most comprehensive search query to catch ALL possible job application emails
    const query = `after:${sixMonthsAgo.toISOString().split('T')[0]} (job OR application OR interview OR offer OR position OR hiring OR recruiter OR "received your application" OR "thank you for applying" OR "thanks for applying" OR "application confirmation" OR "thanks for your interest" OR "thank you for your interest" OR "we have received" OR "application received" OR "thank you for your application" OR "application has been received" OR "your application has been received" OR "thanks for your application" OR paypal OR kpmg OR microsoft OR google OR amazon OR meta OR facebook OR apple OR netflix OR salesforce OR oracle OR adobe OR nvidia OR tesla OR uber OR airbnb OR spotify OR twitter OR linkedin OR indeed OR glassdoor)`;

    console.log('Gmail search query:', query);
    console.log('Date range: from', sixMonthsAgo.toISOString().split('T')[0], 'to today');

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50 // Significantly increased to catch more emails
    });

    console.log(`Found ${response.data.messages?.length || 0} messages`);

    const jobApplications = [];
    let totalEmails = 0;
    let aiAnalysisCount = 0;
    let regexAnalysisCount = 0;

    if (response.data.messages) {
      totalEmails = response.data.messages.length;

      for (const message of response.data.messages) {
        try {
          if (!message.id) continue;
          
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const messageData = fullMessage.data;
          if (!messageData?.payload) continue;

          const headers = messageData.payload.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';

          let body = '';
          
          // Function to clean HTML and extract readable text
          const cleanHtmlContent = (htmlContent: string): string => {
            if (!htmlContent) return '';
            
            // Remove CSS styles (including @import, embedded <style> tags, and inline styles)
            let cleaned = htmlContent
              .replace(/@import[^;]+;/g, '') // Remove @import statements
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove <style> blocks
              .replace(/style\s*=\s*["'][^"']*["']/gi, '') // Remove inline style attributes
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove JavaScript
              .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
              .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '') // Remove head section
              .replace(/<meta[^>]*>/gi, '') // Remove meta tags
              .replace(/<link[^>]*>/gi, '') // Remove link tags
              .replace(/\{[^}]*\}/g, '') // Remove remaining CSS rules
              .replace(/font-family:[^;]+;?/gi, '') // Remove font-family declarations
              .replace(/color:[^;]+;?/gi, '') // Remove color declarations
              .replace(/margin:[^;]+;?/gi, '') // Remove margin declarations
              .replace(/padding:[^;]+;?/gi, '') // Remove padding declarations
              .replace(/width:[^;]+;?/gi, '') // Remove width declarations
              .replace(/height:[^;]+;?/gi, '') // Remove height declarations
              .replace(/-webkit-[^;]+;?/gi, '') // Remove webkit prefixes
              .replace(/-ms-[^;]+;?/gi, '') // Remove ms prefixes
              .replace(/mso-[^;]+;?/gi, ''); // Remove Microsoft Office prefixes
            
            // Convert HTML entities and tags to readable text
            cleaned = cleaned
              .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
              .replace(/<\/p>/gi, '\n\n') // Convert </p> to double newlines
              .replace(/<p[^>]*>/gi, '') // Remove <p> tags
              .replace(/<div[^>]*>/gi, '') // Remove <div> tags
              .replace(/<\/div>/gi, '\n') // Convert </div> to newlines
              .replace(/<h[1-6][^>]*>/gi, '\n') // Convert headings
              .replace(/<\/h[1-6]>/gi, '\n\n') // Convert closing headings
              .replace(/<li[^>]*>/gi, '• ') // Convert list items to bullets
              .replace(/<\/li>/gi, '\n') // Add newlines after list items
              .replace(/<[^>]+>/g, ' ') // Remove all remaining HTML tags
              .replace(/&nbsp;/gi, ' ') // Convert non-breaking spaces
              .replace(/&amp;/gi, '&') // Convert ampersands
              .replace(/&lt;/gi, '<') // Convert less than
              .replace(/&gt;/gi, '>') // Convert greater than
              .replace(/&quot;/gi, '"') // Convert quotes
              .replace(/&#39;/gi, "'") // Convert apostrophes
              .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove other HTML entities
              .replace(/\s+/g, ' ') // Collapse multiple spaces
              .replace(/\n\s+/g, '\n') // Remove spaces after newlines
              .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
              .trim();
            
            return cleaned;
          };
          
          // Try to get plain text first, then fall back to cleaned HTML
          if (messageData.payload.body?.data) {
            const rawContent = Buffer.from(messageData.payload.body.data, 'base64').toString();
            body = cleanHtmlContent(rawContent);
          } else if (messageData.payload.parts) {
            // Prefer plain text over HTML
            const textPart = messageData.payload.parts.find((part: any) => 
              part.mimeType === 'text/plain'
            );
            const htmlPart = messageData.payload.parts.find((part: any) => 
              part.mimeType === 'text/html'
            );
            
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString();
            } else if (htmlPart?.body?.data) {
              const htmlContent = Buffer.from(htmlPart.body.data, 'base64').toString();
              body = cleanHtmlContent(htmlContent);
            }
          }
          
          // Additional cleaning for any remaining CSS-like content
          if (body.includes('@import') || body.includes('font-family') || body.includes('-webkit-')) {
            console.log(`Cleaning CSS content from email: ${subject.substring(0, 50)}`);
            body = cleanHtmlContent(body);
          }

          const content = `${subject} ${body}`.toLowerCase();
          
          // Enhanced debug logging for ALL emails found
          console.log(`Processing email ${message.id}:`, {
            subject: subject.substring(0, 80),
            from: from.substring(0, 50),
            date,
            hasJobKeywords: ['job', 'application', 'position', 'role', 'interview', 'hiring', 'recruiter', 'thank you for applying', 'received your application'].some(keyword => content.includes(keyword))
          });
          
          // Debug logging for specific companies and patterns the user mentioned
          if (subject.toLowerCase().includes('paypal') || 
              subject.toLowerCase().includes('kpmg') || 
              subject.toLowerCase().includes('microsoft') || 
              subject.toLowerCase().includes('google') ||
              subject.toLowerCase().includes('thanks for applying') ||
              subject.toLowerCase().includes('thank you for your interest') ||
              subject.toLowerCase().includes('application received') ||
              content.includes('received your application') ||
              content.includes('thank you for applying') ||
              content.includes('thanks for your interest') ||
              content.includes('application confirmation') ||
              from.includes('paypal.com') ||
              from.includes('kpmg.com') ||
              from.includes('microsoft.com') ||
              from.includes('google.com')) {
            console.log(`🔍 DEBUG - Found potential missed email:`, {
              messageId: message.id,
              subject,
              from,
              contentPreview: content.substring(0, 200),
              isJobBoardNotification: isJobBoardNotification(content, from, subject),
              isJobRelated: isJobRelatedEmail(content, from, subject)
            });
          }
          
          if (isJobRelatedEmail(content, from, subject)) {
            // Use AI-enhanced analysis
            const analysisResult = await determineStatusWithAI(content, subject, from);
            
            // Track analysis method
            if (analysisResult.method === 'ai') {
              aiAnalysisCount++;
            } else {
              regexAnalysisCount++;
            }
            
            // Enhanced confidence calculation
            let confidence = analysisResult.confidence;
            
            // Adjust confidence based on various factors
            const company = analysisResult.company || extractCompany(from, body, subject);
            const jobTitle = analysisResult.jobTitle || extractJobTitle(content, subject);
            
            // Company extraction confidence boost
            if (company && company !== 'Unknown Company') {
              if (company.length > 2 && !company.toLowerCase().includes('team')) {
                confidence += 0.1;
              }
            }
            
            // Job title confidence boost
            if (jobTitle && jobTitle !== 'Unknown Position') {
              confidence += 0.1;
            }
            
            // Subject line indicators
            const subjectLower = subject.toLowerCase();
            if (subjectLower.includes('application') && subjectLower.includes('received')) {
              confidence += 0.1;
            } else if (subjectLower.includes('interview') || subjectLower.includes('schedule')) {
              confidence += 0.15;
            } else if (subjectLower.includes('offer') || subjectLower.includes('congratulations')) {
              confidence += 0.2;
            }
            
            // Reduce confidence for potential false positives
            const contentLower = content.toLowerCase();
            if (contentLower.includes('newsletter') || contentLower.includes('digest') || 
                contentLower.includes('marketing') || contentLower.includes('promotional') ||
                contentLower.includes('unsubscribe') || contentLower.includes('you may be interested')) {
              confidence -= 0.3;
            }
            
            // Personal email indicators (higher confidence)
            if (from.includes('@') && !from.includes('noreply') && !from.includes('no-reply')) {
              const fromParts = from.split('@');
              if (fromParts[0] && (fromParts[0].includes('.') || fromParts[0].match(/[a-z]+[A-Z]/))) {
                confidence += 0.1; // Looks like a personal email
              }
            }

            // Cap confidence at 0.95 to leave room for uncertainty
            confidence = Math.min(confidence, 0.95);

            if (confidence >= 0.2) {
              console.log(`✅ Adding job application (${analysisResult.method.toUpperCase()}):`, {
                company: company || 'Unknown Company',
                title: jobTitle || 'Unknown Position', 
                confidence: confidence.toFixed(2),
                subject: subject.substring(0, 60),
                from: from.substring(0, 40),
                status: analysisResult.status,
                method: analysisResult.method
              });
              
              jobApplications.push({
                messageId: message.id,
                threadId: messageData.threadId,
                company: company || 'Unknown Company',
                jobTitle: jobTitle || 'Unknown Position',
                status: analysisResult.status,
                confidence,
                date: new Date(date),
                emailSubject: subject,
                emailFrom: from,
                analysisMethod: analysisResult.method // Track which method was used
              });
            } else {
              console.log(`❌ Skipping email (low confidence ${confidence.toFixed(2)}):`, {
                subject: subject.substring(0, 60),
                from: from.substring(0, 40),
                company,
                jobTitle,
                method: analysisResult.method,
                reason: 'Below threshold'
              });
            }
          }
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
        }
      }
    }

    console.log('📊 Analysis Summary:', {
      totalEmails,
      jobEmailsFound: jobApplications.length,
      aiAnalysisUsed: aiAnalysisCount,
      regexAnalysisUsed: regexAnalysisCount,
      aiServiceAvailable: aiEmailAnalysisService.isAvailable()
    });

    return NextResponse.json({
      totalEmails,
      jobEmailsFound: jobApplications.length,
      jobApplications,
      analysisStats: {
        aiAnalysisUsed: aiAnalysisCount,
        regexAnalysisUsed: regexAnalysisCount
      }
    });

  } catch (error) {
    console.error('Error scanning emails:', error);
    return NextResponse.json({ error: 'Failed to scan emails' }, { status: 500 });
  }
}
