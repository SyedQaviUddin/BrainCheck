'use client';

import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BrainCheck() {
  const [text, setText] = useState('');
  const [keystrokeData, setKeystrokeData] = useState({
    keyTimes: [],
    dwellTimes: [],
    flightTimes: [],
    backspaceCount: 0,
    startTime: null
  });
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const textareaRef = useRef(null);

  // New state for baseline, history, research mode, and explainability
  const [baseline, setBaseline] = useState(() => {
    const saved = localStorage.getItem('baseline');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });
  const [researchMode, setResearchMode] = useState(false);
  const [featureImportances, setFeatureImportances] = useState(null);

  const resetData = () => {
    setKeystrokeData({
      keyTimes: [],
      dwellTimes: [],
      flightTimes: [],
      backspaceCount: 0,
      startTime: Date.now()
    });
    setPrediction(null);
    setStats(null);
  };

  useEffect(() => {
    resetData();
  }, []);

  // Save baseline and history to localStorage
  useEffect(() => {
    localStorage.setItem('baseline', JSON.stringify(baseline));
  }, [baseline]);
  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  const handleKeyDown = (e) => {
    const currentTime = Date.now();
    
    if (!keystrokeData.startTime) {
      setKeystrokeData(prev => ({ ...prev, startTime: currentTime }));
    }

    // Track backspace
    if (e.key === 'Backspace') {
      setKeystrokeData(prev => ({
        ...prev,
        backspaceCount: prev.backspaceCount + 1
      }));
    }

    // Store key press time
    setKeystrokeData(prev => ({
      ...prev,
      keyTimes: [...prev.keyTimes, { key: e.key, downTime: currentTime }]
    }));
  };

  const handleKeyUp = (e) => {
    const currentTime = Date.now();
    
    setKeystrokeData(prev => {
      const updatedKeyTimes = [...prev.keyTimes];
      const lastKeyIndex = updatedKeyTimes.length - 1;
      
      if (lastKeyIndex >= 0 && updatedKeyTimes[lastKeyIndex].key === e.key) {
        // Calculate dwell time (how long key was held)
        const dwellTime = currentTime - updatedKeyTimes[lastKeyIndex].downTime;
        updatedKeyTimes[lastKeyIndex].upTime = currentTime;
        updatedKeyTimes[lastKeyIndex].dwellTime = dwellTime;

        // Calculate flight time (gap between consecutive key presses)
        let flightTime = 0;
        if (lastKeyIndex > 0 && updatedKeyTimes[lastKeyIndex - 1].upTime) {
          flightTime = updatedKeyTimes[lastKeyIndex].downTime - updatedKeyTimes[lastKeyIndex - 1].upTime;
        }

        return {
          ...prev,
          keyTimes: updatedKeyTimes,
          dwellTimes: [...prev.dwellTimes, dwellTime],
          flightTimes: flightTime > 0 ? [...prev.flightTimes, flightTime] : prev.flightTimes
        };
      }
      return prev;
    });
  };

  const calculateStats = () => {
    const { dwellTimes, flightTimes, backspaceCount, startTime } = keystrokeData;
    const totalTime = (Date.now() - startTime) / 1000; // Convert to seconds

    if (dwellTimes.length === 0) return null;

    const avgDwellTime = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
    const avgFlightTime = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : 0;

    return {
      avg_dwell_time: avgDwellTime,
      avg_flight_time: avgFlightTime,
      backspace_count: backspaceCount,
      total_time: totalTime
    };
  };

  // New: Calculate difference from baseline
  const compareToBaseline = (stats) => {
    if (!baseline) return null;
    return {
      dwell: stats.avg_dwell_time - baseline.avg_dwell_time,
      flight: stats.avg_flight_time - baseline.avg_flight_time,
      errors: stats.backspace_count - baseline.backspace_count,
      time: stats.total_time - baseline.total_time
    };
  };

  // New: Save baseline
  const saveBaseline = () => {
    const stats = calculateStats();
    if (!stats) {
      alert('Type at least 10 characters to set a baseline.');
      return;
    }
    setBaseline(stats);
    alert('Baseline saved! Future sessions will be compared to this.');
  };

  // New: Toggle research mode
  const toggleResearchMode = () => {
    setResearchMode((prev) => !prev);
  };

  // New: Save session to history
  useEffect(() => {
    if (prediction && stats) {
      setHistory((prev) => [
        ...prev,
        { date: new Date().toLocaleString(), stats, prediction }
      ]);
    }
    // eslint-disable-next-line
  }, [prediction]);

  // Update analyzeFatigue to send research data and get feature importances
  const analyzeFatigue = async () => {
    const stats = calculateStats();
    if (!stats) {
      alert('Please type more text before analyzing!');
      return;
    }
    setStats(stats);
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Research-Mode': researchMode ? '1' : '0',
        },
        body: JSON.stringify(stats)
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setPrediction(result);
      if (result.feature_importances) setFeatureImportances(result.feature_importances);
    } catch (error) {
      console.error('Error:', error);
      alert('Error connecting to backend. Make sure the FastAPI server is running on localhost:8000');
    } finally {
      setIsLoading(false);
    }
  };

  // New: Live feedback (auto-analyze as user types)
  useEffect(() => {
    if (text.length >= 10) {
      const timeout = setTimeout(() => {
        analyzeFatigue();
      }, 1000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line
  }, [text]);

  const clearText = () => {
    setText('');
    resetData();
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>🧠 BrainCheck</h1>
        <p>Mental Fatigue Detection through Keystroke Dynamics</p>
        <button onClick={saveBaseline} className="btn-secondary" style={{marginRight:8}}>Set Baseline (Alert)</button>
        <button onClick={toggleResearchMode} className={researchMode ? 'btn-primary' : 'btn-secondary'}>
          {researchMode ? 'Research Mode: ON' : 'Research Mode: OFF'}
        </button>
      </div>

      {/* Main Interface */}
      <div className="card">
        <div className="form-group">
          <label>
            Type some text below (minimum 10 characters for analysis):
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Start typing here... The system will analyze your typing patterns to detect mental fatigue."
          />
        </div>
        
        <div className="stats">
          Characters typed: {text.length} | Backspaces: {keystrokeData.backspaceCount}
        </div>

        <div className="button-group">
          <button
            onClick={analyzeFatigue}
            disabled={text.length < 10 || isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Analyzing...' : '🔍 Analyze Fatigue'}
          </button>
          
          <button
            onClick={clearText}
            className="btn-secondary"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {prediction && (
        <div className="card results show">
          <h3 className="result-header">🧠 Fatigue Analysis Results</h3>
          
          <div className={`prediction-box ${prediction.prediction}`}>
            <div className="prediction-text">
              {prediction.prediction === 'fatigued' ? '😴' : '✨'} You seem {prediction.prediction} 
              <span style={{fontSize: '1rem', marginLeft: '0.5rem'}}>({prediction.confidence}% confidence)</span>
            </div>
          </div>

          {/* Baseline comparison */}
          {baseline && stats && (
            <div className="baseline-compare">
              <h4>Compared to your baseline:</h4>
              <ul>
                <li>Dwell Time: {compareToBaseline(stats).dwell.toFixed(1)}ms</li>
                <li>Flight Time: {compareToBaseline(stats).flight.toFixed(1)}ms</li>
                <li>Error Rate: {compareToBaseline(stats).errors}</li>
                <li>Total Time: {compareToBaseline(stats).time.toFixed(1)}s</li>
              </ul>
            </div>
          )}
          {/* Feature importances */}
          {featureImportances && (
            <div className="feature-importances">
              <h4>Feature Importances:</h4>
              <ul>
                {Object.entries(featureImportances).map(([k, v]) => (
                  <li key={k}>{k}: {v.toFixed(2)}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Typing Statistics */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Avg Dwell Time</div>
                <div className="stat-value">{stats.avg_dwell_time.toFixed(1)}ms</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Flight Time</div>
                <div className="stat-value">{stats.avg_flight_time.toFixed(1)}ms</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Error Rate</div>
                <div className="stat-value">{stats.backspace_count}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Time</div>
                <div className="stat-value">{stats.total_time.toFixed(1)}s</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visualization: History Chart */}
      {history.length > 0 && (
        <div className="card">
          <h3>Session History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history.map((h, i) => ({
              name: `#${i+1}`,
              dwell: h.stats.avg_dwell_time,
              flight: h.stats.avg_flight_time,
              errors: h.stats.backspace_count,
              time: h.stats.total_time,
              pred: h.prediction.prediction
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dwell" stroke="#8884d8" name="Dwell Time" />
              <Line type="monotone" dataKey="flight" stroke="#82ca9d" name="Flight Time" />
              <Line type="monotone" dataKey="errors" stroke="#ff7300" name="Errors" />
              <Line type="monotone" dataKey="time" stroke="#387908" name="Total Time" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Information Panel */}
      <div className="card">
        <h3 className="result-header">📊 How it Works</h3>
        <div className="info-grid">
          <div className="info-section">
            <h4>Keystroke Features:</h4>
            <ul>
              <li><strong>Dwell Time:</strong> How long you hold each key</li>
              <li><strong>Flight Time:</strong> Delay between key presses</li>
              <li><strong>Error Rate:</strong> Number of backspaces/corrections</li>
              <li><strong>Typing Speed:</strong> Overall duration</li>
            </ul>
          </div>
          <div className="info-section">
            <h4>Fatigue Indicators:</h4>
            <ul>
              <li>Slower key presses</li>
              <li>Longer pauses between keys</li>
              <li>More typing mistakes</li>
              <li>Irregular rhythm patterns</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Research mode privacy statement */}
      {researchMode && (
        <div className="card">
          <h4>Research Mode Privacy Statement</h4>
          <p>Your typing data will be sent (anonymously) to help improve fatigue detection science. No personal info is collected.</p>
        </div>
      )}
    </div>
  );
}
