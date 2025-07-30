// Test file for Resume Analysis API
// This is a simple test to verify the resume analysis functionality

const mockJobDescription = `
Senior Software Engineer - Full Stack Development

We are seeking an experienced Senior Software Engineer to join our dynamic development team. 

Key Responsibilities:
- Develop and maintain web applications using React, Next.js, and Node.js
- Work with TypeScript for type-safe development
- Implement responsive designs with Tailwind CSS
- Integrate with RESTful APIs and GraphQL endpoints
- Collaborate with cross-functional teams in an Agile environment
- Write comprehensive unit and integration tests
- Optimize application performance and scalability

Required Skills:
- 5+ years of experience in full-stack development
- Proficiency in React, Next.js, TypeScript, and Node.js
- Experience with modern CSS frameworks (Tailwind, styled-components)
- Knowledge of database technologies (PostgreSQL, MongoDB)
- Familiarity with cloud platforms (AWS, Azure, GCP)
- Strong understanding of CI/CD pipelines
- Experience with testing frameworks (Jest, Cypress)
- Excellent problem-solving and communication skills

Preferred Qualifications:
- Bachelor's degree in Computer Science or related field
- Experience with Docker and Kubernetes
- Knowledge of microservices architecture
- Previous startup experience
`;

const mockResumeText = `
John Doe
Senior Full Stack Developer
Email: john.doe@email.com | Phone: (555) 123-4567

SUMMARY
Experienced full-stack developer with 6 years of experience building scalable web applications using modern JavaScript frameworks. Passionate about creating efficient, user-friendly solutions and collaborating in agile environments.

TECHNICAL SKILLS
• Frontend: React, Vue.js, HTML5, CSS3, JavaScript (ES6+)
• Backend: Node.js, Express, Python, Django
• Databases: MySQL, Redis
• Tools: Git, Docker, Jenkins
• Cloud: AWS (EC2, S3, RDS)

PROFESSIONAL EXPERIENCE

Senior Developer | TechCorp Inc. | 2021 - Present
• Developed and maintained multiple React-based web applications serving 100K+ users
• Implemented RESTful APIs using Node.js and Express
• Collaborated with product managers and designers in agile sprints
• Reduced application load time by 40% through performance optimizations

Full Stack Developer | StartupXYZ | 2019 - 2021
• Built responsive web applications using React and Node.js
• Integrated third-party APIs and payment gateways
• Wrote unit tests achieving 85% code coverage
• Mentored junior developers and conducted code reviews

EDUCATION
Bachelor of Science in Computer Science
State University | 2018

CERTIFICATIONS
• AWS Certified Developer Associate
• Certified Scrum Master
`;

async function testResumeAnalysisAPI() {
  console.log('🧪 Testing Resume Analysis API via HTTP...');

  try {
    const response = await fetch('/api/resume-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobDescription: mockJobDescription,
        resumeText: mockResumeText
      })
    });

    const data = await response.json();

    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Data:', JSON.stringify(data, null, 2));

    if (response.status === 200 && data.success) {
      console.log('✅ Resume Analysis API test PASSED');
      console.log(`📈 Resume Score: ${data.analysis.score}/100`);
      console.log(`🎯 Experience Score: ${data.analysis.experienceAlignment.score}/100`);
      console.log(`⚡ Skills Score: ${data.analysis.skillsAlignment.score}/100`);
      console.log(`💡 Recommendations: ${data.analysis.actionableRecommendations.length}`);
      return data.analysis;
    } else {
      console.log('❌ Resume Analysis API test FAILED');
      console.log('Error:', data.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return null;
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  window.testResumeAnalysis = testResumeAnalysisAPI;
  window.mockJobDescription = mockJobDescription;
  window.mockResumeText = mockResumeText;
  
  console.log('🔧 Resume Analysis test utilities loaded!');
  console.log('💡 Run testResumeAnalysis() in the browser console to test the API');
}

module.exports = {
  testResumeAnalysisAPI,
  mockJobDescription,
  mockResumeText
};
