import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AiPerformanceProps {
  stats?: any;
}

export default function AiPerformance({ stats }: AiPerformanceProps) {
  const isLoading = !stats;

  // Sample model updates - in a real application, these would come from the API
  const modelUpdates = [
    {
      text: 'Improved hate speech detection',
      date: '2 days ago'
    },
    {
      text: 'Reduced false positives for spam',
      date: '5 days ago'
    },
    {
      text: 'Added support for new languages',
      date: '1 week ago'
    }
  ];

  // Sample performance metrics - in a real app these would be calculated from stats or fetched
  const performanceMetrics = [
    {
      name: 'Accuracy',
      value: 94.2,
      color: 'bg-success-500',
    },
    {
      name: 'False Positives',
      value: 3.5,
      color: 'bg-warning-500',
    },
    {
      name: 'False Negatives',
      value: 2.3,
      color: 'bg-danger-500',
    },
    {
      name: 'Avg. Response Time',
      value: stats?.responseTime || 230,
      suffix: 'ms',
      color: 'bg-primary-500',
      percentage: 85, // This would be calculated in a real app
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>AI Performance</CardTitle>
          <div className="text-xs text-gray-500">Updated 5 min ago</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {performanceMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-700">{metric.name}</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {metric.value}{metric.suffix || '%'}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${metric.color} h-2 rounded-full`} 
                      style={{ width: `${metric.percentage || metric.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Model Updates</h4>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-2 w-2 rounded-full mt-1 mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {modelUpdates.map((update, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <span className="w-2 h-2 bg-success-500 rounded-full inline-block"></span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-900">{update.text}</p>
                    <p className="text-xs text-gray-500">{update.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
