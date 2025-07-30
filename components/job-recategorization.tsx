import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Database,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { jobRecategorizationService } from '@/lib/job-recategorization-service';

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

interface JobRecategorizationProps {
  onJobsUpdated?: () => void; // Callback to refresh job list
}

export function JobRecategorization({ onJobsUpdated }: JobRecategorizationProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<RecategorizationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RecategorizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiServiceAvailable, setAiServiceAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load recategorization stats
  const loadStats = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading stats using client-side service...');
      const result = await jobRecategorizationService.getRecategorizationStats(user.uid);
      setStats(result.stats);
      setAiServiceAvailable(result.aiServiceAvailable);
      console.log('✅ Stats loaded successfully:', result);
    } catch (err) {
      console.error('❌ Error loading recategorization stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Run recategorization analysis or update
  const runRecategorization = async (mode: 'analyze' | 'update', forceUpdate = false) => {
    if (!user?.uid) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      console.log(`🔄 Running recategorization: mode=${mode}, forceUpdate=${forceUpdate}`);
      const result = await jobRecategorizationService.runRecategorization(user.uid, mode, forceUpdate);
      setResult(result);
      
      // Refresh stats after update
      if (mode === 'update') {
        await loadStats();
        onJobsUpdated?.(); // Notify parent to refresh job list
      }
      
      // Switch to results tab
      setActiveTab('results');
      console.log('✅ Recategorization completed:', result);
    } catch (err) {
      console.error('❌ Error running recategorization:', err);
      setError(err instanceof Error ? err.message : 'Recategorization failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.uid, loadStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'interviewing': return 'bg-yellow-100 text-yellow-800';
      case 'offered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'ghosted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Job Recategorization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading analysis...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Job Recategorization
        </CardTitle>
        <CardDescription>
          Use AI to analyze and improve the categorization of your existing job applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analyze">Analysis</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalJobs}</p>
                          <p className="text-sm text-muted-foreground">Total Jobs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.jobsWithEmailData}</p>
                          <p className="text-sm text-muted-foreground">With Email Data</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.needsAnalysis}</p>
                          <p className="text-sm text-muted-foreground">Needs Analysis</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {aiServiceAvailable ? 'Yes' : 'No'}
                          </p>
                          <p className="text-sm text-muted-foreground">AI Available</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                        <div key={status} className="text-center">
                          <Badge className={getStatusColor(status)} variant="secondary">
                            {status}
                          </Badge>
                          <p className="text-2xl font-bold mt-1">{count}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {!aiServiceAvailable && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      AI service is not available. Recategorization will use enhanced pattern matching instead of AI analysis.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  {aiServiceAvailable 
                    ? 'AI analysis will examine your job emails to improve status categorization and extract better company/title information.'
                    : 'Pattern-based analysis will examine your job data using enhanced rules to improve categorization.'
                  }
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => runRecategorization('analyze')}
                  disabled={isAnalyzing || !stats}
                  className="flex-1"
                  variant="outline"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Preview Analysis
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => runRecategorization('update')}
                  disabled={isAnalyzing || !stats}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update Jobs
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Preview Analysis:</strong> Shows what changes would be made without updating anything</p>
                <p>• <strong>Update Jobs:</strong> Actually updates your job categorizations based on AI/pattern analysis</p>
                {stats && stats.recentlyAnalyzed > 0 && (
                  <p>• <strong>Note:</strong> {stats.recentlyAnalyzed} jobs were recently analyzed and will be skipped</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-blue-600">{result.analyzedJobs}</p>
                      <p className="text-sm text-muted-foreground">Jobs Analyzed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-green-600">{result.updatedJobs}</p>
                      <p className="text-sm text-muted-foreground">Jobs Updated</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-purple-600">{result.analysisDetails.aiAnalyzed}</p>
                      <p className="text-sm text-muted-foreground">AI Analyzed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-orange-600">{result.analysisDetails.regexFallback}</p>
                      <p className="text-sm text-muted-foreground">Pattern Analyzed</p>
                    </CardContent>
                  </Card>
                </div>

                {result.analysisDetails.statusChanges.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.analysisDetails.statusChanges.map((change, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{change.company}</p>
                              <p className="text-sm text-muted-foreground">{change.jobTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(change.from)} variant="secondary">
                                {change.from}
                              </Badge>
                              <span>→</span>
                              <Badge className={getStatusColor(change.to)} variant="secondary">
                                {change.to}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.errors.length} error(s) occurred during processing. Check console for details.
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={loadStats} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Stats
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Run an analysis to see results here
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
