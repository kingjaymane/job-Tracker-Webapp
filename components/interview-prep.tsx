'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Brain, Code, Users, Lightbulb, Target, MessageCircle, Sparkles, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InterviewPrepResult {
  behavioralQuestions: string[];
  technicalQuestions: string[];
  starMethodGuidance: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  generalTips: string[];
  companyResearchTips: string[];
  questionsToAsk: string[];
}

export default function InterviewPrep() {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please paste a job description to generate interview prep.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate interview prep');
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: "Interview Prep Generated!",
        description: "Your personalized interview preparation is ready.",
      });
    } catch (error) {
      console.error('Error generating interview prep:', error);
      toast({
        title: "Interview Prep Generated (Fallback Mode)",
        description: "Generated using default questions. For AI-powered personalized questions, ensure your Gemini API key is configured.",
        variant: "default",
      });
      
      // Even if there's an error, the API should return fallback data
      // So let's check if we got any data back
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.behavioralQuestions) {
            setResult(errorData);
            return;
          }
        } catch (parseError) {
          // Ignore parse errors, fall through to final error handling
        }
      }
      
      toast({
        title: "Generation Failed",
        description: "Failed to generate interview prep. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setJobDescription('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI Interview Prep
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Generate personalized behavioral and technical interview questions with AI-powered preparation guidance.
            Transform your job description into a complete interview strategy.
          </p>
        </div>

        {!result ? (
          /* Input Section */
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors duration-200">
              <CardHeader className="text-center pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Paste Your Job Description</CardTitle>
                <CardDescription className="text-base">
                  Add the complete job posting to get tailored interview questions and preparation tips
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste the complete job description here...

Example:
- Job title and company
- Role responsibilities  
- Required qualifications
- Preferred skills
- Company culture details"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={12}
                    className="min-h-[300px] text-base leading-relaxed resize-none border-2 focus:border-primary/50"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {jobDescription.length > 0 ? `${jobDescription.length} characters` : 'Start typing your job description...'}
                    </span>
                    <span>
                      {jobDescription.length > 100 ? '✓ Good length' : 'Add more details for better results'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading || !jobDescription.trim()}
                    size="lg"
                    className="flex-1 h-12 text-base font-medium"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Generating Your Prep...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Interview Prep
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  {result && (
                    <Button variant="outline" onClick={clearResults} size="lg" className="h-12">
                      Start Over
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-8">
            {/* Success Banner */}
            <div className="max-w-4xl mx-auto">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                  Your personalized interview prep is ready! Review each section and practice your responses.
                </AlertDescription>
              </Alert>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mb-8">
              <Button onClick={clearResults} variant="outline" size="lg">
                <Target className="h-4 w-4 mr-2" />
                New Job Description
              </Button>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 h-12 mb-8">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="behavioral" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Behavioral
                </TabsTrigger>
                <TabsTrigger value="technical" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Technical
                </TabsTrigger>
                <TabsTrigger value="tips" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Tips
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* STAR Method Guide */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        STAR Method Framework
                      </CardTitle>
                      <CardDescription className="text-base">
                        Use this proven framework to structure compelling responses to behavioral questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { key: 'situation', label: 'S - Situation', color: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
                          { key: 'task', label: 'T - Task', color: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' },
                          { key: 'action', label: 'A - Action', color: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800' },
                          { key: 'result', label: 'R - Result', color: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' }
                        ].map((item, index) => (
                          <div key={item.key} className={`p-4 rounded-lg border-2 ${item.color}`}>
                            <Badge variant="secondary" className="mb-3 font-semibold">
                              {item.label}
                            </Badge>
                            <p className="text-sm leading-relaxed">
                              {result.starMethodGuidance[item.key as keyof typeof result.starMethodGuidance]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                    <Card className="text-center p-6">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {result.behavioralQuestions.length}
                      </div>
                      <div className="text-muted-foreground">Behavioral Questions</div>
                    </Card>
                    <Card className="text-center p-6">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {result.technicalQuestions.length}
                      </div>
                      <div className="text-muted-foreground">Technical Questions</div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="behavioral" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Behavioral Questions
                      <Badge variant="outline" className="ml-auto">
                        {result.behavioralQuestions.length} Questions
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Practice these behavioral questions using the STAR method. Each question targets key competencies for your role.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {result.behavioralQuestions.map((question, index) => (
                          <Card key={index} className="border border-muted hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {index + 1}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-base font-medium leading-relaxed mb-4">
                                    {question}
                                  </p>
                                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                    <Lightbulb className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                                      <strong>STAR Framework:</strong> Structure your answer with a specific Situation, 
                                      the Task you needed to accomplish, the Actions you took, and the measurable Results you achieved.
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Code className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Technical Questions
                      <Badge variant="outline" className="ml-auto">
                        {result.technicalQuestions.length} Questions
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Technical and coding questions tailored to the role requirements and technologies mentioned.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {result.technicalQuestions.map((question, index) => (
                          <Card key={index} className="border border-muted hover:border-green-300 dark:hover:border-green-700 transition-colors">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    {index + 1}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-base font-medium leading-relaxed mb-4">
                                    {question}
                                  </p>
                                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                    <Code className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800 dark:text-green-200">
                                      <strong>Technical Approach:</strong> Think out loud, explain your reasoning, 
                                      consider edge cases, discuss trade-offs, and mention time/space complexity when relevant.
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tips" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* General Tips */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                          <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        General Interview Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {result.generalTips.map((tip, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="text-sm leading-relaxed">{tip}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Questions to Ask */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        Questions to Ask Them
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {result.questionsToAsk.map((question, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="text-sm leading-relaxed">{question}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Company Research Tips */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        Company Research Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.companyResearchTips.map((tip, index) => (
                          <div key={index} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
