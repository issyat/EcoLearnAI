import { useState, useEffect } from 'react';
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

  const handleViewHistory = async () => {
    if (!userId) return;
    
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/users/action-history?user_id=${userId}&days=90`,
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
      setActionHistory(data.actions);
      setShowHistory(true);
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette action?')) {
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
        message: `Action supprimée! -${data.action_deleted.co2_kg.toFixed(2)}kg CO2 🗑️`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Erreur lors de la suppression',
      });
    }
  };

  const handleGenerateLesson = async () => {
    if (!selectedTopic) {
      setError('Veuillez sélectionner un sujet');
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
        throw new Error(errorData.detail || 'Erreur lors de la génération');
      }

      const data: Lesson = await response.json();
      console.log('Lesson response:', data);
      setLesson(data);
      setFeedback({
        type: 'success',
        message: 'Leçon générée avec succès! 🎉',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
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
        message: 'Connectez-vous pour enregistrer vos actions',
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
        throw new Error(errorData.detail || 'Erreur lors de l\'enregistrement');
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
        message: `${actionCode} enregistré! +${data.co2_kg.toFixed(2)}kg CO2 économisé 🌱`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setFeedback({
        type: 'error',
        message,
      });
    }
  };

  const oldMockLessons: Record<string, Lesson> = {
    sustainable_transport: {
      id: '1',
      topic: 'Sustainable Transport',
      content: `Les transports durables sont essentiels pour réduire notre empreinte carbone. Utiliser les transports en commun, le vélo ou la marche peut réduire les émissions de CO2 de jusqu'à 75% par rapport à la voiture personnelle. 

Les avantages incluent:
- Réduction de la pollution de l'air
- Amélioration de la santé publique
- Réduction des embouteillages
- Économies d'argent à long terme

Commencez dès aujourd'hui en utilisant les transports en commun pour vos trajets quotidiens!`,
      actions: ['👍 J\'approuve', '🚗 Utiliser la voiture', '🚴 Prendre le vélo'],
    },
    renewable_energy: {
      id: '2',
      topic: 'Renewable Energy',
      content: `L'énergie renouvelable est la clé pour un avenir durable. Les panneaux solaires, les éoliennes et l'hydroélectricité fournissent une énergie propre sans émissions de carbone.

Faits intéressants:
- Le soleil fournit assez d'énergie en 1 heure pour alimenter le monde pendant un an
- Les énergies renouvelables représentent maintenant 30% de la production d'électricité mondiale
- Installer des panneaux solaires peut réduire votre facture d'électricité de 50-80%

Passez à l'énergie renouvelable pour votre maison!`,
      actions: ['💡 Installer des panneaux solaires', '🔌 Énergie fossile', '⚡ En savoir plus'],
    },
    food_diet: {
      id: '3',
      topic: 'Food & Diet',
      content: `Une alimentation durable commence par des choix alimentaires responsables. Réduire la consommation de viande et augmenter les aliments d'origine végétale peut réduire votre empreinte carbone de 75%.

Conseils pour une alimentation durable:
- Manger moins de viande rouge
- Privilégier les produits locaux et de saison
- Réduire le gaspillage alimentaire
- Cultiver vos propres légumes si possible

Une personne végétarienne émet 2,9 tonnes de CO2 par an, contre 7,2 tonnes pour un omnivore!`,
      actions: ['🥬 Devenir végétarien', '🍔 Rester omnivore', '🌾 Acheter local'],
    },
    digital_pollution: {
      id: '4',
      topic: 'Digital Pollution',
      content: `La pollution numérique est souvent ignorée, mais elle a un impact significatif sur l'environnement. Chaque email génère 4g de CO2, et les data centers consomment 2-3% de l'électricité mondiale.

Réduire la pollution numérique:
- Supprimer les anciens emails
- Streamer vidéo en basse qualité
- Garder les appareils plus longtemps
- Utiliser des moteurs de recherche écologiques
- Réduire le temps d'écran

Des changements simples peuvent réduire votre pollution numérique de 30%!`,
      actions: ['♻️ Supprimer les anciens emails', '📱 Garder le même téléphone', '🌍 Utiliser Ecosia'],
    },
  };

  return (
    <div className="dashboard-container">
      {/* Header / Nav */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
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
            <span className="stat-text">{footprint.trees_planted.toFixed(2)} arbres</span>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Déconnexion
        </button>
        <button 
          onClick={handleViewHistory} 
          className="history-btn"
          disabled={historyLoading}
        >
          {historyLoading ? '⏳ Chargement...' : '📊 Historique'}
        </button>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className="dashboard-wrapper">
          {showHistory ? (
            // History View
            <section className="history-section">
              <div className="history-header">
                <h2 className="section-title">Historique de vos actions</h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="back-btn"
                >
                  ← Retour
                </button>
              </div>

              {actionHistory.length > 0 ? (
                <div className="history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th>CO2 Économisé (kg)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionHistory.map((action) => (
                        <tr key={action.id}>
                          <td>
                            {new Date(action.timestamp).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="action-code">{action.action_code}</td>
                          <td className="co2-value">{action.co2_kg.toFixed(3)}</td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteAction(action.id)}
                              title="Supprimer cette action"
                            >
                              🗑️ Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-history">
                  <p>Aucune action enregistrée pour le moment.</p>
                </div>
              )}
            </section>
          ) : (
            // Lesson View (default)
            <>
              {/* Topic Selector */}
          <section className="topic-selector-section">
            <h2 className="section-title">Choisir un sujet d'apprentissage</h2>
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
              {loading ? 'Génération en cours...' : '✨ Générer une leçon'}
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
                  <h3 className="lesson-title">{lesson.topic}</h3>
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
                        🚴 Prendre le vélo
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleActionClick('reduce_meat')}
                      >
                        🌾 Acheter local
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleActionClick('led_bulb')}
                      >
                        ⚡ Énergie verte
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
