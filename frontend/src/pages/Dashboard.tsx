import { useState } from 'react';
import '../styles/dashboard.css';

interface Lesson {
  id: string;
  topic: string;
  content: string;
  actions: string[];
}

interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const mockLessons: Record<string, Lesson> = {
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
      // Simuler un délai réseau
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Utiliser les données mock au lieu d'appeler l'API
      const mockLesson = mockLessons[selectedTopic];

      if (mockLesson) {
        setLesson(mockLesson);
        setFeedback({
          type: 'success',
          message: 'Leçon générée avec succès! 🎉',
        });
      } else {
        throw new Error('Sujet non trouvé');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionLabel: string) => {
    setFeedback({
      type: 'success',
      message: `Vous avez cliqué sur: "${actionLabel}" 👍`,
    });
  };

  return (
    <div className="dashboard-container">
      {/* Header / Nav */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <div className="eco-icon">🌱</div>
          <h1>EcoLearnAI</h1>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Déconnexion
        </button>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className="dashboard-wrapper">
          {/* Topic Selector */}
          <section className="topic-selector-section">
            <h2 className="section-title">Choisir un sujet</h2>
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
                  <p>{lesson.content}</p>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  {lesson.actions && lesson.actions.length > 0 ? (
                    lesson.actions.slice(0, 3).map((action, index) => (
                      <button
                        key={index}
                        className="action-button"
                        onClick={() => handleActionClick(action)}
                      >
                        {action}
                      </button>
                    ))
                  ) : (
                    <button className="action-button">Action par défaut</button>
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
        </div>
      </div>
    </div>
  );
}
