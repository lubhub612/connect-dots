import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [dots, setDots] = useState([]);
  const [connectedDots, setConnectedDots] = useState([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [level, setLevel] = useState(1);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [bestScores, setBestScores] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animatingDot, setAnimatingDot] = useState(null);
  const [lineAnimation, setLineAnimation] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState({});
  const [showBadge, setShowBadge] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [showFocusDirection, setShowFocusDirection] = useState(false);  
  const [gameMode, setGameMode] = useState('classic'); // 'classic' or 'countdown'
  const [countdownTime, setCountdownTime] = useState(60); // Initial time in seconds
  const [timeBonus, setTimeBonus] = useState(0);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [freezeRemaining, setFreezeRemaining] = useState(0);
  const [streakForFreeze, setStreakForFreeze] = useState(3); // Activate after 3 correct in a row
  const [freezesUsed, setFreezesUsed] = useState(0);
  
  const config = {
    freezeStreakThreshold: 3,  // How many correct for freeze
    freezeDuration: 3,         // Seconds of freeze time
    freezeCooldown: 5,         // Dots before next freeze can occur
    maxFreezesPerLevel: 3      // Limit freezes per level
  };

  // Badge definitions
  const levelBadges = {
    1: { name: "Beginner", color: "#4CAF50", icon: "🥇" },
    2: { name: "Quick Learner", color: "#2196F3", icon: "⚡" },
    3: { name: "Dot Master", color: "#9C27B0", icon: "🎯" },
    4: { name: "Speed Demon", color: "#FF9800", icon: "🏎️" },
    5: { name: "Puzzle Legend", color: "#F44336", icon: "🏆" }
  };

  const timerRef = useRef(null);
  const streakTimeoutRef = useRef(null);
  const focusTimeoutRef = useRef(null);
  const correctSoundRef = useRef(null);
  const incorrectSoundRef = useRef(null);
  const completeSoundRef = useRef(null);
   
  
    
        useEffect(() => {
            correctSoundRef.current = new Audio('/sounds/correct.mp3');
            incorrectSoundRef.current = new Audio('/sounds/incorrect.mp3');
            completeSoundRef.current = new Audio('/sounds/complete.mp3');
             
          
            // Preload sounds
            [ correctSoundRef,  incorrectSoundRef,completeSoundRef].forEach(sound => {
              sound.current.load();
              sound.current.volume = 0.3; // Set appropriate volume
            });
          }, []);
        
          const playSound = (soundRef) => {
            if (!soundEnabled) return;
            
            if (soundRef.current) {
              soundRef.current.currentTime = 0; // Rewind if already playing
              soundRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
          };

          useEffect(() => {
            if (gameComplete && !unlockedBadges[level]) {
              const newBadges = { ...unlockedBadges, [level]: true };
              setUnlockedBadges(newBadges);
              setShowBadge(level);
              
              // Hide badge after 3 seconds
              setTimeout(() => {
                setShowBadge(null);
              }, 3000);
            }
          }, [gameComplete, level, unlockedBadges]);     


          // Add to your component
useEffect(() => {
  const savedBadges = localStorage.getItem('dotGameBadges');
  if (savedBadges) {
    setUnlockedBadges(JSON.parse(savedBadges));
  }
}, []);

useEffect(() => {
  localStorage.setItem('dotGameBadges', JSON.stringify(unlockedBadges));
}, [unlockedBadges]);

// Add to your component
useEffect(() => {
  const savedStreak = localStorage.getItem('dotGameHighestStreak');
  if (savedStreak) {
    setHighestStreak(parseInt(savedStreak));
  }
}, []);

useEffect(() => {
  localStorage.setItem('dotGameHighestStreak', highestStreak.toString());
}, [highestStreak]);

    // Calculate direction to next dot
  const getDirectionToNextDot = () => {
    if (connectedDots.length === dots.length) return null;
    
    const nextDotId = connectedDots.length + 1;
    const nextDot = dots.find(dot => dot.id === nextDotId);
    if (!nextDot) return null;
    
    return {
      x: nextDot.x,
      y: nextDot.y,
      id: nextDotId
    };
  };

  // Toggle focus directions
  const toggleFocusDirections = () => {
    setShowFocusDirection(!showFocusDirection);
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    if (!showFocusDirection) {
      focusTimeoutRef.current = setTimeout(() => {
        setShowFocusDirection(false);
      }, 5000); // Auto-hide after 5 seconds
    }
  };
  // Play connection animation
  const playConnectionAnimation = (dotId) => {
    setAnimatingDot(dotId);
    setLineAnimation(true);
    
    setTimeout(() => {
      setLineAnimation(false);
      setAnimatingDot(null);
    }, 500);
  };

  // Toggle sound on/off
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  // Calculate base score for level
  const calculateBaseScore = () => {
    return 100 * level;
  };

  // Calculate time bonus
  const calculateTimeBonus = (completionTime) => {
    const maxBonus = calculateBaseScore() * 2;
    const timeLimit = 30 + (level * 10);
    return Math.max(0, Math.floor(maxBonus * (1 - (completionTime / timeLimit))));
  };

  // Generate random dots
  const generateDots = () => {
    const dotCount = 5 + level * 2;
    const newDots = [];
    
    for (let i = 1; i <= dotCount; i++) {
      newDots.push({
        id: i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        connected: false
      });
    }
    
    setDots(newDots);
    setConnectedDots([]);
    setGameComplete(false);
    setTime(0);
    setLevelScore(0);
    setIsRunning(false);
  };

  // Start the timer
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
  };

  // Stop the timer
  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
  };

  // Handle dot click
  const handleDotClick = (dotId) => {
    if (gameComplete) return;
    
    // Start timer on first click
    if (connectedDots.length === 0) {
      startTimer();
    }
    
    const dotIndex = dots.findIndex(dot => dot.id === dotId);
    const nextExpectedId = connectedDots.length + 1;
    
    if (dotId === nextExpectedId) {

      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > highestStreak) {
        setHighestStreak(newStreak);
      }

      // Activate time freeze on streak threshold
  

      // Show streak notification for streaks of 3 or more
      if (newStreak >= 3) {
        setShowStreak(true);
        if (streakTimeoutRef.current) {
          clearTimeout(streakTimeoutRef.current);
        }
        streakTimeoutRef.current = setTimeout(() => {
          setShowStreak(false);
        }, 1500);
      }

    /*  if (gameMode === 'countdown' && newStreak >= streakForFreeze) {
        setTimeFrozen(true);
        setFreezeRemaining(3); // Freeze for 3 seconds
        playSound('freeze'); // Add a special sound effect
      } */

      if (gameMode === 'countdown' && 
        newStreak >= config.freezeStreakThreshold && 
        freezesUsed < config.maxFreezesPerLevel) {
      setTimeFrozen(true);
      setFreezeRemaining(config.freezeDuration);
      setFreezesUsed(freezesUsed + 1);
      // Reset streak counter to prevent immediate re-freeze
      setCurrentStreak(0); 
    }

      // Correct dot clicked
      const updatedDots = [...dots];
      updatedDots[dotIndex].connected = true;
      setDots(updatedDots);
      
      
      setConnectedDots([...connectedDots, dotId]);
      playSound(correctSoundRef);
      playConnectionAnimation(dotId);

      // Reset focus direction timeout on any click
    if (showFocusDirection && focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = setTimeout(() => {
        setShowFocusDirection(false);
      }, 5000);
    }
      
      // Check if game is complete
      if (connectedDots.length + 1 === dots.length) {
        stopTimer();
        setGameComplete(true);
        playSound(completeSoundRef);
        setCurrentStreak(0); // Reset streak at level completion

        const baseScore = calculateBaseScore();
        const timeBonus = calculateTimeBonus(time);
        const calculatedScore = baseScore + timeBonus;
        
        setLevelScore(calculatedScore);
        setTotalScore(totalScore + calculatedScore);
        
        if (!bestScores[level] || calculatedScore > bestScores[level].score) {
          setBestScores({
            ...bestScores,
            [level]: {
              score: calculatedScore,
              time: time,
              streak: highestStreak
            }
          });
        }
      }
    } else {
      // Incorrect dot clicked
      setCurrentStreak(0); // Reset streak on incorrect click
      playSound(incorrectSoundRef);
      setAnimatingDot(dotId);
      setTimeout(() => setAnimatingDot(null), 500);
      setTimeFrozen(false);
      setFreezeRemaining(0);
    }
  };

  // Handle next level
  const handleNextLevel = () => {
    setShowBadge(null);
    setLevel(level + 1);
    generateDots();
  };

  // Reset the current level
  const handleReset = () => {
    stopTimer();
    generateDots();
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize game
  useEffect(() => {
    generateDots();
    return () => {
      stopTimer();
    };
  }, [level]);

  function CountdownTimer() {
    useEffect(() => {
      const timer = setInterval(() => {
        if (gameMode === 'countdown' && !gameComplete && countdownTime > 0) {
          setCountdownTime(prev => prev - 1);
        }
      }, 1000);
  
      return () => clearInterval(timer);
    }, [gameMode, gameComplete]);
  
    // Calculate bonus points (more time remaining = higher bonus)
    useEffect(() => {
      if (gameComplete && gameMode === 'countdown') {
        const bonus = Math.floor(countdownTime * 2); // 2 points per second remaining
        setTimeBonus(bonus);
        setTotalScore(prev => prev + bonus);
      }
    }, [gameComplete]);
  
    return (
      <div className={`timer ${countdownTime < 10 ? 'warning' : ''}`}>
        {Math.floor(countdownTime / 60)}:{(countdownTime % 60).toString().padStart(2, '0')}
      </div>
    );
  }

  function GameModeSelector() {
    return (
      <div className="mode-selector">
        <button 
          onClick={() => setGameMode('classic')}
          className={gameMode === 'classic' ? 'active' : ''}
        >
          Classic Mode
        </button>
        <button 
          onClick={() => {
            setGameMode('countdown');
            setCountdownTime(60); // Reset timer
            generateDots();
          }}
          className={gameMode === 'countdown' ? 'active' : ''}
        >
          Countdown Mode
        </button>
      </div>
    );
  }

  const calculateScore = () => {
    const baseScore = calculateBaseScore();
    
    if (gameMode === 'classic') {
      const timeBonus = calculateTimeBonus(time);
      return baseScore + timeBonus;
    } else {
      // In countdown mode, timeBonus is already calculated
      return baseScore + timeBonus;
    }
  };

  // Add to your game logic
useEffect(() => {
  if (gameMode === 'countdown' && countdownTime <= 0 && !gameComplete) {
    // Time's up!
    stopTimer();
    setGameComplete(true);
    playSound('incorrect'); // Different sound for time out
  }
}, [countdownTime, gameComplete]);

// Update your useEffect timer
useEffect(() => {
  const timer = setInterval(() => {
    if (gameMode === 'countdown' && !gameComplete && countdownTime > 0) {
      // Only decrement time if not frozen
      if (!timeFrozen) {
        setCountdownTime(prev => prev - 1);
      } else {
        // Decrement freeze time instead
        setFreezeRemaining(prev => {
          if (prev <= 1) {
            setTimeFrozen(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }
  }, 1000);

  return () => clearInterval(timer);
}, [gameMode, gameComplete, timeFrozen]);

  return (
    <div className="app">
      <h1>Connect the Dots</h1>
      <button 
        onClick={() => {
          [correctSoundRef, incorrectSoundRef,completeSoundRef].forEach(sound => {
            if (sound.current) {
              sound.current.muted = !sound.current.muted;
            }
          }) 
        }}
        className={`sound-button ${soundEnabled ? 'sound-on' : 'sound-off'}`}
        title={soundEnabled ? "Turn sound off" : "Turn sound on"}
      >
        {soundEnabled ? "🔊" : "🔇"}
      </button>

      <button 
        onClick={toggleFocusDirections}
        className={`focus-button ${showFocusDirection ? 'active' : ''}`}
        title={showFocusDirection ? "Hide directions" : "Show directions (5s)"}
      >
        {showFocusDirection ? "🧭" : "📍"}
      </button>

      {/* Badge display */}
      {showBadge && (
        <div className="badge-unlocked" style={{ backgroundColor: levelBadges[showBadge].color }}>
          <div className="badge-icon">{levelBadges[showBadge].icon}</div>
          <div className="badge-content">
            <h3>Badge Unlocked!</h3>
            <p>{levelBadges[showBadge].name}</p>
            <small>Level {showBadge} Complete</small>
          </div>
        </div>
      )}
      
      {/* Level selection with badges */}
      <div className="level-selector">
        {[1, 2, 3, 4, 5].map((lvl) => (
          <button
            key={lvl}
            onClick={() => {
              setLevel(lvl);
              generateDots();
              setShowBadge(null);
            }}
            className={`level-button ${level === lvl ? 'active' : ''} ${unlockedBadges[lvl] ? 'unlocked' : ''}`}
            disabled={lvl > 1 && !unlockedBadges[lvl - 1]}
          >
            {unlockedBadges[lvl] ? (
              <span className="badge-preview" style={{ backgroundColor: levelBadges[lvl].color }}>
                {levelBadges[lvl].icon}
              </span>
            ) : (
              <span className="level-number">{lvl}</span>
            )}
          </button>
        ))}
      </div>

      
      
      <div className="game-info">
        <div className="score-display">
          <div className="total-score">Total Score: {totalScore}</div>
          <div className="level-info">
          Level: {level} | Streak: {currentStreak} (Best: {highestStreak})
          </div>
        </div>
        <p>Connect dots in order from 1 to {dots.length}</p>
        <div className="timer-container">
          <div className="timer">Time: {formatTime(time)}</div>
          {bestScores[level] && (
            <div className="best-score">
              Best: {bestScores[level].score} pts ({formatTime(bestScores[level].time)})
            </div>
          )}
        </div>
      </div>

      <CountdownTimer />
      <GameModeSelector />

{timeFrozen && (
  <div className="time-freeze-effect">
    <div className="snowflake">❄️</div>
    <div className="freeze-timer">{freezeRemaining}s</div>
  </div>
)}


<div className={`timer ${countdownTime < 10 ? 'warning' : ''} ${timeFrozen ? 'frozen' : ''}`}>
  {formatTime(countdownTime)}
  {timeFrozen && <span className="freeze-icon">❄️</span>}
</div>


{showStreak && (
  <div className={`streak-notification streak-${Math.min(Math.floor(currentStreak / 3), 4)} 
       ${timeFrozen ? 'freeze-active' : ''}`}>
    {currentStreak} STREAK! {timeFrozen ? 'TIME FROZEN!' : `+${Math.floor(currentStreak / 3) * 50} BONUS`}
  </div>
)}
      <div className="game-container">
        <svg className="game-board" viewBox="0 0 100 100">
          {/* Draw lines between connected dots */}
          {connectedDots.length > 1 && dots.map((dot, index) => {
            if (index < connectedDots.length - 1) {
              const nextDot = dots.find(d => d.id === connectedDots[index + 1]);
              return (
                <line
                  key={`line-${dot.id}-${nextDot.id}`}
                  x1={`${dot.x}%`}
                  y1={`${dot.y}%`}
                  x2={`${nextDot.x}%`}
                  y2={`${nextDot.y}%`}
                  stroke="blue"
                  strokeWidth="2"
                  className={lineAnimation && index === connectedDots.length - 2 ? 'line-draw' : ''}
                />
              );
            }
            return null;
          })}
          
          {/* Render dots */}
          {dots.map(dot => (
            <g
              key={dot.id}
              onClick={() => handleDotClick(dot.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={`${dot.x}%`}
                cy={`${dot.y}%`}
                r="2"
                fill={dot.connected ? 'green' : 'red'}
                className={`
                  ${animatingDot === dot.id ? (dot.id === connectedDots.length + 1 ? 'correct-click' : 'incorrect-click') : ''}
                  ${dot.connected ? 'connected-dot' : ''}
                `}
              />
              <text
                x={`${dot.x}%`}
                y={`${dot.y}%`}
                dy="1.5"
                textAnchor="middle"
                fontSize="3"
                fill="white"
              >
                {dot.id}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {/* Focus direction indicator */}
      {showFocusDirection && getDirectionToNextDot() && (
        <svg className="focus-direction-overlay" viewBox="0 0 100 100">
          <line
            x1="50%"
            y1="50%"
            x2={`${getDirectionToNextDot().x}%`}
            y2={`${getDirectionToNextDot().y}%`}
            stroke="rgba(33, 150, 243, 0.5)"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <circle
            cx={`${getDirectionToNextDot().x}%`}
            cy={`${getDirectionToNextDot().y}%`}
            r="3"
            fill="none"
            stroke="rgba(33, 150, 243, 0.8)"
            strokeWidth="1.5"
          />
          <text
            x={`${getDirectionToNextDot().x}%`}
            y={`${getDirectionToNextDot().y}%`}
            dy="-6"
            textAnchor="middle"
            fontSize="4"
            fill="rgba(33, 150, 243, 0.8)"
            fontWeight="bold"
          >
            {getDirectionToNextDot().id}
          </text>
        </svg>
      )}
      
      <div className="button-container">
        <button onClick={handleReset} className="reset-button">
          Reset Level
        </button>
      </div>
      
      {gameComplete && (
        <>
          <div className="popup-backdrop" onClick={() => setShowBadge(null)} />
          <div className="game-complete-popup">
            <div className="popup-content">
              <h2>Level Complete! 🎉</h2>
              <div className="score-breakdown">
                <p>Base Score: {calculateBaseScore()} pts</p>
                <p>Time Bonus: +{calculateTimeBonus(time)} pts</p>
                {highestStreak >= 3 && (
                  <p>Streak Bonus: +{Math.floor(highestStreak / 3) * 50} pts</p>
                )}
                <p className="total-level-score">Level Score: {levelScore} pts</p>
              </div>
              <p>Completion Time: {formatTime(time)}</p>
              {bestScores[level] && levelScore >= bestScores[level].score && (
                <p className="new-record">New High Score! 🏆</p>
              )}

              {gameMode === 'countdown' && (
                  <p className="time-bonus">
                    Time Bonus: +{timeBonus} points ({countdownTime}s remaining)
                  </p>
              )}
              
              <div className="popup-buttons">
                <button onClick={handleNextLevel} className="next-level-button">
                  {level < 5 ? 'Next Level' : 'Play Again'}
                </button>
                <button 
                  onClick={() => {
                    setGameComplete(false);
                    handleReset();
                  }} 
                  className="replay-button"
                >
                  Replay Level
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    {/*  {gameComplete && (
        <div className="game-complete">
          <h2>Level Complete!</h2>
          <div className="score-breakdown">
            <p>Base Score: {calculateBaseScore()} pts</p>
            <p>Time Bonus: +{calculateTimeBonus(time)} pts</p>
            <p className="total-level-score">Level Score: {levelScore} pts</p>
          </div>
          <p>Completion Time: {formatTime(time)}</p>
          {bestScores[level] && levelScore >= bestScores[level].score && (
            <p className="new-record">New High Score! 🎉</p>
          )}
          <button onClick={handleNextLevel} className="next-level-button">
            {level < 5 ? 'Next Level' : 'Play Again'}
          </button>
        </div>
      )} */}

    </div>
  );
};

export default App;