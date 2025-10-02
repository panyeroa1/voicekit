import React from 'react';
import { useTaskStore, useUI } from '../lib/state';
import ToolIcon from './ToolIcon';
import { useTools } from '../lib/state';

const BackgroundTaskManager: React.FC = () => {
  const { tasks, removeTask } = useTaskStore();
  const { setPresentationData } = useUI();
  const allTools = useTools(state => state.tools);

  if (tasks.length === 0) {
    return null;
  }

  const handleResultClick = (taskResult: any, taskName?: string) => {
    if (!taskResult) return;

    if (taskResult.type === 'download') {
      const link = document.createElement('a');
      link.href = taskResult.payload;
      link.download = `${taskName?.replace(/_/g, '-') || 'download'}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (taskResult.type === 'view') {
      setPresentationData(taskResult.payload);
    }
  };

  return (
    <div className="task-manager-container">
      {tasks.map(task => {
        const tool = allTools.find(t => t.name === task.name);
        const icon = tool?.icon || 'hourglass_top';
        return (
          <div key={task.id} className={`task-item ${task.status}`}>
            <div className="task-header">
              <div className="task-title">
                {task.status === 'running' ? (
                  <span className="icon sync">sync</span>
                ) : (
                  <ToolIcon icon={icon} />
                )}
                <span>{task.name.replace(/_/g, ' ')}</span>
              </div>
              <button onClick={() => removeTask(task.id)} className="task-close-button" title="Dismiss">
                <span className="icon">close</span>
              </button>
            </div>
            <p className="task-message">{task.message}</p>
            {task.status === 'running' && (
              <div className="task-progress-bar-container">
                <div className="task-progress-bar" style={{ width: `${task.progress}%` }}></div>
              </div>
            )}
            {task.status === 'completed' && task.result && (
              <div className="task-result">
                {task.result.type === 'download' && (
                  <button onClick={() => handleResultClick(task.result, task.name)} className="task-result-button">
                    <span className="icon">download</span> Download
                  </button>
                )}
                {task.result.type === 'view' && (
                  <button onClick={() => handleResultClick(task.result)} className="task-result-button">
                    <span className="icon">visibility</span> View
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BackgroundTaskManager;