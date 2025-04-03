import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ContentTrendsChartProps {
  timeRange: string;
  className?: string;
}

export default function ContentTrendsChart({ timeRange, className }: ContentTrendsChartProps) {
  const [selectedRange, setSelectedRange] = useState('week');
  
  // Sample data for the chart
  const dayData = [
    { name: '00:00', total: 240, flagged: 22 },
    { name: '04:00', total: 130, flagged: 18 },
    { name: '08:00', total: 380, flagged: 45 },
    { name: '12:00', total: 510, flagged: 63 },
    { name: '16:00', total: 450, flagged: 52 },
    { name: '20:00', total: 320, flagged: 38 },
  ];
  
  const weekData = [
    { name: 'Mon', total: 1240, flagged: 122 },
    { name: 'Tue', total: 1380, flagged: 145 },
    { name: 'Wed', total: 1520, flagged: 176 },
    { name: 'Thu', total: 1250, flagged: 140 },
    { name: 'Fri', total: 1450, flagged: 160 },
    { name: 'Sat', total: 1080, flagged: 95 },
    { name: 'Sun', total: 980, flagged: 87 },
  ];
  
  const monthData = [
    { name: 'Week 1', total: 8240, flagged: 722 },
    { name: 'Week 2', total: 7890, flagged: 645 },
    { name: 'Week 3', total: 8520, flagged: 776 },
    { name: 'Week 4', total: 9150, flagged: 840 },
  ];
  
  const chartData = selectedRange === 'day' ? dayData : selectedRange === 'week' ? weekData : monthData;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Content Volume & Flags</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant={selectedRange === 'day' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedRange('day')}
              className="text-xs h-8"
            >
              Day
            </Button>
            <Button 
              variant={selectedRange === 'week' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedRange('week')}
              className="text-xs h-8"
            >
              Week
            </Button>
            <Button 
              variant={selectedRange === 'month' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedRange('month')}
              className="text-xs h-8"
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 20,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="flagged"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex justify-center">
          <div className="flex items-center mr-6">
            <span className="w-3 h-3 bg-primary-500 rounded-full inline-block mr-2"></span>
            <span className="text-sm text-gray-600">Total Content</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full inline-block mr-2"></span>
            <span className="text-sm text-gray-600">Flagged Content</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
