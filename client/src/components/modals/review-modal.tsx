import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contentAnalysisApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ContentStatuses, ContentCategories } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface ReviewModalProps {
  content: any;
  onClose: () => void;
}

export default function ReviewModal({ content, onClose }: ReviewModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format category for display
  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Format confidence for display
  const formatConfidence = (confidence: number) => {
    return `${confidence}%`;
  };

  // Get relative time from now
  const getRelativeTime = (timestamp: string) => {
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

  // Mutation for updating content status
  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: async (status: string) => {
      return await contentAnalysisApi.updateStatus(content.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-analysis'] });
      toast({
        title: "Content status updated",
        description: "The content status has been successfully updated.",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to update content status",
        description: "An error occurred while updating the content status.",
        variant: "destructive",
      });
    }
  });

  // Handle removing content
  const handleRemove = () => {
    updateStatus(ContentStatuses.REMOVED);
  };

  // Handle dismissing flag
  const handleDismiss = () => {
    updateStatus(ContentStatuses.APPROVED);
  };

  // Handle closing the modal
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  // Parse AI data
  const getAiAnalysis = () => {
    if (!content.aiData) return [];
    
    const analysis = [];
    
    if (content.aiData.reasons && Array.isArray(content.aiData.reasons)) {
      analysis.push(...content.aiData.reasons.map((reason: string) => `• ${reason}`));
    } else {
      if (content.aiData.category) {
        analysis.push(`• Contains ${formatCategory(content.aiData.category)} content`);
      }
      if (content.aiData.confidence) {
        analysis.push(`• ${content.aiData.confidence}% confidence in detection`);
      }
    }
    
    // Add fallback if no reasons found
    if (analysis.length === 0) {
      analysis.push('• AI analysis data unavailable');
    }
    
    return analysis;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Review Flagged Content
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 mb-4 pb-4 border-b">
          <p className="text-sm text-gray-500">
            ID: <span className="text-gray-900">{content.content?.contentId || content.contentId}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Flagged: <span className="text-gray-900">{getRelativeTime(content.createdAt)}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Category: 
            <Badge 
              className="ml-2"
              variant="outline"
            >
              {formatCategory(content.category)} ({formatConfidence(content.confidence)} confidence)
            </Badge>
          </p>
        </div>
        
        <div className="mt-2">
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-900">{content.content?.content}</p>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700">AI Analysis</h4>
            <div className="mt-2 bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">
                {getAiAnalysis().map((item, index) => (
                  <span key={index} className="block">{item}</span>
                ))}
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between gap-2">
          {content.status === ContentStatuses.PENDING && (
            <>
              <Button 
                variant="destructive" 
                onClick={handleRemove} 
                disabled={isPending}
                className="flex-1"
              >
                Remove Content
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDismiss} 
                disabled={isPending}
                className="flex-1"
              >
                Dismiss Flag
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            onClick={handleClose}
            className={content.status === ContentStatuses.PENDING ? "flex-1" : "w-full"}
          >
            {content.status === ContentStatuses.PENDING ? "Cancel" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
