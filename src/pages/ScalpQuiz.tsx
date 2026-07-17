import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Trophy, ChevronRight, Star, Home, Timer, Zap } from 'lucide-react';
import { quizQuestions, QuizQuestion, dummyLeaderboard } from '@/data/quizQuestions';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import ScalpIllustration from '@/components/ScalpIllustration';


// ✅ Get logged-in user ID
const getUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
};

interface QuizState {
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  wrongQuestionIds: number[];
  challengeHighScore: number;
}

const loadQuizState = (): QuizState => {
  try {
    const saved = localStorage.getItem('follisense-quiz');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { challengeHighScore: 0, ...parsed };
    }
  } catch {}
  return { totalPoints: 0, currentStreak: 0, bestStreak: 0, wrongQuestionIds: [], challengeHighScore: 0 };
};

const saveQuizState = (state: QuizState) => {
  localStorage.setItem('follisense-quiz', JSON.stringify(state));
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const TIMER_DURATION = 10;

const getMultiplier = (timeLeft: number): { label: string; value: number } => {
  if (timeLeft > 7) return { label: '2×', value: 2 };
  if (timeLeft > 4) return { label: '1.5×', value: 1.5 };
  return { label: '1×', value: 1 };
};


const ScalpQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isChallenge = searchParams.get('mode') === 'challenge';

  const [quizState, setQuizState] = useState<QuizState>(loadQuizState);

  const [phase, setPhase] = useState<'playing' | 'roundSummary'>('playing');
  const [userAttempts, setUserAttempts] = useState<any[]>([]); // previous attempts
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [roundQuestions, setRoundQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [answeredMultiplier, setAnsweredMultiplier] = useState<{ label: string; value: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    setTimeLeft(TIMER_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!isChallenge && phase === 'playing') startTimer();
    return () => clearTimer();
  }, [phase]);

  const pickQuestions = useCallback(
    (currentUsedIds: Set<number>) => {
      const wrong = quizQuestions.filter(q => quizState.wrongQuestionIds.includes(q.id) && !currentUsedIds.has(q.id));
      const rest = quizQuestions.filter(q => !quizState.wrongQuestionIds.includes(q.id) && !currentUsedIds.has(q.id));
      const pool = [...shuffleArray(wrong), ...shuffleArray(rest)];
      if (pool.length < 5) return shuffleArray([...quizQuestions]).slice(0, 5);
      return pool.slice(0, 5);
    },
    [quizState.wrongQuestionIds]
  );

  useEffect(() => {
    startNewRound();
  }, []);

  const currentQuestion = roundQuestions[questionIndex];
  const shuffledOptions = useMemo(() => currentQuestion ? shuffleArray(currentQuestion.options) : [], [currentQuestion?.id]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    clearTimer();
    setSelectedAnswer(answer);
    setShowExplanation(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    const newState = { ...quizState };
    const mult = isChallenge ? getMultiplier(timeLeft) : null;
    setAnsweredMultiplier(mult);

    if (isCorrect) {
      const basePoints = 10;
      const earnedPoints = isChallenge ? Math.round(basePoints * (mult?.value || 1)) : basePoints;
      newState.totalPoints += earnedPoints;
      newState.currentStreak += 1;
      if (newState.currentStreak > newState.bestStreak) newState.bestStreak = newState.currentStreak;
      if (newState.currentStreak % 5 === 0) newState.totalPoints += 15;
      newState.wrongQuestionIds = newState.wrongQuestionIds.filter(id => id !== currentQuestion.id);
      setRoundCorrect(prev => prev + 1);
      setRoundPoints(prev => prev + earnedPoints + (newState.currentStreak % 5 === 0 ? 15 : 0));
    } else {
      if (!isChallenge) {
        newState.totalPoints += 3;
        setRoundPoints(prev => prev + 3);
      }
      newState.currentStreak = 0;
      if (!newState.wrongQuestionIds.includes(currentQuestion.id)) newState.wrongQuestionIds.push(currentQuestion.id);
    }

    setQuizState(newState);
    saveQuizState(newState);
  };

  const handleTimeout = () => {
    if (selectedAnswer) return;
    setSelectedAnswer('__timeout__');
    setShowExplanation(true);
    setAnsweredMultiplier({ label: '0×', value: 0 });

    const newState = { ...quizState, currentStreak: 0 };
    if (!newState.wrongQuestionIds.includes(currentQuestion.id)) newState.wrongQuestionIds.push(currentQuestion.id);
    setQuizState(newState);
    saveQuizState(newState);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnsweredMultiplier(null);

    const nextIdx = questionIndex + 1;
    if (nextIdx >= 5) {
      const roundBonus = 5;
      const finalPoints = roundPoints + roundBonus;

      const newState = { ...quizState, totalPoints: quizState.totalPoints + roundBonus };
      if (isChallenge && finalPoints > quizState.challengeHighScore) newState.challengeHighScore = finalPoints;

      setQuizState(newState);
      saveQuizState(newState);
      setRoundPoints(finalPoints);

      if (!hasSaved) {
        saveQuizAttempt(finalPoints, roundCorrect, quizState.currentStreak);
        setHasSaved(true);
      }

      setPhase('roundSummary');
      clearTimer();
    } else {
      setQuestionIndex(nextIdx);
      if (isChallenge) startTimer();
    }
  };

  const startNewRound = () => {
    const newUsed = new Set(usedIds);
    roundQuestions.forEach(q => newUsed.add(q.id));
    setUsedIds(newUsed);
    setRoundQuestions(pickQuestions(newUsed));
    setQuestionIndex(0);
    setRoundCorrect(0);
    setRoundPoints(0);
    setPhase('playing');
    setHasSaved(false);
    if (isChallenge) startTimer();
  };

  const saveQuizAttempt = async (score: number, correct: number, streak: number) => {
    const userId = await getUserId();
    if (!userId) {
      toast.error("You must be logged in to save your quiz!");
      return;
    }

    const { error } = await supabase.from('quiz_attempts').insert([
      {
        stylist_user_id: userId,
        score,
        questions_answered: roundQuestions.length,
        correct_answers: correct,
        streak_at_time: streak,
      }
    ]);

    if (error) toast.error("Failed to save your quiz. Try again!");
    else toast.success("Your quiz was saved!");
  };

  const fetchUserAttempts = async () => {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('stylist_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) toast.error("Failed to fetch your attempts");
    return data || [];
  };

  useEffect(() => {
    fetchUserAttempts().then((attempts) => setUserAttempts(attempts));
  }, []);

  if (!currentQuestion && phase === 'playing') return null;

  const question = currentQuestion!;
  const isCorrect = selectedAnswer === question.correctAnswer;
  const isTimeout = selectedAnswer === '__timeout__';
  const timerPercent = (timeLeft / TIMER_DURATION) * 100;
  const timerColor = timeLeft > 7 ? 'bg-primary' : timeLeft > 4 ? 'bg-[hsl(40,70%,50%)]' : 'bg-destructive';


  if (phase === 'roundSummary') {
    return (
      <div className="page-container pt-6">
        <Toaster position="top-right" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-8">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-1">{isChallenge ? 'Challenge complete!' : 'Round complete!'}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isChallenge ? 'Speed and accuracy combined' : 'Great work building your clinical eye'}
          </p>

          <div className="card-elevated p-5 mb-4 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Score</span>
              <span className="text-sm font-semibold">{roundCorrect} out of 5 correct</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Points this round</span>
              <span className="text-sm font-semibold text-primary">+{roundPoints}</span>
            </div>
            {isChallenge && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Challenge high score</span>
                <span className="text-sm font-semibold">{quizState.challengeHighScore}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total points</span>
              <span className="text-sm font-semibold">{quizState.totalPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current streak</span>
              <span className="text-sm font-semibold flex items-center gap-1">
                <Flame size={14} className="text-primary" />{quizState.currentStreak}
              </span>
            </div>
          </div>

          <button onClick={startNewRound} className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm btn-press mb-3">
            Keep going
          </button>
          <button onClick={() => navigate('/stylist')} className="w-full h-12 bg-card border border-border text-foreground rounded-xl font-semibold text-sm btn-press flex items-center justify-center gap-2">
            <Home size={16} /> Back to home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container pt-6 pb-24">
      <Toaster position="top-right" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { clearTimer(); navigate('/stylist'); }} className="flex items-center gap-1 text-sm text-muted-foreground btn-press">
            <ArrowLeft size={16} /> Exit
          </button>
          <div className="flex items-center gap-3 text-xs">
            {isChallenge && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold">
                <Zap size={10} /> Challenge
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground"><Flame size={13} className="text-primary" />{quizState.currentStreak}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Star size={13} className="text-primary" />{quizState.totalPoints}</span>
          </div>
        </div>

        {/* Timer bar */}
        {isChallenge && !selectedAnswer && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer size={11} />{timeLeft}s</span>
              {timeLeft > 7 && <span className="text-[10px] font-semibold text-primary">2× bonus</span>}
              {timeLeft <= 7 && timeLeft > 4 && <span className="text-[10px] font-semibold text-[hsl(40,70%,50%)]">1.5× bonus</span>}
              {timeLeft <= 4 && timeLeft > 0 && <span className="text-[10px] font-semibold text-destructive">1× base</span>}
              {timeLeft === 0 && <span className="text-[10px] font-semibold text-destructive">Time's up!</span>}
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${timerColor}`}
                initial={false}
                animate={{ width: `${timerPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < questionIndex ? 'bg-primary' : i === questionIndex ? 'bg-primary/50' : 'bg-border'
            }`} />
          ))}
        </div>

        {/* Question */}
        <h1 className="text-lg font-semibold mb-4">What are you looking at?</h1>

        {/* Illustration & Options */}
        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden mb-4">
              <ScalpIllustration conditionId={question.conditionId} stageIndex={question.stageIndex} />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-5 italic">"{question.scenario}"</p>

            {/* Options */}
            <div className="space-y-2.5 mb-4">
              {shuffledOptions.map(option => {
                let bg = 'bg-card border border-border';
                if (selectedAnswer) {
                  if (option === question.correctAnswer) bg = 'bg-primary/15 border border-primary/40 text-foreground';
                  else if (option === selectedAnswer && !isCorrect) bg = 'bg-destructive/10 border border-destructive/30 text-foreground';
                }
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedAnswer}
                    className={`w-full p-3.5 rounded-xl text-sm font-medium text-left transition-colors btn-press ${bg}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4 mb-4">
                <p className="text-sm font-semibold mb-1">
                  {isTimeout ? "Time's up!" : isCorrect ? "That's right!" : 'Not quite'}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {isTimeout ? `The correct answer was ${question.correctAnswer}. ${question.incorrectExplanationTemplate}` : isCorrect ? question.correctExplanation : question.incorrectExplanationTemplate}
                </p>
                <p className="text-xs text-primary font-medium italic mb-2">{question.skinToneTip}</p>
                <p className="text-xs text-primary font-medium mb-1">
                  {isTimeout
                    ? '0 points, too slow!'
                    : isCorrect
                      ? `+${isChallenge && answeredMultiplier ? Math.round(10 * answeredMultiplier.value) : 10} points${isChallenge && answeredMultiplier ? ` (${answeredMultiplier.label})` : ''}${isCorrect && quizState.currentStreak % 5 === 0 && quizState.currentStreak > 0 ? ' + 15 streak bonus!' : ''}`
                      : isChallenge ? '0 points' : '+3 points'}
                </p>

                <button
                  onClick={() => navigate(`/stylist/learn?condition=${question.learnMoreId}`)}
                  className="text-xs text-primary font-medium flex items-center gap-1 mt-2 btn-press"
                >
                  Learn more about this condition <ChevronRight size={12} />
                </button>
              </motion.div>
            )}

            {/* Next button */}
            {showExplanation && (
              <button onClick={handleNext} className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm btn-press">
                {questionIndex >= 4 ? 'See results' : 'Next question'}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ScalpQuiz;