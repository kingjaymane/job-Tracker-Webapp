'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb,
  Brain,
  Zap,
  Award,
  Users,
  Briefcase
} from 'lucide-react';
import type { ResumeAnalysisResult } from '@/lib/resume-analysis-service';

export function ResumeAnalyzer() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both job description and resume text.",
        variant: "destructive",
      });
      return;
    }

    if (jobDescription.trim().length < 50) {
      toast({
        title: "Job Description Too Short",
        description: "Please provide a more detailed job description (at least 50 characters).",
        variant: "destructive",
      });
      return;
    }

    if (resumeText.trim().length < 100) {
      toast({
        title: "Resume Too Short",
        description: "Please provide more detailed resume content (at least 100 characters).",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/resume-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          resumeText: resumeText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      setFallbackUsed(data.fallbackUsed || false);
      
      if (data.fallbackUsed) {
        toast({
          title: "Analysis Complete (Fallback Mode)",
          description: `Pattern-based analysis completed. Score: ${data.analysis.score}/100`,
          variant: "default",
        });
      } else {
        toast({
          title: "Analysis Complete!",
          description: `Your resume scored ${data.analysis.score}/100 for this position.`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          Resume Analyzer
        </h1>
        <p className="text-muted-foreground">
          Get AI-powered insights on how well your resume matches specific job descriptions. 
          Receive a detailed score and actionable recommendations to optimize your resume for ATS systems.
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Description
            </CardTitle>
            <CardDescription>
              Paste the complete job description you&apos;re targeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste the job description here... Include requirements, responsibilities, preferred qualifications, etc."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[300px] resize-y"
            />
            <div className="text-sm text-muted-foreground mt-2">
              {jobDescription.length} characters
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Resume
            </CardTitle>
            <CardDescription>
              Paste your resume text (copy from PDF or Word document)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your resume content here... Include all sections: contact info, summary, experience, skills, education, etc."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[300px] resize-y"
            />
            <div className="text-sm text-muted-foreground mt-2">
              {resumeText.length} characters
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleAnalyze}
          disabled={isAnalyzing || !jobDescription.trim() || !resumeText.trim()}
          size="lg"
          className="px-8"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing Resume...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Analyze Resume
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Fallback Analysis Notice */}
          {fallbackUsed && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Pattern-Based Analysis Used:</strong> AI analysis is temporarily unavailable due to quota limits. 
                This analysis uses keyword matching and pattern recognition. For more detailed insights, please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Overall Match Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}/100
                  </div>
                  <Badge variant={getScoreBadgeVariant(analysis.score)}>
                    {analysis.score >= 80 ? 'Excellent Match' : 
                     analysis.score >= 60 ? 'Good Match' : 'Needs Improvement'}
                  </Badge>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-sm text-muted-foreground">Experience Alignment</div>
                  <div className={`text-xl font-semibold ${getScoreColor(analysis.experienceAlignment.score)}`}>
                    {analysis.experienceAlignment.score}/100
                  </div>
                  <div className="text-sm text-muted-foreground">Skills Alignment</div>
                  <div className={`text-xl font-semibold ${getScoreColor(analysis.skillsAlignment.score)}`}>
                    {analysis.skillsAlignment.score}/100
                  </div>
                </div>
              </div>
              <Progress value={analysis.score} className="h-3" />
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="strengths">Strengths</TabsTrigger>
              <TabsTrigger value="improvements">Improvements</TabsTrigger>
              <TabsTrigger value="missing">Missing Skills</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="max-h-32">
                    <div className="prose max-w-none pr-4">
                      <p>{analysis.overallFeedback}</p>
                    </div>
                  </ScrollArea>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Experience Alignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Score</span>
                            <span className={`font-semibold ${getScoreColor(analysis.experienceAlignment.score)}`}>
                              {analysis.experienceAlignment.score}/100
                            </span>
                          </div>
                          <Progress value={analysis.experienceAlignment.score} className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            {analysis.experienceAlignment.feedback}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Skills Alignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Score</span>
                            <span className={`font-semibold ${getScoreColor(analysis.skillsAlignment.score)}`}>
                              {analysis.skillsAlignment.score}/100
                            </span>
                          </div>
                          <Progress value={analysis.skillsAlignment.score} className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            {analysis.skillsAlignment.feedback}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strengths">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Resume Strengths
                  </CardTitle>
                  <CardDescription>
                    Areas where your resume aligns well with the job requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    {analysis.strengths.length > 0 ? (
                      <ul className="space-y-3 pr-4">
                        {analysis.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No specific strengths identified.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="improvements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    Areas for Improvement
                  </CardTitle>
                  <CardDescription>
                    Suggestions to better align your resume with the job requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    {analysis.improvements.length > 0 ? (
                      <ul className="space-y-3 pr-4">
                        {analysis.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <TrendingUp className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No specific improvements suggested.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="missing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Missing Elements
                  </CardTitle>
                  <CardDescription>
                    Skills, keywords, and requirements not found in your resume
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analysis.missingSkills.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Missing Skills & Technologies</h4>
                      <ScrollArea className="max-h-32">
                        <div className="flex flex-wrap gap-2 pr-4">
                          {analysis.missingSkills.map((skill, index) => (
                            <Badge key={index} variant="destructive">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {analysis.keywordGaps.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Important Keywords Not Found</h4>
                      <ScrollArea className="max-h-48">
                        <ul className="space-y-2 pr-4">
                          {analysis.keywordGaps.map((keyword, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{keyword}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}

                  {analysis.missingSkills.length === 0 && analysis.keywordGaps.length === 0 && (
                    <p className="text-muted-foreground">Great! No critical missing elements identified.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    Actionable Recommendations
                  </CardTitle>
                  <CardDescription>
                    Specific steps to improve your resume for this position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    {analysis.actionableRecommendations.length > 0 ? (
                      <div className="space-y-4 pr-4">
                        {analysis.actionableRecommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-blue-900 dark:text-blue-100">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No specific recommendations available.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
