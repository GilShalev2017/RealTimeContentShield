import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsOverviewProps {
  stats: any;
  isLoading: boolean;
}

export default function MetricsOverview({ stats, isLoading }: MetricsOverviewProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Content Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Content</h3>
            <span className="text-success-500 bg-success-500 bg-opacity-10 py-1 px-2 rounded-full text-xs font-medium">+12.5%</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.total_content?.toLocaleString() || '0'}</p>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <span>Today: </span>
            <span className="font-medium text-gray-900 ml-1">1,253</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Flagged Content Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Flagged Content</h3>
            <span className="text-danger-500 bg-danger-500 bg-opacity-10 py-1 px-2 rounded-full text-xs font-medium">+8.4%</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.flagged_content?.toLocaleString() || '0'}</p>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <span>Pending review: </span>
            <span className="font-medium text-gray-900 ml-1">237</span>
          </div>
        </CardContent>
      </Card>
      
      {/* AI Confidence Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">AI Confidence</h3>
            <span className="text-success-500 bg-success-500 bg-opacity-10 py-1 px-2 rounded-full text-xs font-medium">+1.2%</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.ai_confidence?.toString() || '0'}%</p>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <span>Low confidence: </span>
            <span className="font-medium text-gray-900 ml-1">89</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Avg Response Time Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Avg. Response Time</h3>
            <span className="text-success-500 bg-success-500 bg-opacity-10 py-1 px-2 rounded-full text-xs font-medium">-15.3%</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats.response_time?.toString() || '0'}ms</p>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <span>Peak: </span>
            <span className="font-medium text-gray-900 ml-1">412ms</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
