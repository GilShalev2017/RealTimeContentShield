import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiRulesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ContentCategories, AutoActions } from '@shared/schema';

interface AiRulesProps {
  className?: string;
}

export default function AiRules({ className }: AiRulesProps) {
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: ContentCategories.HATE_SPEECH,
    sensitivity: 75,
    autoAction: AutoActions.FLAG,
    active: true,
    icon: 'ri-spam-2-line'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['/api/ai-rules'],
    queryFn: aiRulesApi.listRules
  });

  // Mutation for creating a new rule
  const { mutate: createRule, isPending: isCreating } = useMutation({
    mutationFn: aiRulesApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-rules'] });
      setIsAddRuleOpen(false);
      resetForm();
      toast({
        title: "Rule created",
        description: "The moderation rule has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create rule",
        description: "An error occurred while creating the rule.",
        variant: "destructive",
      });
    }
  });

  // Mutation for updating rule activation status
  const { mutate: updateRule } = useMutation({
    mutationFn: ({ id, active }: { id: number, active: boolean }) => {
      return aiRulesApi.updateRule(id, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-rules'] });
      toast({
        title: "Rule updated",
        description: "The rule status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update rule",
        description: "An error occurred while updating the rule.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const handleSensitivityChange = (value: number[]) => {
    setNewRule(prev => ({ ...prev, sensitivity: value[0] }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setNewRule(prev => ({ ...prev, active: checked }));
  };

  const handleToggleRuleActive = (id: number, active: boolean) => {
    updateRule({ id, active: !active });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRule(newRule);
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      description: '',
      category: ContentCategories.HATE_SPEECH,
      sensitivity: 75,
      autoAction: AutoActions.FLAG,
      active: true,
      icon: 'ri-spam-2-line'
    });
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case ContentCategories.HATE_SPEECH:
        return 'ri-spam-2-line';
      case ContentCategories.SPAM:
        return 'ri-spam-line';
      case ContentCategories.HARASSMENT:
        return 'ri-user-settings-line';
      case ContentCategories.EXPLICIT:
        return 'ri-eye-off-line';
      default:
        return 'ri-spam-2-line';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatAutoAction = (action: string) => {
    switch(action) {
      case AutoActions.FLAG:
        return 'Flag for review';
      case AutoActions.REMOVE:
        return 'Auto-remove';
      case AutoActions.NONE:
        return 'None';
      default:
        return action;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case ContentCategories.HATE_SPEECH:
        return 'bg-primary-100 text-primary-600';
      case ContentCategories.SPAM:
        return 'bg-orange-100 text-orange-600';
      case ContentCategories.HARASSMENT:
        return 'bg-purple-100 text-purple-600';
      case ContentCategories.EXPLICIT:
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>AI Moderation Rules</CardTitle>
          <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Moderation Rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={newRule.name}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={newRule.description}
                      onChange={handleInputChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Category
                    </Label>
                    <Select
                      value={newRule.category}
                      onValueChange={(value) => handleSelectChange('category', value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ContentCategories.HATE_SPEECH}>Hate Speech</SelectItem>
                        <SelectItem value={ContentCategories.SPAM}>Spam</SelectItem>
                        <SelectItem value={ContentCategories.HARASSMENT}>Harassment</SelectItem>
                        <SelectItem value={ContentCategories.EXPLICIT}>Explicit Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sensitivity" className="text-right">
                      Sensitivity: {newRule.sensitivity}%
                    </Label>
                    <div className="col-span-3">
                      <Slider
                        value={[newRule.sensitivity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={handleSensitivityChange}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="autoAction" className="text-right">
                      Auto Action
                    </Label>
                    <Select
                      value={newRule.autoAction}
                      onValueChange={(value) => handleSelectChange('autoAction', value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AutoActions.FLAG}>Flag for review</SelectItem>
                        <SelectItem value={AutoActions.REMOVE}>Auto-remove</SelectItem>
                        <SelectItem value={AutoActions.NONE}>None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="active" className="text-right">
                      Active
                    </Label>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Switch
                        id="active"
                        checked={newRule.active}
                        onCheckedChange={handleSwitchChange}
                      />
                      <Label htmlFor="active">{newRule.active ? 'Enabled' : 'Disabled'}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsAddRuleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Rule'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="py-4 border-b border-gray-200 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-4 space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[300px]" />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-6 w-16 rounded-full mr-3" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules && rules.map((rule: any) => (
              <div key={rule.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={cn("flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center", getCategoryColor(rule.category))}>
                      <i className={`${rule.icon} text-lg`}></i>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                      <p className="text-sm text-gray-500">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-3", rule.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleRuleActive(rule.id, rule.active)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Button>
                  </div>
                </div>
                <div className="mt-2 ml-14">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">Sensitivity:</span>
                    <div className="w-32 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${rule.sensitivity}%` }}></div>
                    </div>
                    <span className="ml-2">{rule.sensitivity}%</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span className="mr-2">Auto-action:</span>
                    <span className="font-medium">{formatAutoAction(rule.autoAction)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
