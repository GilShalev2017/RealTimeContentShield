import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentAnalysisApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ContentCategories, ContentStatuses } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface ContentModerationTableProps {
  onReviewContent: (content: any) => void;
}

export default function ContentModerationTable({ onReviewContent }: ContentModerationTableProps) {
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch content analyses
  const { data: contentAnalyses, isLoading } = useQuery({
    queryKey: ['/api/content-analysis', filter],
    queryFn: async () => {
      return await contentAnalysisApi.listAnalyses(
        5, 
        0, 
        filter === 'all' ? undefined : filter
      );
    }
  });
  
  // Mutation for updating content status
  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return await contentAnalysisApi.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-analysis'] });
      toast({
        title: "Content status updated",
        description: "The content status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update content status",
        description: "An error occurred while updating the content status.",
        variant: "destructive",
      });
    }
  });
  
  const handleDismiss = (id: number) => {
    updateStatus({ id, status: ContentStatuses.APPROVED });
  };
  
  const handleRemove = (id: number) => {
    updateStatus({ id, status: ContentStatuses.REMOVED });
  };
  
  // Format timestamps to relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };
  
  // Format category for display
  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Get category badge colors
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case ContentCategories.HATE_SPEECH:
        return 'bg-red-100 text-red-800';
      case ContentCategories.SPAM:
        return 'bg-orange-100 text-orange-800';
      case ContentCategories.HARASSMENT:
        return 'bg-purple-100 text-purple-800';
      case ContentCategories.EXPLICIT:
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get status badge colors
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
  
  return (
    <Card className="mb-6">
      <CardHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent Flagged Content</CardTitle>
          
          <div className="mt-3 sm:mt-0 flex items-center space-x-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Flags</SelectItem>
                <SelectItem value={ContentCategories.HATE_SPEECH}>Hate Speech</SelectItem>
                <SelectItem value={ContentCategories.HARASSMENT}>Harassment</SelectItem>
                <SelectItem value={ContentCategories.SPAM}>Spam</SelectItem>
                <SelectItem value={ContentCategories.EXPLICIT}>Explicit Content</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
                <div className="space-x-2">
                  <Skeleton className="h-8 w-20 rounded-md inline-block" />
                  <Skeleton className="h-8 w-20 rounded-md inline-block" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contentAnalyses && contentAnalyses.length > 0 ? (
                contentAnalyses.map((analysis: any) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{analysis.content?.content}</div>
                          <div className="text-sm text-gray-500">ID: {analysis.content?.contentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getCategoryBadgeColor(analysis.category)}>
                        {formatCategory(analysis.category)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{analysis.confidence}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-primary-500 h-1.5 rounded-full" 
                          style={{width: `${analysis.confidence}%`}}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(analysis.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadgeColor(analysis.status)}>
                        {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="ghost" 
                        onClick={() => onReviewContent(analysis)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        {analysis.status === ContentStatuses.PENDING ? 'Review' : 'Details'}
                      </Button>
                      {analysis.status === ContentStatuses.PENDING && (
                        <Button 
                          variant="ghost"
                          onClick={() => handleDismiss(analysis.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Dismiss
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No flagged content found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">45</span> results
            </p>
          </div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <Button variant="outline" size="sm" className="rounded-l-md">
              <span className="sr-only">Previous</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="outline" size="sm" className="bg-primary-50 text-primary-600 border-primary-300">1</Button>
            <Button variant="outline" size="sm">2</Button>
            <Button variant="outline" size="sm">3</Button>
            <Button variant="outline" size="sm" disabled>...</Button>
            <Button variant="outline" size="sm">9</Button>
            <Button variant="outline" size="sm" className="rounded-r-md">
              <span className="sr-only">Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </nav>
        </div>
      </div>
    </Card>
  );
}
