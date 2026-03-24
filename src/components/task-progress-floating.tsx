'use client';

import React from 'react';
import { useTasks } from '@/context/task-context';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, X, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TaskProgressFloating() {
  const { tasks, removeTask } = useTasks();

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-xs space-y-3 pointer-events-none">
      {tasks.map((task) => (
        <Card key={task.id} className="shadow-2xl border-primary/20 pointer-events-auto overflow-hidden animate-in slide-in-from-right-10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-primary/10 p-1.5 rounded-md">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                
                {task.status === 'loading' && (
                  <div className="space-y-2">
                    <Progress value={task.progress || 0} className="h-1.5" />
                    <div className="flex items-center gap-2 text-[10px] text-primary font-medium uppercase tracking-wider">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </div>
                  </div>
                )}

                {task.status === 'success' && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed Successfully
                  </div>
                )}

                {task.status === 'error' && (
                  <div className="flex items-center gap-2 text-xs text-destructive font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Action Failed
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full -mr-1" 
                onClick={() => removeTask(task.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
          {task.status === 'loading' && (
            <div className="h-1 bg-primary/10 w-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-indeterminate" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
