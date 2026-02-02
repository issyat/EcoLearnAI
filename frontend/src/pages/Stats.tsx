import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CO2TimelineChart from '../components/charts/CO2TimelineChart';
import ActionBreakdownChart from '../components/charts/ActionBreakdownChart';
import TreesPlantedVisualization from '../components/charts/TreesPlantedVisualization';
import '../styles/stats.css';

interface ActionHistory {
  id: number;
  action_code: string;
  co2_kg: number;
  timestamp: string;
}

interface ActionBreakdown {
  action_code: string;
  total_co2: number;
  count: number;
}

interface UserFootprint {
  cumulative_co2_kg: number;
  trees_planted: number;
}

export default function Stats() {
  const navigate = useNavigate();
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [actionBreakdown, setActionBreakdown] = useState<ActionBreakdown[]>([]);
  const [footprint, setFootprint] = useState<UserFootprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch action history (last 30 days)
      const historyResponse = await fetch(
        `http://localhost:8000/api/v1/users/action-history?user_id=${userId}&days=30`,
        { headers }
      );

      if (!historyResponse.ok) {
        throw new Error('Failed to fetch action history');
      }

      const historyData = await historyResponse.json();
      setActionHistory(historyData.actions || []);

      // Calculate action breakdown
      const breakdown = calculateActionBreakdown(historyData.actions || []);
      setActionBreakdown(breakdown);

      // Fetch footprint
      const footprintResponse = await fetch(
        `http://localhost:8000/api/v1/users/footprint/${userId}`,
        { headers }
      );

      if (!footprintResponse.ok) {
        throw new Error('Failed to fetch footprint');
      }

      const footprintData = await footprintResponse.json();
      setFootprint(footprintData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateActionBreakdown = (actions: ActionHistory[]): ActionBreakdown[] => {
    const breakdown = new Map<string, { total_co2: number; count: number }>();

    actions.forEach(action => {
      const existing = breakdown.get(action.action_code) || { total_co2: 0, count: 0 };
      breakdown.set(action.action_code, {
        total_co2: existing.total_co2 + action.co2_kg,
        count: existing.count + 1
      });
    });

    return Array.from(breakdown.entries()).map(([action_code, data]) => ({
      action_code,
      ...data
    }));
  };

  const prepareTimelineData = () => {
    return actionHistory.map(action => ({
      date: action.timestamp,
      co2_kg: action.co2_kg
    }));
  };

  if (loading) {
    return (
      <div className="stats-container">
        <div className="loading">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-container">
        <div className="error">{error}</div>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          Retour au Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <header className="stats-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Retour
        </button>
        <h1 className="stats-title">📊 Statistiques Environnementales</h1>
        <p className="stats-subtitle">
          Visualisez votre impact écologique et suivez vos progrès
        </p>
      </header>

      <div className="stats-grid">
        {/* Summary Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">🌍</div>
            <div className="stat-content">
              <div className="stat-value">{footprint?.cumulative_co2_kg.toFixed(2) || 0} kg</div>
              <div className="stat-label">CO₂ Compensé</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌲</div>
            <div className="stat-content">
              <div className="stat-value">{Math.floor(footprint?.trees_planted || 0)}</div>
              <div className="stat-label">Arbres Plantés</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{actionHistory.length}</div>
              <div className="stat-label">Actions Réalisées</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">
                {actionHistory.length > 0 
                  ? (footprint!.cumulative_co2_kg / actionHistory.length).toFixed(2)
                  : 0} kg
              </div>
              <div className="stat-label">Moyenne/Action</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {/* Trees Visualization - Full Width */}
          <div className="chart-wrapper full-width">
            {footprint && (
              <TreesPlantedVisualization
                treesPlanted={Math.floor(footprint.trees_planted)}
                totalCO2={footprint.cumulative_co2_kg}
              />
            )}
          </div>

          {/* Timeline Chart */}
          <div className="chart-wrapper">
            {actionHistory.length > 0 ? (
              <CO2TimelineChart data={prepareTimelineData()} />
            ) : (
              <div className="no-data">
                <p>Aucune donnée temporelle disponible</p>
                <p className="no-data-subtitle">Commencez à enregistrer des actions pour voir votre évolution</p>
              </div>
            )}
          </div>

          {/* Breakdown Chart */}
          <div className="chart-wrapper">
            {actionBreakdown.length > 0 ? (
              <ActionBreakdownChart data={actionBreakdown} />
            ) : (
              <div className="no-data">
                <p>Aucune donnée d'action disponible</p>
                <p className="no-data-subtitle">Effectuez des actions écologiques pour voir leur impact</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights Section */}
        <div className="insights-section">
          <h2 className="insights-title">💡 Insights</h2>
          <div className="insights-list">
            {actionBreakdown.length > 0 && (
              <div className="insight-card">
                <span className="insight-icon">🏆</span>
                <div className="insight-text">
                  <strong>Action la plus impactante:</strong>{' '}
                  {actionBreakdown[0]?.action_code.replace(/_/g, ' ')} avec{' '}
                  {actionBreakdown[0]?.total_co2.toFixed(2)} kg CO₂
                </div>
              </div>
            )}

            {footprint && footprint.trees_planted >= 10 && (
              <div className="insight-card">
                <span className="insight-icon">🌟</span>
                <div className="insight-text">
                  Félicitations! Vous avez planté {Math.floor(footprint.trees_planted)} arbres.
                  C'est environ {(footprint.trees_planted * 20).toFixed(0)} kg de CO₂ absorbé par an!
                </div>
              </div>
            )}

            {actionHistory.length >= 5 && (
              <div className="insight-card">
                <span className="insight-icon">🎯</span>
                <div className="insight-text">
                  Vous avez réalisé {actionHistory.length} actions éco-responsables.
                  Continuez sur cette lancée!
                </div>
              </div>
            )}

            {actionHistory.length === 0 && (
              <div className="insight-card">
                <span className="insight-icon">🚀</span>
                <div className="insight-text">
                  Commencez votre parcours écologique! Générez une leçon et réalisez vos premières actions.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
