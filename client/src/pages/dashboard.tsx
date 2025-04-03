import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi, webSocketService } from '@/lib/api';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import MetricsOverview from '@/components/dashboard/metrics-overview';
import ContentTrendsChart from '@/components/dashboard/content-trends-chart';
import ContentCategoriesChart from '@/components/dashboard/content-categories-chart';
import ContentModerationTable from '@/components/dashboard/content-moderation-table';
import AiRules from '@/components/dashboard/ai-rules';
import AiPerformance from '@/components/dashboard/ai-performance';
import ReviewModal from '@/components/modals/review-modal';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('last_24_hours');
  const [reviewContent, setReviewContent] = useState<any>(null);
  const { toast } = useToast();

  // Fetch latest stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/stats'],
    staleTime: 30000 // 30 seconds
  });

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribeStats = webSocketService.subscribe('stats_update', (data) => {
      queryClient.setQueryData(['/api/stats'], data);
    });

    const unsubscribeFlagged = webSocketService.subscribe('flagged_content_update', (data) => {
      queryClient.setQueryData(['/api/content-analysis'], (oldData: any[] = []) => {
        // Merge new data with existing data, avoiding duplicates
        const existingIds = new Set(oldData.map(item => item.id));
        const newItems = data.filter((item: any) => !existingIds.has(item.id));
        return [...newItems, ...oldData].slice(0, 20); // Limit to 20 items
      });
    });

    const unsubscribeStatusUpdate = webSocketService.subscribe('content_status_update', (data) => {
      toast({
        title: "Content Status Updated",
        description: `Content ID ${data.contentId} status changed to ${data.status}`,
      });
      
      // Update content analysis cache
      queryClient.invalidateQueries({ queryKey: ['/api/content-analysis'] });
    });

    return () => {
      unsubscribeStats();
      unsubscribeFlagged();
      unsubscribeStatusUpdate();
    };
  }, []);

  const handleReviewContent = (content: any) => {
    setReviewContent(content);
  };

  const handleCloseReviewModal = () => {
    setReviewContent(null);
  };

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Moderation Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time metrics and content analysis</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              <div className="relative">
                <select 
                  className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="last_24_hours">Last 24 hours</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="last_30_days">Last 30 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              <button className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>
          
          {/* Metrics Overview */}
          <MetricsOverview stats={stats} isLoading={isStatsLoading} />
          
          {/* Content Analysis & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <ContentTrendsChart timeRange={timeRange} className="lg:col-span-2" />
            <ContentCategoriesChart />
          </div>
          
          {/* Content Moderation Table */}
          <ContentModerationTable onReviewContent={handleReviewContent} />
          
          {/* AI Rules & Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <AiRules className="lg:col-span-2" />
            <AiPerformance stats={stats} />
          </div>
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
