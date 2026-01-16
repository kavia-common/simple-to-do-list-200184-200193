import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'kavia.todo.tasks.v1';

/**
 * Parses tasks from localStorage safely.
 * Keeps the app resilient to malformed stored data.
 */
function loadTasksFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : crypto.randomUUID(),
        text: typeof t.text === 'string' ? t.text : '',
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      }))
      .filter((t) => t.text.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Persists tasks to localStorage safely.
 * If storage is unavailable/quota exceeded, we fail silently to keep UI usable.
 */
function saveTasksToStorage(tasks) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Intentionally ignore storage failures (private mode/quota/etc.)
  }
}

// PUBLIC_INTERFACE
function App() {
  /** Tasks list state (persisted to localStorage). */
  const [tasks, setTasks] = useState(() => loadTasksFromStorage());

  /** Controlled input state for adding a new task. */
  const [newTaskText, setNewTaskText] = useState('');

  /** Inline editing state. Only one task is edited at a time for simplicity. */
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const newTaskInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    if (editingId) {
      // Focus the edit input when entering edit mode.
      editInputRef.current?.focus();
      editInputRef.current?.select?.();
    }
  }, [editingId]);

  const remainingCount = useMemo(
    () => tasks.reduce((acc, t) => acc + (t.completed ? 0 : 1), 0),
    [tasks]
  );

  // PUBLIC_INTERFACE
  const addTask = () => {
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    const task = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [task, ...prev]);
    setNewTaskText('');
    newTaskInputRef.current?.focus();
  };

  // PUBLIC_INTERFACE
  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // PUBLIC_INTERFACE
  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingText('');
    }
  };

  // PUBLIC_INTERFACE
  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingText(task.text);
  };

  // PUBLIC_INTERFACE
  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  // PUBLIC_INTERFACE
  const saveEditing = () => {
    const trimmed = editingText.trim();
    if (!editingId) return;

    if (!trimmed) {
      // If user clears text, treat as delete to avoid empty tasks.
      deleteTask(editingId);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, text: trimmed } : t))
    );
    setEditingId(null);
    setEditingText('');
  };

  const onNewTaskSubmit = (e) => {
    e.preventDefault();
    addTask();
  };

  return (
    <div className="App">
      <main className="page">
        <header className="pageHeader">
          <div className="pageTitleRow">
            <h1 className="title">To-do</h1>
            <span className="badge" aria-label={`${remainingCount} tasks remaining`}>
              {remainingCount} remaining
            </span>
          </div>
          <p className="subtitle">
            Add tasks, edit inline, mark complete, and delete. Your list is saved locally.
          </p>
        </header>

        <section className="card" aria-label="Add a task">
          <form className="addForm" onSubmit={onNewTaskSubmit}>
            <label className="srOnly" htmlFor="new-task">
              Task description
            </label>
            <input
              id="new-task"
              ref={newTaskInputRef}
              className="input"
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="What do you need to do?"
              autoComplete="off"
            />
            <button className="btn btnPrimary" type="submit" disabled={!newTaskText.trim()}>
              Add
            </button>
          </form>
        </section>

        <section className="card" aria-label="Task list">
          {tasks.length === 0 ? (
            <div className="emptyState">
              <h2 className="emptyTitle">No tasks yet</h2>
              <p className="emptyText">Add your first task above to get started.</p>
            </div>
          ) : (
            <ul className="taskList" aria-label="Tasks">
              {tasks.map((task) => {
                const isEditing = editingId === task.id;

                return (
                  <li key={task.id} className={`taskItem ${task.completed ? 'isDone' : ''}`}>
                    <div className="taskLeft">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          aria-label={
                            task.completed ? `Mark "${task.text}" as not completed` : `Mark "${task.text}" as completed`
                          }
                        />
                        <span className="checkboxMark" aria-hidden="true" />
                      </label>

                      <div className="taskContent">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            className="input inputInline"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditing();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditing();
                              }
                            }}
                            aria-label={`Edit task "${task.text}"`}
                          />
                        ) : (
                          <span className="taskText">{task.text}</span>
                        )}

                        <span className="taskMeta">
                          {task.completed ? 'Completed' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="taskActions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn btnSuccess"
                            onClick={saveEditing}
                            aria-label={`Save edits for "${task.text}"`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={cancelEditing}
                            aria-label={`Cancel editing "${task.text}"`}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={() => startEditing(task)}
                            aria-label={`Edit "${task.text}"`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btnDanger"
                            onClick={() => deleteTask(task.id)}
                            aria-label={`Delete "${task.text}"`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="footer">
          <span className="footerText">
            Tip: Press <kbd>Enter</kbd> to save edits, <kbd>Esc</kbd> to cancel.
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
