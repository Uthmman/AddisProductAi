'use client';

import { useEffect, useRef } from 'react';
import { useTasks } from '@/context/task-context';

/**
 * A background component that checks if the GSC analysis is stale (older than 24h)
 * and triggers a refresh automatically.
 */
export default function AutoGscAnalyzer() {
    const { addTask, updateTask } = useTasks();
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        async function checkAndRefresh() {
            try {
                // Check if refresh is needed
                const res = await fetch('/api/search-console/analyze?checkAuto=true');
                if (!res.ok) return;
                const { stale } = await res.json();

                if (stale) {
                    console.log("GSC Analysis is stale. Triggering daily auto-refresh...");
                    
                    const taskId = 'auto-gsc-refresh';
                    addTask({
                        id: taskId,
                        title: "Daily Search Analysis",
                        description: "Automatically updating furniture search insights...",
                        progress: 20
                    });

                    const refreshRes = await fetch('/api/search-console/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days: 30 })
                    });

                    if (refreshRes.ok) {
                        updateTask(taskId, {
                            status: 'success',
                            description: "Furniture insights updated successfully!",
                            progress: 100
                        });
                    } else {
                        console.warn("Auto-refresh of GSC failed.");
                        updateTask(taskId, {
                            status: 'error',
                            description: "Failed to update daily insights."
                        });
                    }
                }
            } catch (error) {
                console.error("Auto-GSC-Analyzer error:", error);
            }
        }

        // Delay the check slightly to let the page load first
        const timer = setTimeout(checkAndRefresh, 3000);
        return () => clearTimeout(timer);
    }, [addTask, updateTask]);

    return null;
}
