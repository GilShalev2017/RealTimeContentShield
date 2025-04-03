import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/lib/api';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ReviewModal from '@/components/modals/review-modal';

export default function Search() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [reviewContent, setReviewContent] = useState<any>(null);

  // Fetch search results when searchQuery changes
  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['/api/content/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      return await contentApi.searchContents(searchQuery);
    },
    enabled: false // Don't run query on component mount
  });

  const handleSearch = async () => {
    if (!searchQuery) return;
    setHasSearched(true);
    await refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleReviewContent = (content: any) => {
    setReviewContent(content);
  };

  const handleCloseReviewModal = () => {
    setReviewContent(null);
  };

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Search & Filter</h1>
            <p className="text-gray-600 mt-1">Find and analyze content</p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    placeholder="Search content by text, ID, or user..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => setSearchQuery('hate speech')}>
                  Hate Speech
                </Badge>
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => setSearchQuery('spam')}>
                  Spam
                </Badge>
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => setSearchQuery('harassment')}>
                  Harassment
                </Badge>
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer" onClick={() => setSearchQuery('explicit')}>
                  Explicit
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Search Results</CardTitle>
                {hasSearched && searchResults && !isLoading && (
                  <span className="text-sm text-gray-500">
                    {searchResults.length} results found
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!hasSearched ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Search for content</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Use the search box above to find content
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4 space-y-2 flex-1">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((content: any) => (
                    <div key={content.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{content.content}</div>
                            <div className="text-sm text-gray-500">
                              ID: {content.content_id} • User ID: {content.user_id}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleReviewContent(content)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try using different keywords or filters
                  </p>
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
