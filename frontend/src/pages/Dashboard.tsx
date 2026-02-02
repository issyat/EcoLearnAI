import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

interface Lesson {
  topic: string;
  content: string;
  lesson: string;
  actions: Array<{
    title: string;
    description: string;
    action_code: string;
  }>;
}

interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
}

interface CarbonFootprint {
  cumulative_co2_kg: number;
  trees_planted: number;
}

const TOPICS = [
  { id: 'sustainable_transport', label: 'Sustainable Transport', emoji: '🚗' },
  { id: 'renewable_energy', label: 'Renewable Energy', emoji: '⚡' },
  { id: 'food_diet', label: 'Food & Diet', emoji: '🥗' },
  { id: 'digital_pollution', label: 'Digital Pollution', emoji: '💻' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [footprint, setFootprint] = useState<CarbonFootprint>({
    cumulative_co2_kg: 0,
    trees_planted: 0,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // Debug logging
  useEffect(() => {
    console.log('Dashboard loaded - userId:', userId, 'token:', !!token);
  }, [userId, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const handleViewHistory = async (page = 1) => {
    if (!userId) return;
    
    setHistoryLoading(true);
    setCurrentPage(page);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/users/history?user_id=${userId}&page=${page}&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setActionHistory(data.items);
      setTotalPages(data.pages);
      setShowHistory(true);
    } catch (err) {
      setError('Error loading history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (!window.confirm('Are you sure you want to delete this action?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/users/action/${actionId}?user_id=${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete action');
      }

      const data = await response.json();
      
      // Update footprint with new values
      setFootprint({
        cumulative_co2_kg: data.cumulative_co2_kg,
        trees_planted: data.trees_planted,
      });

      // Remove action from history list
      setActionHistory(actionHistory.filter(a => a.id !== actionId));

      setFeedback({
        type: 'success',
        message: `Action deleted! -${data.action_deleted.co2_kg.toFixed(2)}kg CO2 🗑️`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Error deleting action',
      });
    }
  };

  const handleGenerateLesson = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }

    setLoading(true);
    setError('');
    setFeedback(null);
    setLesson(null);

    try {
      const requestBody: { topic: string; user_id?: number } = {
        topic: selectedTopic,
      };

      if (userId) {
        requestBody.user_id = parseInt(userId);
      }

      const response = await fetch('http://localhost:8000/api/v1/users/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error during generation');
      }

      const data: Lesson = await response.json();
      console.log('Lesson response:', data);
      setLesson(data);
      setFeedback({
        type: 'success',
        message: 'Lesson generated successfully! 🎉',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = async (actionCode: string) => {
    // Use the action_code directly from the lesson
    console.log('Attempting carbon action:', { userId, actionCode });

    if (!userId) {
      console.error('No userId found in localStorage');
      setFeedback({
        type: 'error',
        message: 'Log in to save your actions',
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/users/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          action_code: actionCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error saving action');
      }

      const data = await response.json();
      console.log('Carbon action response:', data);
      
      // Update footprint
      setFootprint({
        cumulative_co2_kg: data.cumulative_co2_kg,
        trees_planted: data.trees_planted,
      });

      setFeedback({
        type: 'success',
        message: `${actionCode} saved! +${data.co2_kg.toFixed(2)}kg CO2 saved 🌱`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFeedback({
        type: 'error',
        message,
      });
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header / Nav */}
      <nav className="dashboard-navbar">
        <div 
          className="navbar-brand" 
          onClick={() => {
            setShowHistory(false);
            setLesson(null);
            navigate('/dashboard');
          }}
        >
          <div className="eco-icon">🌱</div>
          <h1>EcoLearnAI</h1>
        </div>

        <div className="navbar-stats">
          <div className="stat-item">
            <span className="stat-icon">💨</span>
            <span className="stat-text">{footprint.cumulative_co2_kg.toFixed(1)} kg CO2</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🌳</span>
            <span className="stat-text">{footprint.trees_planted.toFixed(2)} trees</span>
          </div>
        </div>

        <div className="navbar-actions">
          <button 
            onClick={() => navigate('/stats')} 
            className="nav-action-btn primary"
          >
            📊 Statistics
          </button>
          <button 
            onClick={() => handleViewHistory(1)} 
            className="nav-action-btn secondary"
            disabled={historyLoading}
          >
            {historyLoading ? '⏳...' : '📋 History'}
          </button>
          <div className="divider"></div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className="dashboard-wrapper">
          {showHistory ? (
            // History View
            <section className="history-section">
              <div className="history-header">
                <h2 className="section-title">Your Action History</h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="back-btn"
                >
                  ← Back
                </button>
              </div>

              {actionHistory.length > 0 ? (
                <>
                  <div className="history-list">
                    {actionHistory.map((action) => (
                      <div key={action.id} className="history-card">
                        <div className="history-card-main">
                          <div className="history-icon-wrapper">
                            🌱
                          </div>
                          <div className="history-info">
                            <span className="history-action-title">
                              {action.action_code.replace(/_/g, ' ')}
                            </span>
                            <span className="history-date">
                              {new Date(action.timestamp).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="history-card-actions">
                          <div className="history-impact-badge">
                            +{action.co2_kg.toFixed(3)} kg CO₂
                          </div>
                          <button
                            className="delete-action-btn"
                            onClick={() => handleDeleteAction(action.id)}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="page-btn"
                        disabled={currentPage === 1} 
                        onClick={() => handleViewHistory(currentPage - 1)}
                      >
                        Prev
                      </button>
                      <span className="page-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button 
                        className="page-btn"
                        disabled={currentPage === totalPages} 
                        onClick={() => handleViewHistory(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-history">
                  <p>No actions recorded yet.</p>
                </div>
              )}
            </section>
          ) : (
            // Lesson View (default)
            <>
              {/* Topic Selector */}
          <section className="topic-selector-section">
            <h2 className="section-title">Choose a learning topic</h2>
            <div className="topic-grid">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  className={`topic-button ${selectedTopic === topic.id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  <span className="topic-emoji">{topic.emoji}</span>
                  <span className="topic-label">{topic.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Generate Button */}
          <section className="generate-section">
            <button
              className="generate-btn"
              onClick={handleGenerateLesson}
              disabled={loading || !selectedTopic}
            >
              {loading ? 'Generating...' : '✨ Generate Lesson'}
            </button>
          </section>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Lesson Card */}
          {lesson && (
            <section className="lesson-card-section">
              <div className="lesson-card">
                <div className="lesson-header">
                  <h3 className="lesson-title">
                    {TOPICS.find(t => t.id === lesson.topic)?.label || lesson.topic.replace(/_/g, ' ')}
                  </h3>
                </div>
                <div className="lesson-content">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{lesson.lesson}</p>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  {lesson.actions && lesson.actions.length > 0 ? (
                    lesson.actions.map((action, index) => (
                      <button
                        key={index}
                        className="action-button"
                        onClick={() => handleActionClick(action.action_code)}
                        title={action.description}
                      >
                        <div className="action-title">{action.title}</div>
                        <div className="action-description">{action.description}</div>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        className="action-button"
                        onClick={() => handleActionClick('bike_commute')}
                      >
                        🚴 Ride a bike
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleActionClick('reduce_meat')}
                      >
                        🌾 Buy local
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleActionClick('led_bulb')}
                      >
                        ⚡ Green energy
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Feedback Message */}
          {feedback && (
            <div className={`alert alert-${feedback.type}`}>
              {feedback.message}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
