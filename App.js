import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SPACESHIP_WIDTH = 60;
const SPACESHIP_HEIGHT = 70;
const SPACESHIP_BOTTOM = 120;

const ASTEROID_SIZE = 45;
const MOVE_STEP = 35;
const MIN_LEFT = 0;
const MAX_LEFT = SCREEN_WIDTH - SPACESHIP_WIDTH;

// --- Polished Components ---
function Spaceship({ position }) {
  // Smooth animation for spaceship movement
  const animatedX = useRef(new Animated.Value(position)).current;

  useEffect(() => {
    Animated.spring(animatedX, {
      toValue: position,
      useNativeDriver: true,
      friction: 7,
      tension: 50,
    }).start();
  }, [position]);

  return (
    <Animated.View style={[styles.spaceshipContainer, { transform: [{ translateX: animatedX }] }]}>
      {/* Engine Glow */}
      <View style={styles.engineGlow} />
      
      {/* Main Body */}
      <View style={styles.shipBody}>
        <View style={styles.shipCockpit} />
        <View style={styles.shipDetailLine} />
      </View>

      {/* Wings */}
      <View style={[styles.wing, styles.wingLeft]} />
      <View style={[styles.wing, styles.wingRight]} />

      {/* Thruster Flame */}
      <View style={styles.flameInner} />
      <View style={styles.flameOuter} />
    </Animated.View>
  );
}

function Asteroid({ x, y }) {
  // Adding a simple continuous rotation to the asteroid
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.asteroid, { left: x, top: y, transform: [{ rotate: spin }] }]}>
      <View style={styles.crater1} />
      <View style={styles.crater2} />
      <View style={styles.crater3} />
    </Animated.View>
  );
}

// --- Main App ---
export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const [position, setPosition] = useState(MAX_LEFT / 2);
  const [asteroidX, setAsteroidX] = useState(0);
  const [asteroidY, setAsteroidY] = useState(-ASTEROID_SIZE);

  const gameLoopRef = useRef(null);

  // Load High Score
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem('@space_runner_high_score');
        if (savedScore !== null) {
          setHighScore(parseInt(savedScore, 10));
        }
      } catch (error) {
        console.error('Error loading high score:', error);
      }
    };
    loadHighScore();
  }, []);

  const spawnAsteroid = () => {
    const randomX = Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE);
    setAsteroidX(randomX);
    setAsteroidY(-ASTEROID_SIZE);
  };

  const handleStartGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setPosition(MAX_LEFT / 2);
    spawnAsteroid();
  };

  // Game Loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = setInterval(() => {
        setAsteroidY((prevY) => {
          // Increase speed slightly as score goes up for difficulty!
          const speed = 5 + Math.floor(score / 5); 
          const nextY = prevY + speed;
          
          if (nextY > SCREEN_HEIGHT) {
            setScore((prevScore) => prevScore + 1);
            spawnAsteroid();
            return -ASTEROID_SIZE;
          }
          return nextY;
        });
      }, 16);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameStarted, gameOver, score]);

  // Collision Detection
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const shipY = SCREEN_HEIGHT - SPACESHIP_BOTTOM - SPACESHIP_HEIGHT;
    
    // Make the hit-box slightly smaller than the visual ship for fairness
    const hitBoxPadding = 10; 
    
    const hasCollided =
      asteroidX < position + SPACESHIP_WIDTH - hitBoxPadding &&
      asteroidX + ASTEROID_SIZE > position + hitBoxPadding &&
      asteroidY < shipY + SPACESHIP_HEIGHT - hitBoxPadding &&
      asteroidY + ASTEROID_SIZE > shipY + hitBoxPadding;

    if (hasCollided) {
      setGameOver(true);
      clearInterval(gameLoopRef.current);

      let finalHighScore = highScore;
      if (score > highScore) {
        finalHighScore = score;
        setHighScore(score);
        AsyncStorage.setItem('@space_runner_high_score', score.toString());
      }

      Alert.alert(
        '💥 CRASHED! 💥', 
        `Score: ${score}\nBest: ${finalHighScore}`, 
        [{ text: 'Play Again', onPress: handleStartGame }]
      );
    }
  }, [asteroidX, asteroidY, position, gameStarted, gameOver, score, highScore]);

  const handleMoveLeft = () => {
    if (gameOver) return;
    setPosition((prev) => Math.max(MIN_LEFT, prev - MOVE_STEP));
  };

  const handleMoveRight = () => {
    if (gameOver) return;
    setPosition((prev) => Math.min(MAX_LEFT, prev + MOVE_STEP));
  };

  return (
    <LinearGradient colors={['#090914', '#1B143F', '#090914']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        <View style={styles.content}>
          <Text style={styles.title}>NEON RUNNER</Text>

          <View style={styles.scoreBoard}>
            <View style={styles.glassCard}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
            <View style={styles.glassCard}>
              <Text style={styles.scoreLabel}>BEST</Text>
              <Text style={[styles.scoreValue, styles.highScoreValue]}>{highScore}</Text>
            </View>
          </View>

          {!gameStarted || gameOver ? (
            <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
              <LinearGradient 
                colors={['#FF007A', '#7928CA']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>
                  {gameOver ? 'RESTART' : 'INITIALIZE LAUNCH'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>

        {gameStarted && <Asteroid x={asteroidX} y={asteroidY} />}
        <Spaceship position={position} />

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleMoveLeft} activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>◀ LEFT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleMoveRight} activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>RIGHT ▶</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, zIndex: 10 },
  
  // Modern Typography & Layout
  title: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', marginBottom: 40, letterSpacing: 4, textShadowColor: '#FF007A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  
  // Glassmorphism Scoreboard
  scoreBoard: { flexDirection: 'row', gap: 20, marginBottom: 50 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  scoreLabel: { fontSize: 13, color: '#A0AEC0', marginBottom: 6, fontWeight: '800', letterSpacing: 2 },
  scoreValue: { fontSize: 42, fontWeight: '900', color: '#00F0FF', textShadowColor: '#00F0FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  highScoreValue: { color: '#FF007A', textShadowColor: '#FF007A' },
  
  // Buttons
  startButton: { borderRadius: 30, shadowColor: '#FF007A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  gradientButton: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },

  // --- Better Spaceship Design ---
  spaceshipContainer: { position: 'absolute', bottom: SPACESHIP_BOTTOM, width: SPACESHIP_WIDTH, height: SPACESHIP_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  engineGlow: { position: 'absolute', bottom: -20, width: 40, height: 40, backgroundColor: '#00F0FF', borderRadius: 20, opacity: 0.3, transform: [{ scaleY: 2 }] },
  shipBody: { width: 28, height: 50, backgroundColor: '#E2E8F0', borderRadius: 14, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, zIndex: 2 },
  shipCockpit: { width: 14, height: 18, backgroundColor: '#090914', borderRadius: 7, borderWidth: 2, borderColor: '#00F0FF' },
  shipDetailLine: { width: 4, height: 15, backgroundColor: '#94A3B8', marginTop: 4, borderRadius: 2 },
  wing: { position: 'absolute', bottom: 10, width: 25, height: 35, backgroundColor: '#CBD5E1', borderTopLeftRadius: 30, borderBottomLeftRadius: 10, zIndex: 1 },
  wingLeft: { left: -5, transform: [{ skewY: '30deg' }] },
  wingRight: { right: -5, transform: [{ skewY: '-30deg' }, { scaleX: -1 }] },
  flameOuter: { position: 'absolute', bottom: -15, width: 14, height: 25, backgroundColor: '#FF007A', borderBottomLeftRadius: 7, borderBottomRightRadius: 7, zIndex: 0 },
  flameInner: { position: 'absolute', bottom: -5, width: 6, height: 15, backgroundColor: '#FDE047', borderBottomLeftRadius: 3, borderBottomRightRadius: 3, zIndex: 1 },

  // --- Better Asteroid Design ---
  asteroid: { position: 'absolute', width: ASTEROID_SIZE, height: ASTEROID_SIZE, backgroundColor: '#475569', borderRadius: ASTEROID_SIZE / 2, borderWidth: 3, borderColor: '#334155', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5 },
  crater1: { position: 'absolute', top: 8, left: 10, width: 12, height: 12, backgroundColor: '#334155', borderRadius: 6 },
  crater2: { position: 'absolute', bottom: 10, right: 8, width: 16, height: 16, backgroundColor: '#334155', borderRadius: 8 },
  crater3: { position: 'absolute', top: 20, left: 25, width: 8, height: 8, backgroundColor: '#334155', borderRadius: 4 },

  // --- Controls ---
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  controlButton: { flex: 1, marginHorizontal: 10, backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingVertical: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)' },
  controlButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});