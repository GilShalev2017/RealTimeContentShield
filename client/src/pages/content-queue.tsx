import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentAnalysisApi } from '@/lib/api';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ContentStatuses } from '@shared/schema';
import ReviewModal from '@/components/modals/review-modal';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContentQueue() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [reviewContent, setReviewContent] = useState<any>(null);

  // Fetch content analyses with the selected status
  const { data: analyses, isLoading } = useQuery({
    queryKey: ['/api/content-analysis', selectedTab],
    queryFn: async () => {
      return await contentAnalysisApi.listAnalyses(20, 0, selectedTab === 'all' ? undefined : selectedTab);
    }
  });

  const handleReviewContent = (content: any) => {
    setReviewContent(content);
  };

  const handleCloseReviewModal = () => {
    setReviewContent(null);
  };

  // Status badge color mapping
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case ContentStatuses.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case ContentStatuses.REVIEWED:
        return 'bg-green-100 text-green-800';
      case ContentStatuses.REMOVED:
        return 'bg-red-100 text-red-800';
      case ContentStatuses.APPROVED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Category badge color mapping
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'hate_speech':
        return 'bg-red-100 text-red-800';
      case 'spam':
        return 'bg-orange-100 text-orange-800';
      case 'harassment':
        return 'bg-purple-100 text-purple-800';
      case 'explicit':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format category for display
  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Content Queue</h1>
            <p className="text-gray-600 mt-1">Review and manage flagged content</p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Queue</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Sort
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                  <TabsTrigger value="removed">Removed</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4 space-y-2 flex-1">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses && analyses.length > 0 ? (
                    analyses.map((analysis: any) => (
                      <div key={analysis.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{analysis.content?.content}</div>
                              <div className="text-sm text-gray-500">ID: {analysis.content?.content_id}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryBadgeColor(analysis.category)}>
                              {formatCategory(analysis.category)}
                            </Badge>
                            <Badge className={getStatusBadgeColor(analysis.status)}>
                              {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <span>Confidence: {analysis.confidence}%</span>
                            <div className="ml-2 w-24 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-primary-500 h-1.5 rounded-full" 
                                style={{ width: `${analysis.confidence}%` }} 
                              />
                            </div>
                          </div>
                          <div>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleReviewContent(analysis)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Review
                            </Button>
                            {analysis.status === ContentStatuses.PENDING && (
                              <Button 
                                variant="ghost"
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Dismiss
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No content items found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        There are no content items with this status at the moment.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Review Modal */}
      {reviewContent && (
        <ReviewModal 
          content={reviewContent} 
          onClose={handleCloseReviewModal} 
        />
      )}
    </>
  );
}
