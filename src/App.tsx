import React, { useState, useEffect, useRef, useCallback } from 'react';
import { allData, CardData, Gender, getCardExample } from './data';
import {
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Turtle,
  Repeat,
  Shuffle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Plus,
  ListChecks,
  X,
  Upload,
  Check,
  Search,
  BookOpen,
  AlertCircle,
  Loader2,
  Heart,
  PenTool,
  Lightbulb,
  Layers,
  Lock,
  Headphones,
  Eye,
  EyeOff,
  Calendar,
  Pencil,
  Download,
  Copy,
  Target,
  BarChart3,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  LogIn,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Share2,
} from 'lucide-react';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  syncUserDataToFirestore,
  loadUserDataFromFirestore,
  testConnection,
} from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const cardSlideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? -42 : 42,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 28,
      mass: 0.8,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? 42 : -42,
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.16,
      ease: 'easeInOut' as const,
    },
  }),
};

const TIMER_MAX = 30;
const HINTS_KEY = 'fr_fc7_hints';
const CUSTOM_WORDS_KEY = 'fr_fc7_custom_words_v1';
const WORDS_CLEARED_KEY = 'fr_fc7_words_cleared_v1';
const FAVORITES_KEY = 'fr_fc7_favorites_v1';
const WEAK_WORDS_KEY = 'fr_fc7_weak_words_v1';
const LESSONS_MAP_KEY = 'fr_fc7_lessons_map_v1';
const SPACED_CONFIG_KEY = 'fr_fc7_spaced_config_v1';
const SESSION_PROGRESS_KEY = 'fr_fc7_session_progress_v1';
const DAILY_LEARNED_KEY = 'fr_fc7_daily_learned_v1';
const FOCUS_MODE_KEY = 'fr_fc7_focus_mode_v1';
const DARK_MODE_KEY = 'fr_fc7_dark_mode_v1';
const SOUND_EFFECTS_KEY = 'fr_fc7_sound_effects_v1';

const getLocalDateKey = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type SpacedSystemType = '3' | '4' | '5';
type LessonScopeType = 'new_lesson' | 'review_old' | 'day_all' | number;

const SPACED_SYSTEM_INFO: Record<
  SpacedSystemType,
  { label: string; shortLabel: string; intervalsLabel: string; offsets: number[] }
> = {
  '3': {
    label: 'نظام 3 مرات',
    shortLabel: '3 مرات',
    intervalsLabel: 'المراجعة بعد: 1 يوم، 7 أيام، 30 يوم',
    offsets: [30, 7, 1, 0],
  },
  '4': {
    label: 'نظام 4 مرات',
    shortLabel: '4 مرات',
    intervalsLabel: 'المراجعة بعد: 1 يوم، 7 أيام، 14 يوم، 30 يوم',
    offsets: [30, 14, 7, 1, 0],
  },
  '5': {
    label: 'نظام 5 مرات',
    shortLabel: '5 مرات',
    intervalsLabel: 'المراجعة بعد: 1 يوم، 3 أيام، 7 أيام، 14 يوم، 30 يوم',
    offsets: [30, 14, 7, 3, 1, 0],
  },
};

const getLessonsForDay = (day: number, system: SpacedSystemType): number[] => {
  const offsets = SPACED_SYSTEM_INFO[system].offsets;
  return offsets.map((off) => day - off).filter((l) => l >= 0);
};

const formatDayLessonsFormula = (day: number, system: SpacedSystemType): string => {
  return getLessonsForDay(day, system)
    .map((l) => `درس ${l}`)
    .join(' + ');
};

const getWordLang = (d?: CardData): string => {
  if (!d) return 'fr-FR';
  if (d.lang) return d.lang;
  const text = d.fr.trim();
  if (
    /^(le |la |les |l'|un |une |des |du )/i.test(text) ||
    /[éèêëàâùûçîïôœ]/i.test(text)
  ) {
    return 'fr-FR';
  }
  return 'en-US';
};

const getLanguageLabel = (d?: CardData): string => {
  const lang = getWordLang(d);
  if (lang.startsWith('en')) return 'الإنجليزية';
  if (lang.startsWith('fr')) return 'الفرنسية';
  if (lang.startsWith('de')) return 'الألمانية';
  if (lang.startsWith('es')) return 'الإسبانية';
  if (lang.startsWith('it')) return 'الإيطالية';
  return 'الكلمة';
};

const getGenderInfo = (g?: Gender): { label: string; color: string } => {
  switch (g) {
    case 'f':
      return { label: 'مؤنث', color: '#E24B4A' };
    case 'm':
      return { label: 'مذكر', color: '#378ADD' };
    case 'pl':
      return { label: 'جمع', color: '#639922' };
    case 'v':
      return { label: 'فعل (Verb)', color: '#8B5CF6' };
    case 'adj':
      return { label: 'صفة (Adj)', color: '#F59E0B' };
    case 'n':
    default:
      return { label: 'اسم (Noun)', color: '#378ADD' };
  }
};

// Normalize string for smart writing comparison (strips accents & extra spaces)
const stripAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const stripArticle = (s: string) =>
  s
    .replace(/^(le |la |les |l'|l’|un |une |des |du |de la |d'|d’|se |s'|s’|the |a |an |to )/i, '')
    .trim();

const isWrittenAnswerMatch = (userInput: string, targetFr: string): boolean => {
  const cleanUser = stripAccents(userInput).replace(/-/g, ' ');
  if (!cleanUser) return false;

  // Support slash-separated variants like "la natation / la nage"
  const variants = targetFr
    .split('/')
    .map((v) => v.trim())
    .filter(Boolean);
  variants.push(targetFr.trim());

  for (const variant of variants) {
    const cleanTarget = stripAccents(variant).replace(/-/g, ' ');
    const cleanTargetNoArticle = stripAccents(stripArticle(variant)).replace(/-/g, ' ');
    const cleanUserNoArticle = stripAccents(stripArticle(userInput)).replace(/-/g, ' ');

    if (
      cleanUser === cleanTarget ||
      (cleanTargetNoArticle.length >= 2 && cleanUser === cleanTargetNoArticle) ||
      (cleanTargetNoArticle.length >= 2 && cleanUserNoArticle === cleanTargetNoArticle)
    ) {
      return true;
    }
  }
  return false;
};

const getSmartWritingFeedbackNote = (userInput: string, targetFr: string): string | null => {
  const rawUser = userInput.trim().toLowerCase();
  if (!rawUser) return null;
  const variants = targetFr
    .split('/')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (variants.includes(rawUser)) return null;
  return `💡 ملاحظة للتثبيت: إجابتك صحيحة! الشكل الكامل مع الأداة/التشكيل هو: (${targetFr})`;
};

const renderSentenceWithHighlightedWord = (
  exFr: string,
  targetFr: string,
  onWordClick?: (e: React.MouseEvent) => void,
  hideWord?: boolean,
  onRevealWord?: (e: React.MouseEvent) => void
): React.ReactNode => {
  const mainVariant = targetFr.split('/')[0].trim();
  const bareWord = stripArticle(mainVariant);
  const fullSentence = exFr && exFr.trim() ? exFr.trim() : mainVariant;
  const candidates = [mainVariant, bareWord].filter((c) => c.length >= 2);

  const renderBadge = (textToDisplay: string) => {
    if (hideWord) {
      return (
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (onRevealWord) onRevealWord(e);
            else if (onWordClick) onWordClick(e);
          }}
          title="اضغط لكشف الكلمة أو نطقها"
          className="inline-flex items-center gap-1.5 px-3 py-0.5 mx-1 rounded-xl bg-amber-500/20 border border-dashed border-amber-500/60 text-amber-800 dark:text-amber-300 font-extrabold cursor-pointer hover:bg-amber-500/30 active:scale-95 transition-all text-sm"
        >
          <Eye size={13} className="shrink-0" />
          <span>•••••</span>
        </span>
      );
    }

    return (
      <span
        onClick={
          onWordClick
            ? (e) => {
                e.stopPropagation();
                onWordClick(e);
              }
            : undefined
        }
        title={onWordClick ? `اضغط لنطق الكلمة بمفردها: ${mainVariant}` : undefined}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 mx-0.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-extrabold underline decoration-emerald-500 decoration-2 underline-offset-4 ${
          onWordClick
            ? 'cursor-pointer hover:bg-emerald-500/30 active:scale-95 transition-all shadow-2xs'
            : ''
        }`}
      >
        <span>{textToDisplay}</span>
        {onWordClick && <Volume2 size={13} className="shrink-0 opacity-85" />}
      </span>
    );
  };

  for (const cand of candidates) {
    const escaped = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'i');
    const match = fullSentence.match(regex);
    if (match && match.index !== undefined) {
      const before = fullSentence.slice(0, match.index);
      const matchedText = match[0];
      const after = fullSentence.slice(match.index + matchedText.length);
      return (
        <>
          <span>{before}</span>
          {renderBadge(matchedText)}
          <span>{after}</span>
        </>
      );
    }
  }

  return (
    <>
      <span>{fullSentence} </span>
      {renderBadge(`(${mainVariant})`)}
    </>
  );
};

const renderInteractiveLetterSlots = (targetFr: string, userInput: string): React.ReactNode => {
  const main = targetFr.split('/')[0].trim();
  const articleMatch = main.match(/^(le |la |les |l'|un |une |des |du |de la |the |a |an |to )/i);
  const prefix = articleMatch ? articleMatch[0] : '';
  const core = main.slice(prefix.length).trim();
  if (!core) return null;

  const cleanTyped = stripArticle(userInput.trim());

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 my-1.5" dir="ltr">
      {prefix && (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold mr-1">
          {prefix.trim()}
        </span>
      )}
      {core.split('').map((targetChar, idx) => {
        if (targetChar === ' ' || targetChar === '-' || targetChar === "'") {
          return (
            <span
              key={idx}
              className="px-1 text-xs font-mono font-bold text-[var(--muted-foreground)]"
            >
              {targetChar === ' ' ? '␣' : targetChar}
            </span>
          );
        }
        const typedChar = cleanTyped[idx];
        const isFirstHint = idx === 0 && !typedChar;
        return (
          <span
            key={idx}
            className={`w-6 h-7 sm:w-7 sm:h-8 rounded-lg border text-xs sm:text-sm font-mono font-extrabold flex items-center justify-center transition-all ${
              typedChar
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 scale-105'
                : isFirstHint
                ? 'bg-[var(--muted)] border-dashed border-emerald-500/40 text-emerald-600/60 dark:text-emerald-400/60'
                : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--muted-foreground)]/40'
            }`}
          >
            {typedChar || (isFirstHint ? targetChar : '_')}
          </span>
        );
      })}
    </div>
  );
};

const renderCharacterDiff = (userInput: string, targetFr: string): React.ReactNode => {
  const mainTarget = targetFr.split('/')[0].trim();
  const cleanTargetNoArt = stripArticle(mainTarget);
  const cleanUserNoArt = stripArticle(userInput.trim());
  const compareTarget =
    userInput.trim().length <= cleanTargetNoArt.length + 2 ? cleanTargetNoArt : mainTarget;
  const compareUser =
    compareTarget === cleanTargetNoArt ? cleanUserNoArt : userInput.trim();

  return (
    <div className="space-y-1 pt-1">
      <div className="text-[10px] font-semibold opacity-80">
        مقارنة الحروف (الأخضر صحيح • الأحمر خطأ أو ناقص):
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1" dir="ltr">
        {compareTarget.split('').map((tChar, idx) => {
          const uChar = compareUser[idx] || '';
          const exactMatch = uChar.toLowerCase() === tChar.toLowerCase();
          const accentMatch =
            !exactMatch &&
            uChar &&
            stripAccents(uChar.toLowerCase()) === stripAccents(tChar.toLowerCase());
          return (
            <span
              key={idx}
              className={`min-w-[22px] h-6 px-1 rounded-md border text-xs font-mono font-extrabold flex items-center justify-center ${
                exactMatch
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : accentMatch
                  ? 'bg-amber-500/25 border-amber-500/50 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-800 dark:text-rose-200 underline decoration-wavy'
              }`}
              title={
                exactMatch
                  ? 'حرف صحيح'
                  : accentMatch
                  ? `الحرف صحيح ولكن بتشكيل مختلف (${tChar})`
                  : `المطلوب: ${tChar}`
              }
            >
              {tChar === ' ' ? '␣' : tChar}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const getWordStructureMask = (targetFr: string): { mask: string; letterCount: number } => {
  const main = targetFr.split('/')[0].trim();
  const articleMatch = main.match(/^(le |la |les |l'|un |une |des |du |de la |the |a |an |to )/i);
  const prefix = articleMatch ? articleMatch[0] : '';
  const core = main.slice(prefix.length).trim();
  if (!core) return { mask: '', letterCount: 0 };

  const maskedCore = core
    .split('')
    .map((ch, idx) => {
      if (ch === ' ' || ch === '-' || ch === "'") return ch;
      if (idx === 0) return ch;
      return '_';
    })
    .join(' ');

  const lettersOnly = core.replace(/[^a-zA-ZÀ-ÿœŒæÆ]/g, '').length;
  return {
    mask: prefix ? `${prefix}${maskedCore}` : maskedCore,
    letterCount: lettersOnly,
  };
};

type StudyStage = 'flashcards' | 'quiz' | 'writing';
type CardOutcome = 'correct' | 'wrong' | 'skipped';
type StageOutcomesMap = Record<StudyStage, Record<string, CardOutcome>>;

const getImageUrl = (kw: string) => {
  if (!kw) return '';
  if (kw.startsWith('http') || kw.startsWith('/')) return kw;
  const prompt = `Realistic photograph of ${kw}, clear subject, educational flashcard illustration, high quality`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=300&nologo=true&seed=42`;
};

const CardImage = ({ d }: { d: CardData }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setError(false);
    setSrc(null);

    const primaryUrl = getImageUrl(d.kw);
    if (!primaryUrl) {
      setError(true);
      return;
    }

    const img = new Image();
    img.referrerPolicy = 'no-referrer';

    const timeoutId = setTimeout(() => {
      if (isMounted) {
        img.src = '';
        setError(true);
      }
    }, 5500);

    img.onload = () => {
      if (isMounted) {
        clearTimeout(timeoutId);
        setSrc(primaryUrl);
        setLoaded(true);
      }
    };

    img.onerror = () => {
      if (isMounted) {
        clearTimeout(timeoutId);
        setError(true);
      }
    };

    img.src = primaryUrl;

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      img.src = '';
    };
  }, [d.kw, d.fr]);

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
        <BookOpen size={24} className="mb-1 text-emerald-700/50 dark:text-emerald-300/50" />
        <span className="text-[11px] font-semibold text-emerald-900/70 dark:text-emerald-100/80 line-clamp-1">
          {d.cat}
        </span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-900/40 dark:text-emerald-100/40 animate-pulse">
          <ImageIcon size={24} className="mb-1 opacity-50" />
          <span className="text-[10px] font-medium">جاري تحميل الصورة...</span>
        </div>
      )}
      {src && (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  );
};

export default function App() {
  // Load initial words for Lesson 0 fallback
  const getInitialLesson0Words = (): CardData[] => {
    try {
      const isCleared = localStorage.getItem(WORDS_CLEARED_KEY) === 'true';
      if (isCleared) return [];
      const saved = localStorage.getItem(CUSTOM_WORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback to default data
    }
    return allData;
  };

  // Multi-lesson storage map: { 0: CardData[], 1: CardData[], ... 30: CardData[] }
  const [lessonsMap, setLessonsMap] = useState<Record<number, CardData[]>>(() => {
    try {
      const savedMap = localStorage.getItem(LESSONS_MAP_KEY);
      if (savedMap) {
        const parsed = JSON.parse(savedMap);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Fallback
    }
    return { 0: getInitialLesson0Words() };
  });

  // Spaced repetition configuration (system: '3' | '4' | '5', selectedDay: 0..30, completedDays)
  const [spacedSystem, setSpacedSystem] = useState<SpacedSystemType>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (saved.spacedSystem === '3' || saved.spacedSystem === '4' || saved.spacedSystem === '5') {
        return saved.spacedSystem;
      }
    } catch {
      // Ignore
    }
    return '5';
  });

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      const session = JSON.parse(localStorage.getItem(SESSION_PROGRESS_KEY) || '{}');
      const savedCompleted: Record<number, boolean> =
        saved.completedDays && typeof saved.completedDays === 'object' ? saved.completedDays : {};

      let candidateDay =
        typeof saved.selectedDay === 'number' && saved.selectedDay >= 0 && saved.selectedDay <= 30
          ? saved.selectedDay
          : typeof session.selectedDay === 'number' &&
            session.selectedDay >= 0 &&
            session.selectedDay <= 30
          ? session.selectedDay
          : 0;

      // If candidateDay is already marked completed, automatically advance to the next uncompleted day (e.g., finished Day 0 & 1 -> open directly on Day 2)
      while (candidateDay < 30 && savedCompleted[candidateDay]) {
        candidateDay++;
      }

      return candidateDay;
    } catch {
      // Ignore
    }
    return 0;
  });

  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (saved.completedDays && typeof saved.completedDays === 'object') {
        return saved.completedDays;
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const [completedDayLessons, setCompletedDayLessons] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (saved.completedDayLessons && typeof saved.completedDayLessons === 'object') {
        return saved.completedDayLessons;
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const [completedDaysDates, setCompletedDaysDates] = useState<Record<number, string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (saved.completedDaysDates && typeof saved.completedDaysDates === 'object') {
        return saved.completedDaysDates;
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const [lessonTitles, setLessonTitles] = useState<Record<number, string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (saved.lessonTitles && typeof saved.lessonTitles === 'object') {
        return saved.lessonTitles;
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const [autoSpeak5Sec, setAutoSpeak5Sec] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
      if (typeof saved.autoSpeak5Sec === 'boolean') {
        return saved.autoSpeak5Sec;
      }
    } catch {
      // Ignore
    }
    return true;
  });

  const [readingCountdown, setReadingCountdown] = useState<number | null>(null);
  const [showQuickCardEdit, setShowQuickCardEdit] = useState(false);

  const getLessonLabel = useCallback(
    (lessonNum: number) => {
      const customTitle = lessonTitles[lessonNum]?.trim();
      return customTitle ? `درس ${lessonNum}: ${customTitle}` : `درس ${lessonNum}`;
    },
    [lessonTitles]
  );

  const updateLessonTitle = useCallback((lessonNum: number, title: string) => {
    setLessonTitles((prev) => ({
      ...prev,
      [lessonNum]: title,
    }));
  }, []);

  const [selectedLessonScope, setSelectedLessonScope] = useState<LessonScopeType>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_PROGRESS_KEY) || '{}');
      if (
        saved.selectedDay === selectedDay &&
        (saved.selectedLessonScope === 'new_lesson' ||
          saved.selectedLessonScope === 'review_old' ||
          saved.selectedLessonScope === 'day_all' ||
          typeof saved.selectedLessonScope === 'number')
      ) {
        return saved.selectedLessonScope;
      }
    } catch {
      // Ignore
    }
    return 'new_lesson';
  });
  const [targetEditLesson, setTargetEditLesson] = useState<number>(() => selectedDay);
  const [showSpacedModal, setShowSpacedModal] = useState(false);

  // Compute active words based on selectedDay, spacedSystem, and selectedLessonScope
  const computeWordsForSelection = useCallback(
    (
      map: Record<number, CardData[]>,
      day: number,
      sys: SpacedSystemType,
      scope: LessonScopeType
    ): CardData[] => {
      if (typeof scope === 'number') {
        return map[scope] || [];
      }
      if (scope === 'new_lesson') {
        return map[day] || [];
      }
      const dueLessons = getLessonsForDay(day, sys);
      if (scope === 'review_old') {
        return dueLessons.filter((l) => l !== day).flatMap((lessonNum) => map[lessonNum] || []);
      }
      // 'day_all': If today's new lesson (درس day) has no words yet, do NOT repeat old lessons alone!
      const newLessonWords = map[day] || [];
      if (newLessonWords.length === 0) {
        return [];
      }
      const orderedLessons = [day, ...dueLessons.filter((l) => l !== day)];
      return orderedLessons.flatMap((lessonNum) => map[lessonNum] || []);
    },
    []
  );

  const [masterWords, setMasterWords] = useState<CardData[]>(() =>
    computeWordsForSelection(lessonsMap, selectedDay, spacedSystem, selectedLessonScope)
  );

  // Load favorites from localStorage
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Fallback
    }
    return {};
  });

  // Load weak/mistake words from localStorage (wordFr -> mistake count)
  const [weakWords, setWeakWords] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(WEAK_WORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Fallback
    }
    return {};
  });

  // Load daily learned words log from localStorage (YYYY-MM-DD -> unique wordFr array)
  const [dailyLearnedWords, setDailyLearnedWords] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(DAILY_LEARNED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Fallback
    }
    return {};
  });

  const recordLearnedWordsOnDate = useCallback(
    (words: string[], dateStr = getLocalDateKey()) => {
      const validWords = words.map((w) => w?.trim()).filter(Boolean);
      if (validWords.length === 0) return;
      setDailyLearnedWords((prev) => {
        const existing = Array.isArray(prev[dateStr]) ? prev[dateStr] : [];
        const mergedSet = new Set([...existing, ...validWords]);
        if (mergedSet.size === existing.length) return prev;
        const next = { ...prev, [dateStr]: Array.from(mergedSet) };
        try {
          localStorage.setItem(DAILY_LEARNED_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage errors
        }
        return next;
      });
    },
    []
  );

  // Load saved session progress if it matches the active day & system
  const initialSession = (() => {
    try {
      const raw = localStorage.getItem(SESSION_PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.selectedDay === selectedDay &&
          parsed.spacedSystem === spacedSystem &&
          Array.isArray(parsed.queue) &&
          parsed.queue.length > 0
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  })();

  // 3-Stage Mastery System: 'flashcards' (Stage 1) -> 'quiz' (Stage 2) -> 'writing' (Stage 3)
  const [stage, setStage] = useState<StudyStage>(() =>
    initialSession?.stage === 'quiz' || initialSession?.stage === 'writing'
      ? initialSession.stage
      : 'flashcards'
  );
  const [stage2Unlocked, setStage2Unlocked] = useState<boolean>(() =>
    Boolean(initialSession?.stage2Unlocked)
  );
  const [stage3Unlocked, setStage3Unlocked] = useState<boolean>(() =>
    Boolean(initialSession?.stage3Unlocked)
  );
  const [stageLockMessage, setStageLockMessage] = useState<string | null>(null);
  const [flipWarning, setFlipWarning] = useState<string | null>(null);
  const [studyFilter, setStudyFilter] = useState<'all' | 'favorites' | 'weak'>(() =>
    initialSession?.studyFilter === 'favorites' ? 'favorites' : 'all'
  );
  const [queue, setQueue] = useState<CardData[]>(() =>
    initialSession?.queue?.length ? initialSession.queue : masterWords
  );
  const [current, setCurrent] = useState<number>(() => {
    if (initialSession && typeof initialSession.current === 'number') {
      const maxIdx = Math.max(0, (initialSession.queue?.length || 1) - 1);
      return Math.min(Math.max(0, initialSession.current), maxIdx);
    }
    return 0;
  });
  const [wrongList, setWrongList] = useState<CardData[]>(() =>
    Array.isArray(initialSession?.wrongList) ? initialSession.wrongList : []
  );
  const [skippedList, setSkippedList] = useState<CardData[]>(() =>
    Array.isArray(initialSession?.skippedList) ? initialSession.skippedList : []
  );
  const [correctCount, setCorrectCount] = useState<number>(() =>
    typeof initialSession?.correctCount === 'number' ? initialSession.correctCount : 0
  );
  const [wrongCount, setWrongCount] = useState<number>(() =>
    typeof initialSession?.wrongCount === 'number' ? initialSession.wrongCount : 0
  );
  const [skipCount, setSkipCount] = useState<number>(() =>
    typeof initialSession?.skipCount === 'number' ? initialSession.skipCount : 0
  );
  const [stageOutcomes, setStageOutcomes] = useState<StageOutcomesMap>(() => {
    if (
      initialSession?.stageOutcomes &&
      typeof initialSession.stageOutcomes === 'object'
    ) {
      return {
        flashcards: initialSession.stageOutcomes.flashcards || {},
        quiz: initialSession.stageOutcomes.quiz || {},
        writing: initialSession.stageOutcomes.writing || {},
      };
    }
    return { flashcards: {}, quiz: {}, writing: {} };
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [timerSec, setTimerSec] = useState(TIMER_MAX);
  const [answered, setAnswered] = useState<boolean>(() => {
    if (initialSession?.cardAnswers && typeof initialSession.current === 'number') {
      return initialSession.cardAnswers[initialSession.current] !== undefined;
    }
    return false;
  });
  const [round, setRound] = useState<number>(() =>
    typeof initialSession?.round === 'number' ? initialSession.round : 1
  );
  const [isRetryRound, setIsRetryRound] = useState<boolean>(() =>
    Boolean(initialSession?.isRetryRound)
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DARK_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [hideSentenceWord, setHideSentenceWord] = useState(false);
  const [revealedCardWord, setRevealedCardWord] = useState(false);
  const [confirmResetRound, setConfirmResetRound] = useState(false);
  const [showRoundDrawer, setShowRoundDrawer] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FOCUS_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [hints, setHints] = useState<Record<string, string>>({});
  const [cardAnswers, setCardAnswers] = useState<Record<number, CardOutcome>>(() =>
    initialSession?.cardAnswers && typeof initialSession.cardAnswers === 'object'
      ? initialSession.cardAnswers
      : {}
  );
  const [repeatActive, setRepeatActive] = useState(false);
  const [isFinished, setIsFinished] = useState<boolean>(() =>
    Boolean(initialSession?.isFinished)
  );
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_EFFECTS_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSoundEffects = useCallback(() => {
    setSoundEffectsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_EFFECTS_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const [cloudToast, setCloudToast] = useState<{ visible: boolean; message: string; id: number }>({
    visible: false,
    message: '',
    id: 0,
  });
  const cloudToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isShaking, setIsShaking] = useState(false);
  const [answerEffect, setAnswerEffect] = useState<'correct' | 'wrong' | null>(null);
  const [answerEffectKey, setAnswerEffectKey] = useState(0);
  const [brokenStreakCount, setBrokenStreakCount] = useState(0);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const playCloudChime = useCallback(() => {
    if (!soundEffectsEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      // High crystal two-tone cloud chime (A5 880Hz -> E6 1318.5Hz)
      const notes = [880, 1318.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.37);
      });
    } catch {
      // Ignore
    }
  }, [soundEffectsEnabled]);

  const triggerCloudToast = useCallback(
    (msg = 'تم الحفظ في السحابة بنجاح ☁️✓') => {
      if (cloudToastTimeoutRef.current) {
        clearTimeout(cloudToastTimeoutRef.current);
      }
      setCloudToast({ visible: true, message: msg, id: Date.now() });
      playCloudChime();
      cloudToastTimeoutRef.current = setTimeout(() => {
        setCloudToast((prev) => ({ ...prev, visible: false }));
      }, 2500);
    },
    [playCloudChime]
  );

  const playAnswerSound = useCallback(
    (type: 'correct' | 'wrong', streakLevel = 1) => {
      if (!soundEffectsEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;

        if (type === 'correct') {
          // Escalating pitch multiplier as streak grows (up to +8 semitone steps)
          const pitchShift = Math.pow(1.032, Math.min(Math.max(0, streakLevel - 1), 8));
          const isMilestone = streakLevel > 0 && streakLevel % 5 === 0;
          const baseNotes = isMilestone
            ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
            : [523.25, 659.25, 783.99, 1046.5];

          baseNotes.forEach((baseFreq, i) => {
            const freq = baseFreq * pitchShift;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i === baseNotes.length - 1 ? 'triangle' : 'sine';
            const startTime = now + i * 0.055;
            const duration = i === baseNotes.length - 1 ? 0.36 : 0.18;
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);
          });
        } else {
          // Soft and instructive low reminder tone (gentle, not irritating)
          const pulses = [
            { start: 0, dur: 0.15, f1: 220, f2: 175 },
            { start: 0.16, dur: 0.22, f1: 175, f2: 110 },
          ];
          pulses.forEach(({ start, dur, f1, f2 }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t0 = now + start;
            osc.frequency.setValueAtTime(f1, t0);
            osc.frequency.linearRampToValueAtTime(f2, t0 + dur);

            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
          });

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([60, 30, 90]);
          }
        }
      } catch {
        // Ignore audio context errors if blocked by browser autoplay policy
      }
    },
    [soundEffectsEnabled]
  );

  const triggerWrongShake = useCallback(() => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimeoutRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 520);
    });
  }, []);

  const triggerAnswerFeedback = useCallback(
    (type: 'correct' | 'wrong', prevStreak = 0) => {
      if (effectTimeoutRef.current) {
        clearTimeout(effectTimeoutRef.current);
      }
      const nextStreak = type === 'correct' ? prevStreak + 1 : 0;
      playAnswerSound(type, nextStreak);
      if (type === 'wrong') {
        setBrokenStreakCount(prevStreak >= 2 ? prevStreak : 0);
        triggerWrongShake();
      } else {
        setBrokenStreakCount(0);
        setIsShaking(false);
      }
      setAnswerEffect(type);
      setAnswerEffectKey((k) => k + 1);
      effectTimeoutRef.current = setTimeout(() => {
        setAnswerEffect(null);
      }, 720);
    },
    [playAnswerSound, triggerWrongShake]
  );

  // Mobile PWA Install & Online Status states
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Detect PWA Installation status and listen for beforeinstallprompt & online status
  useEffect(() => {
    // Check if app is running in standalone mode (already installed on homescreen)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsPWAInstalled(isStandalone);

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isIOS = /iphone|ipad|ipod/.test(ua);
    setIsIOSDevice(isIOS);
    if (isIOS) {
      setInstallDeviceTab('ios');
    } else if (!/android|mobile/.test(ua)) {
      setInstallDeviceTab('pc');
    } else {
      setInstallDeviceTab('android');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setDeferredInstallPrompt(null);
      setShowInstallModal(false);
      triggerCloudToast('تم تثبيت التطبيق بنجاح على جهازك! 🎉');
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerCloudToast]);

  const handleInstallPWA = async () => {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsPWAInstalled(true);
          setDeferredInstallPrompt(null);
          setShowInstallModal(false);
          triggerCloudToast('جاري تثبيت التطبيق على جهازك...');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Stage 3 (Writing & Dictation) states
  const [writingInput, setWritingInput] = useState('');
  const [writingStatus, setWritingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [dictationAudioOnly, setDictationAudioOnly] = useState(false);
  const writingInputRef = useRef<HTMLInputElement | null>(null);

  // Word Manager & AI Modal States
  const [showManager, setShowManager] = useState(false);
  const [managerTab, setManagerTab] = useState<'ai' | 'list' | 'favorites' | 'stats' | 'backup'>('ai');
  const [aiInputText, setAiInputText] = useState('');
  const [aiImage, setAiImage] = useState<{ data: string; mimeType: string; name: string } | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analyzedPreview, setAnalyzedPreview] = useState<CardData[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Quick Word Edit States
  const [editingWordFr, setEditingWordFr] = useState<string | null>(null);
  const [editWordFrVal, setEditWordFrVal] = useState('');
  const [editWordArVal, setEditWordArVal] = useState('');
  const [editWordGenderVal, setEditWordGenderVal] = useState<Gender>('n');
  const [editWordHintVal, setEditWordHintVal] = useState('');
  const [editWordExFrVal, setEditWordExFrVal] = useState('');
  const [editWordExArVal, setEditWordExArVal] = useState('');

  // Backup Import/Export States
  const [backupJsonText, setBackupJsonText] = useState('');
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Firebase Auth & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('fr_fc7_last_cloud_sync') || null;
    } catch {
      return null;
    }
  });
  const isCloudDataLoadedRef = useRef(false);

  // List management states
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmRestoreDefaults, setConfirmRestoreDefaults] = useState(false);
  const [manualFr, setManualFr] = useState('');
  const [manualAr, setManualAr] = useState('');
  const [manualGender, setManualGender] = useState<Gender>('n');
  const [manualCat, setManualCat] = useState('📝 مفردات عامة');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Collect favorite words across current masterWords and all saved lessons (deduplicated)
  const favoriteWordsList = (() => {
    const seen = new Set<string>();
    const result: CardData[] = [];
    const allSources = [...masterWords, ...Object.values(lessonsMap).flat()];
    for (const w of allSources) {
      if (favorites[w.fr] && !seen.has(w.fr)) {
        seen.add(w.fr);
        result.push(w);
      }
    }
    return result;
  })();

  // Collect weak/mistake words across current masterWords and all saved lessons (sorted by mistake count)
  const weakWordsList = (() => {
    const seen = new Set<string>();
    const result: CardData[] = [];
    const allSources = [...masterWords, ...Object.values(lessonsMap).flat()];
    for (const w of allSources) {
      if ((weakWords[w.fr] || 0) > 0 && !seen.has(w.fr)) {
        seen.add(w.fr);
        result.push(w);
      }
    }
    return result.sort((a, b) => (weakWords[b.fr] || 0) - (weakWords[a.fr] || 0));
  })();

  const recordWeakWord = useCallback((wordFr: string) => {
    if (!wordFr) return;
    setWeakWords((prev) => {
      const next = { ...prev, [wordFr]: (prev[wordFr] || 0) + 1 };
      try {
        localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const removeWeakWord = useCallback((wordFr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWeakWords((prev) => {
      if (!prev[wordFr]) return prev;
      const next = { ...prev };
      delete next[wordFr];
      try {
        localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const clearAllWeakWords = useCallback(() => {
    setWeakWords({});
    try {
      localStorage.removeItem(WEAK_WORDS_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const markWordAsFavorite = useCallback((wordFr: string) => {
    if (!wordFr) return;
    setFavorites((prev) => {
      if (prev[wordFr]) return prev;
      const next = { ...prev, [wordFr]: true };
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setRepeatActive(false);
  }, []);

  const toggleFavorite = (wordFr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[wordFr]) {
        delete next[wordFr];
      } else {
        next[wordFr] = true;
      }
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const getActiveDeckSource = useCallback(() => {
    if (studyFilter === 'favorites') return favoriteWordsList;
    if (studyFilter === 'weak') return weakWordsList;
    return masterWords;
  }, [studyFilter, favoriteWordsList, weakWordsList, masterWords]);

  const switchStudyMode = useCallback(
    (mode: 'all' | 'favorites' | 'weak', sourceWords = masterWords, favMap = favorites) => {
      stopTimer();
      stopSpeech();
      setStudyFilter(mode);
      if (mode === 'favorites' || mode === 'weak') {
        setStage2Unlocked(true);
        setStage3Unlocked(true);
      } else {
        setStage('flashcards');
        setStage2Unlocked(selectedLessonScope === 'review_old');
        setStage3Unlocked(selectedLessonScope === 'review_old');
      }
      setStageLockMessage(null);
      setFlipWarning(null);
      const targetDeck =
        mode === 'favorites'
          ? favoriteWordsList.length > 0
            ? favoriteWordsList
            : sourceWords.filter((w) => favMap[w.fr])
          : mode === 'weak'
          ? weakWordsList
          : sourceWords;
      setQueue(targetDeck);
      setWrongList([]);
      setSkippedList([]);
      setCurrent(0);
      setRound(1);
      setIsRetryRound(false);
      setCorrectCount(0);
      setWrongCount(0);
      setSkipCount(0);
      setCurrentStreak(0);
      setStageOutcomes({ flashcards: {}, quiz: {}, writing: {} });
      setCardAnswers({});
      setIsFinished(false);
      setIsFlipped(false);
      setAnswered(false);
      setWritingInput('');
      setWritingStatus('idle');
    },
    [masterWords, favorites, favoriteWordsList, weakWordsList, selectedLessonScope, stopTimer, stopSpeech]
  );

  // Auto-recover to 'all' if user removes the last word from Favorites while studying in Favorites mode
  useEffect(() => {
    if (studyFilter === 'favorites' && favoriteWordsList.length === 0 && masterWords.length > 0) {
      switchStudyMode('all');
    }
  }, [studyFilter, favoriteWordsList.length, masterWords.length, switchStudyMode]);

  const switchStage = useCallback(
    (targetStage: StudyStage, customDeck?: CardData[], forceUnlock = false) => {
      if (targetStage === 'quiz' && !stage2Unlocked && !forceUnlock) {
        setStageLockMessage(
          '🔒 الخطوة 2 (فلاش كارت الجمل) مغلقة! أنهِ الخطوة 1 (فلاش كارت الكلمات) أولاً أو استخدم زر تخطي.'
        );
        return;
      }
      if (targetStage === 'writing' && !stage3Unlocked && !forceUnlock) {
        setStageLockMessage(
          !stage2Unlocked
            ? '🔒 الخطوة 3 (الكتابة والإملاء) مغلقة! أنهِ الخطوة 1 ثم الخطوة 2 أولاً.'
            : '🔒 الخطوة 3 (الكتابة والإملاء) مغلقة! أنهِ الخطوة 2 (فلاش كارت الجمل) أولاً.'
        );
        return;
      }
      stopTimer();
      stopSpeech();
      setStageLockMessage(null);
      setFlipWarning(null);
      if (forceUnlock && targetStage === 'quiz') {
        setStage2Unlocked(true);
      }
      if (forceUnlock && targetStage === 'writing') {
        setStage2Unlocked(true);
        setStage3Unlocked(true);
      }
      setStage(targetStage);
      const deckToUse = customDeck || getActiveDeckSource();
      setQueue(deckToUse);
      setWrongList([]);
      setSkippedList([]);
      setCurrent(0);
      setRound(1);
      setIsRetryRound(false);
      setCorrectCount(0);
      setWrongCount(0);
      setSkipCount(0);
      setCurrentStreak(0);
      setCardAnswers({});
      setIsFinished(false);
      setIsFlipped(false);
      setAnswered(false);
      setWritingInput('');
      setWritingStatus('idle');
    },
    [stage2Unlocked, stage3Unlocked, getActiveDeckSource, stopTimer, stopSpeech]
  );

  // Persist Spaced Repetition Config whenever system, day, completedDays, lessonTitles, or autoSpeak5Sec changes
  useEffect(() => {
    try {
      localStorage.setItem(
        SPACED_CONFIG_KEY,
        JSON.stringify({
          spacedSystem,
          selectedDay,
          completedDays,
          completedDayLessons,
          completedDaysDates,
          lessonTitles,
          autoSpeak5Sec,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [
    spacedSystem,
    selectedDay,
    completedDays,
    completedDayLessons,
    completedDaysDates,
    lessonTitles,
    autoSpeak5Sec,
  ]);

  const markDayOrLessonCompleted = useCallback(
    (
      dayNum: number = selectedDay,
      scope: LessonScopeType = selectedLessonScope,
      sys: SpacedSystemType = spacedSystem,
      forceFullDay = false
    ) => {
      const todayStr = getLocalDateKey();
      const dueLessons = getLessonsForDay(dayNum, sys);

      setCompletedDayLessons((prevLessons) => {
        const nextLessons = { ...prevLessons };
        if (scope === 'day_all' || forceFullDay) {
          for (const l of dueLessons) {
            nextLessons[`${dayNum}_${l}`] = true;
          }
        } else if (scope === 'new_lesson') {
          nextLessons[`${dayNum}_${dayNum}`] = true;
        } else if (scope === 'review_old') {
          for (const l of dueLessons.filter((x) => x !== dayNum)) {
            nextLessons[`${dayNum}_${l}`] = true;
          }
        } else if (typeof scope === 'number') {
          nextLessons[`${dayNum}_${scope}`] = true;
        }

        const allDueDone =
          scope === 'day_all' ||
          forceFullDay ||
          dueLessons.every(
            (l) => nextLessons[`${dayNum}_${l}`] || (lessonsMap[l]?.length || 0) === 0
          );

        if (allDueDone) {
          setCompletedDays((prevDays) => ({ ...prevDays, [dayNum]: true }));
          setCompletedDaysDates((prevDates) => ({ ...prevDates, [dayNum]: todayStr }));
        }

        const learnedFromScope =
          scope === 'day_all' || forceFullDay
            ? dueLessons.flatMap((l) => (lessonsMap[l] || []).map((w) => w.fr))
            : scope === 'new_lesson'
            ? (lessonsMap[dayNum] || []).map((w) => w.fr)
            : scope === 'review_old'
            ? dueLessons
                .filter((x) => x !== dayNum)
                .flatMap((l) => (lessonsMap[l] || []).map((w) => w.fr))
            : typeof scope === 'number'
            ? (lessonsMap[scope] || []).map((w) => w.fr)
            : [];
        if (learnedFromScope.length > 0) {
          recordLearnedWordsOnDate(learnedFromScope, todayStr);
        }

        return nextLessons;
      });
    },
    [selectedDay, selectedLessonScope, spacedSystem, lessonsMap, recordLearnedWordsOnDate]
  );

  // Auto-Save active study session progress so closing/refreshing resumes from exact spot
  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_PROGRESS_KEY,
        JSON.stringify({
          selectedDay,
          spacedSystem,
          selectedLessonScope,
          stage,
          stage2Unlocked,
          stage3Unlocked,
          studyFilter,
          queue,
          current,
          wrongList,
          skippedList,
          correctCount,
          wrongCount,
          skipCount,
          stageOutcomes,
          round,
          isRetryRound,
          cardAnswers,
          isFinished,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [
    selectedDay,
    spacedSystem,
    selectedLessonScope,
    stage,
    stage2Unlocked,
    stage3Unlocked,
    studyFilter,
    queue,
    current,
    wrongList,
    skippedList,
    correctCount,
    wrongCount,
    skipCount,
    stageOutcomes,
    round,
    isRetryRound,
    cardAnswers,
    isFinished,
  ]);

  const applySpacedSelection = useCallback(
    (
      nextDay: number,
      nextSystem: SpacedSystemType,
      nextScope: LessonScopeType,
      customMap?: Record<number, CardData[]>
    ) => {
      const activeMap = customMap || lessonsMap;
      stopTimer();
      stopSpeech();
      setSelectedDay(nextDay);
      setSpacedSystem(nextSystem);
      setSelectedLessonScope(nextScope);
      setTargetEditLesson(typeof nextScope === 'number' ? nextScope : nextDay);

      // Immediately persist selectedDay and spacedSystem to localStorage so instant refresh/close never loses the active day
      try {
        const existingConfig = JSON.parse(localStorage.getItem(SPACED_CONFIG_KEY) || '{}');
        localStorage.setItem(
          SPACED_CONFIG_KEY,
          JSON.stringify({
            ...existingConfig,
            selectedDay: nextDay,
            spacedSystem: nextSystem,
          })
        );
      } catch {
        // Ignore storage errors
      }

      const nextWords = computeWordsForSelection(activeMap, nextDay, nextSystem, nextScope);
      setMasterWords(nextWords);
      setStudyFilter('all');
      setStage('flashcards');
      // In 'review_old' (Step 2: Quick Review of old lessons), unlock all stages so 1 round completes review!
      const isQuickReview = nextScope === 'review_old';
      setStage2Unlocked(isQuickReview);
      setStage3Unlocked(isQuickReview);
      setStageLockMessage(null);
      setFlipWarning(null);
      setQueue(nextWords);
      setWrongList([]);
      setSkippedList([]);
      setCurrent(0);
      setRound(1);
      setIsRetryRound(false);
      setCorrectCount(0);
      setWrongCount(0);
      setSkipCount(0);
      setCurrentStreak(0);
      setStageOutcomes({ flashcards: {}, quiz: {}, writing: {} });
      setCardAnswers({});
      setIsFinished(false);
      setIsFlipped(false);
      setAnswered(false);
      setWritingInput('');
      setWritingStatus('idle');
    },
    [lessonsMap, stopTimer, stopSpeech, computeWordsForSelection]
  );

  const toggleDayCompleted = (dayNum: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const todayStr = getLocalDateKey();
    const dueLessons = getLessonsForDay(dayNum, spacedSystem);
    setCompletedDays((prev) => {
      const nextVal = !prev[dayNum];
      setCompletedDayLessons((prevL) => {
        const nextL = { ...prevL };
        for (const l of dueLessons) {
          if (nextVal) {
            nextL[`${dayNum}_${l}`] = true;
          } else {
            delete nextL[`${dayNum}_${l}`];
          }
        }
        return nextL;
      });
      setCompletedDaysDates((prevD) => {
        const nextD = { ...prevD };
        if (nextVal) {
          nextD[dayNum] = todayStr;
        } else {
          delete nextD[dayNum];
        }
        return nextD;
      });
      if (nextVal) {
        const dayWords = dueLessons.flatMap((l) => (lessonsMap[l] || []).map((w) => w.fr));
        if (dayWords.length > 0) {
          recordLearnedWordsOnDate(dayWords, todayStr);
        }
      }
      return {
        ...prev,
        [dayNum]: nextVal,
      };
    });
  };

  // Save words for a specific lesson (targetEditLesson) to lessonsMap and localStorage
  const saveMasterWords = useCallback(
    (newWords: CardData[], lessonToUpdate = targetEditLesson) => {
      const updatedMap: Record<number, CardData[]> = {
        ...lessonsMap,
        [lessonToUpdate]: newWords,
      };
      setLessonsMap(updatedMap);

      try {
        localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(updatedMap));
        if (lessonToUpdate === 0) {
          if (newWords.length === 0) {
            localStorage.setItem(WORDS_CLEARED_KEY, 'true');
            localStorage.removeItem(CUSTOM_WORDS_KEY);
          } else {
            localStorage.removeItem(WORDS_CLEARED_KEY);
            localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(newWords));
          }
        }
      } catch {
        // Ignore storage quota errors
      }

      const nextScope: LessonScopeType =
        lessonToUpdate === selectedDay ? 'new_lesson' : lessonToUpdate;

      applySpacedSelection(selectedDay, spacedSystem, nextScope, updatedMap);
    },
    [targetEditLesson, lessonsMap, selectedDay, spacedSystem, applySpacedSelection]
  );

  // Initialize hints
  useEffect(() => {
    try {
      const savedHints = JSON.parse(localStorage.getItem(HINTS_KEY) || '{}');
      setHints(savedHints);
    } catch {
      setHints({});
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem(DARK_MODE_KEY, String(darkMode));
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_MODE_KEY, String(focusMode));
    } catch {
      // Ignore storage errors
    }
  }, [focusMode]);



  // Pre-warm SpeechSynthesis voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      };
    }
  }, []);

  const speakText = useCallback((text: string, lang: string, rate = 0.9, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split('-')[0].toLowerCase();
      const matchingVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
      const naturalVoice =
        matchingVoices.find((v) =>
          /google|thomas|amelie|audrey|aurelie|hortense|paul|julie|celine|mathieu|virginie/i.test(
            v.name
          )
        ) ||
        matchingVoices.find((v) => v.lang.toLowerCase() === lang.toLowerCase() && v.localService) ||
        matchingVoices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
        matchingVoices[0] ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (naturalVoice) {
        u.voice = naturalVoice;
      }
      window.speechSynthesis.speak(u);
    } catch {
      // Ignore mobile speech errors
    }
  }, []);

  const speakWord = useCallback(
    (card: CardData, rate = 0.9, e?: React.MouseEvent) => {
      if (!card) return;
      speakText(card.fr, getWordLang(card), rate, e);
    },
    [speakText]
  );

  const advanceCard = useCallback(
    (
      updatedWrongList?: CardData[],
      updatedCorrectCount?: number,
      updatedSkippedList?: CardData[]
    ) => {
      clearAutoAdvance();
      stopTimer();
      stopSpeech();
      setFlipWarning(null);
      setIsShaking(false);
      setAnswerEffect(null);
      setNavDirection(1);
      if (current < queue.length - 1) {
        setCurrent((prev) => prev + 1);
        setIsFlipped(false);
        setAnswered(cardAnswers[current + 1] !== undefined);
        setWritingInput('');
        setWritingStatus('idle');
      } else if (queue.length > 0) {
        const finalWrongCount =
          updatedWrongList !== undefined ? updatedWrongList.length : wrongList.length;
        const finalSkippedCount =
          updatedSkippedList !== undefined ? updatedSkippedList.length : skippedList.length;
        const finalCorrectCount =
          updatedCorrectCount !== undefined ? updatedCorrectCount : correctCount;

        // Unlock next step when finishing a round (even if user skipped cards!)
        if (stage === 'flashcards') {
          setStage2Unlocked(true);
        } else if (stage === 'quiz') {
          setStage3Unlocked(true);
        }

        if (
          finalWrongCount === 0 &&
          finalSkippedCount === 0 &&
          finalCorrectCount === queue.length
        ) {
          if (selectedLessonScope === 'review_old') {
            markDayOrLessonCompleted(selectedDay, 'review_old', spacedSystem);
          } else if (stage === 'writing') {
            markDayOrLessonCompleted(selectedDay, selectedLessonScope, spacedSystem);
          }
        }
        setIsFinished(true);
      }
    },
    [
      current,
      queue.length,
      cardAnswers,
      stopTimer,
      stopSpeech,
      wrongList.length,
      skippedList.length,
      correctCount,
      stage,
      selectedDay,
      selectedLessonScope,
      spacedSystem,
      markDayOrLessonCompleted,
    ]
  );

  const nextCard = useCallback(() => {
    if ((stage === 'flashcards' || stage === 'quiz') && cardAnswers[current] === undefined) {
      if (!isFlipped) {
        setIsFlipped(true);
        stopTimer();
      }
      setFlipWarning(
        'اقلب الكارت وحدد (✓ عرفتها) أو (✗ غلطت) أو اضغط (⏭️ تخطي Skip) للانتقال للكارت التالي'
      );
      triggerWrongShake();
      return;
    }
    if (stage === 'writing' && cardAnswers[current] === undefined) {
      triggerWrongShake();
      writingInputRef.current?.focus();
      return;
    }
    advanceCard();
  }, [stage, cardAnswers, current, isFlipped, stopTimer, advanceCard, triggerWrongShake]);

  const prevCard = useCallback(() => {
    if (current > 0) {
      clearAutoAdvance();
      stopTimer();
      stopSpeech();
      setFlipWarning(null);
      setIsShaking(false);
      setAnswerEffect(null);
      setNavDirection(-1);
      setCurrent((prev) => prev - 1);
      setIsFlipped(false);
      setAnswered(cardAnswers[current - 1] !== undefined);
      setWritingInput('');
      setWritingStatus('idle');
    }
  }, [current, cardAnswers, stopTimer, stopSpeech]);

  const jumpToCard = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= queue.length || targetIdx === current) return;
      clearAutoAdvance();
      stopTimer();
      stopSpeech();
      setFlipWarning(null);
      setIsShaking(false);
      setAnswerEffect(null);
      setNavDirection(targetIdx > current ? 1 : -1);
      setCurrent(targetIdx);
      setIsFlipped(false);
      setAnswered(cardAnswers[targetIdx] !== undefined);
      setWritingInput('');
      setWritingStatus('idle');
      setShowRoundDrawer(false);
    },
    [queue.length, current, cardAnswers, stopTimer, stopSpeech]
  );

  const handleAnswer = useCallback(
    (isCorrect: boolean, fromTimeout = false) => {
      const currentCard = queue[current];
      if (!currentCard) return;

      const prev = cardAnswers[current];
      const nextOutcome: CardOutcome = isCorrect ? 'correct' : 'wrong';

      // Prevent duplicate clicks on the same answer button from re-counting, re-playing sounds, or causing glitchy jumps
      if (prev === nextOutcome) {
        return;
      }

      clearAutoAdvance();
      stopTimer();
      setFlipWarning(null);

      const nextStreak = isCorrect
        ? prev === undefined
          ? currentStreak + 1
          : Math.max(1, currentStreak)
        : 0;

      triggerAnswerFeedback(
        isCorrect ? 'correct' : 'wrong',
        isCorrect ? Math.max(0, nextStreak - 1) : currentStreak
      );

      let newCorrect = correctCount;
      let newWrong = wrongCount;
      let newSkip = skipCount;
      let newWrongList = [...wrongList];
      let newSkippedList = [...skippedList];

      if (prev !== undefined) {
        if (prev === 'correct') {
          newCorrect = Math.max(0, newCorrect - 1);
        } else if (prev === 'wrong') {
          newWrong = Math.max(0, newWrong - 1);
          newWrongList = newWrongList.filter((w) => w.fr !== currentCard.fr);
        } else if (prev === 'skipped') {
          newSkip = Math.max(0, newSkip - 1);
          newSkippedList = newSkippedList.filter((w) => w.fr !== currentCard.fr);
        }
      }

      if (isCorrect) {
        newCorrect++;
      } else {
        newWrong++;
        if (!newWrongList.some((w) => w.fr === currentCard.fr)) {
          newWrongList.push(currentCard);
        }
      }

      if (!isCorrect) {
        markWordAsFavorite(currentCard.fr);
        recordWeakWord(currentCard.fr);
        setCurrentStreak(0);
      } else {
        recordLearnedWordsOnDate([currentCard.fr]);
        setCurrentStreak(nextStreak);
      }

      setCorrectCount(newCorrect);
      setWrongCount(newWrong);
      setSkipCount(newSkip);
      setWrongList(newWrongList);
      setSkippedList(newSkippedList);
      setCardAnswers((prevAns) => ({
        ...prevAns,
        [current]: nextOutcome,
      }));
      setStageOutcomes((prevMap) => ({
        ...prevMap,
        [stage]: {
          ...(prevMap[stage] || {}),
          [currentCard.fr]: nextOutcome,
        },
      }));
      setAnswered(true);

      if (fromTimeout && (stage === 'flashcards' || stage === 'quiz')) {
        setIsFlipped(true);
      }

      if (!fromTimeout && (stage === 'flashcards' || stage === 'quiz')) {
        autoAdvanceTimeoutRef.current = setTimeout(() => {
          advanceCard(newWrongList, newCorrect, newSkippedList);
        }, 750);
      }
    },
    [
      clearAutoAdvance,
      stopTimer,
      queue,
      current,
      cardAnswers,
      correctCount,
      wrongCount,
      skipCount,
      wrongList,
      skippedList,
      advanceCard,
      stage,
      markWordAsFavorite,
      recordWeakWord,
      recordLearnedWordsOnDate,
      triggerAnswerFeedback,
      currentStreak,
    ]
  );

  const handleSkipCard = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      clearAutoAdvance();
      stopTimer();
      stopSpeech();
      setFlipWarning(null);
      setIsShaking(false);
      setAnswerEffect(null);
      const currentCard = queue[current];
      if (!currentCard) return;

      const prev = cardAnswers[current];
      let newCorrect = correctCount;
      let newWrong = wrongCount;
      let newSkip = skipCount;
      let newWrongList = [...wrongList];
      let newSkippedList = [...skippedList];

      if (prev !== undefined) {
        if (prev === 'correct') {
          newCorrect = Math.max(0, newCorrect - 1);
        } else if (prev === 'wrong') {
          newWrong = Math.max(0, newWrong - 1);
          newWrongList = newWrongList.filter((w) => w.fr !== currentCard.fr);
        } else if (prev === 'skipped') {
          newSkip = Math.max(0, newSkip - 1);
          newSkippedList = newSkippedList.filter((w) => w.fr !== currentCard.fr);
        }
      }

      newSkip++;
      if (!newSkippedList.some((w) => w.fr === currentCard.fr)) {
        newSkippedList.push(currentCard);
      }

      setCorrectCount(newCorrect);
      setWrongCount(newWrong);
      setSkipCount(newSkip);
      setWrongList(newWrongList);
      setSkippedList(newSkippedList);
      setCardAnswers((prevAns) => ({
        ...prevAns,
        [current]: 'skipped',
      }));
      setStageOutcomes((prevMap) => ({
        ...prevMap,
        [stage]: {
          ...(prevMap[stage] || {}),
          [currentCard.fr]: 'skipped',
        },
      }));
      setAnswered(true);
      setCurrentStreak(0);
      setWritingInput('');
      setWritingStatus('idle');

      advanceCard(newWrongList, newCorrect, newSkippedList);
    },
    [
      stopTimer,
      stopSpeech,
      queue,
      current,
      cardAnswers,
      correctCount,
      wrongCount,
      skipCount,
      wrongList,
      skippedList,
      stage,
      advanceCard,
    ]
  );

  const skippedCount = skipCount;
  const handleSkip = handleSkipCard;

  const handleSkipRemainingStage = useCallback(() => {
    stopTimer();
    stopSpeech();
    setFlipWarning(null);
    setIsShaking(false);
    if (queue.length === 0) return;

    let newSkip = skipCount;
    const newSkippedList = [...skippedList];
    const updatedCardAnswers = { ...cardAnswers };
    const updatedStageMap = { ...(stageOutcomes[stage] || {}) };

    for (let idx = current; idx < queue.length; idx++) {
      const card = queue[idx];
      if (!card) continue;
      if (updatedCardAnswers[idx] === undefined) {
        updatedCardAnswers[idx] = 'skipped';
        updatedStageMap[card.fr] = 'skipped';
        newSkip++;
        if (!newSkippedList.some((w) => w.fr === card.fr)) {
          newSkippedList.push(card);
        }
      }
    }

    setSkipCount(newSkip);
    setSkippedList(newSkippedList);
    setCardAnswers(updatedCardAnswers);
    setStageOutcomes((prevMap) => ({
      ...prevMap,
      [stage]: updatedStageMap,
    }));

    if (stage === 'flashcards') {
      setStage2Unlocked(true);
    } else if (stage === 'quiz') {
      setStage3Unlocked(true);
    }
    setIsFinished(true);
  }, [
    stopTimer,
    stopSpeech,
    queue,
    current,
    skipCount,
    skippedList,
    cardAnswers,
    stageOutcomes,
    stage,
  ]);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimerSec(TIMER_MAX);
    timerRef.current = setInterval(() => {
      setTimerSec((prev) => {
        if (prev <= 1) {
          stopTimer();
          if (!answered) {
            handleAnswer(false, true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [answered, stopTimer, handleAnswer]);

  useEffect(() => {
    if (
      (stage === 'flashcards' || stage === 'quiz') &&
      !isFinished &&
      !answered &&
      queue.length > 0 &&
      !showManager &&
      !focusMode
    ) {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [stage, current, isFinished, answered, queue.length, showManager, focusMode, startTimer, stopTimer]);

  // 5-Second Reading Countdown before Automatic Pronunciation in Stage 1 (Word Flashcards) & Stage 2 (Sentence Flashcards)
  useEffect(() => {
    if (
      !autoSpeak5Sec ||
      isFinished ||
      isFlipped ||
      answered ||
      showManager ||
      showSpacedModal ||
      showQuickCardEdit ||
      !queue[current] ||
      (stage !== 'flashcards' && stage !== 'quiz')
    ) {
      setReadingCountdown(null);
      return;
    }

    setReadingCountdown(5);
    const intervalId = setInterval(() => {
      setReadingCountdown((prev) => {
        if (prev === null || prev <= 0) return 0;
        if (prev === 1) {
          if ('speechSynthesis' in window && queue[current]) {
            if (stage === 'quiz') {
              const ex = getCardExample(queue[current]);
              speakText(ex.exFr || queue[current].fr, getWordLang(queue[current]), 0.9);
            } else {
              speakWord(queue[current], 0.9);
            }
          }
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    autoSpeak5Sec,
    stage,
    current,
    round,
    isFinished,
    isFlipped,
    answered,
    showManager,
    showSpacedModal,
    showQuickCardEdit,
    queue,
    speakWord,
    speakText,
  ]);

  // Close inline note input, reset per-card sentence reveal, and auto-scroll active progress dot into center view
  useEffect(() => {
    setShowNoteInput(false);
    setRevealedCardWord(false);
    setConfirmResetRound(false);
    const activeDot = document.getElementById(`progress-dot-${current}`);
    if (activeDot) {
      activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [current, stage]);

  // Focus writing input when entering a new card in Stage 3 (Writing)
  useEffect(() => {
    if (stage === 'writing' && !isFinished && writingStatus === 'idle') {
      if (dictationAudioOnly && queue[current] && !showManager) {
        speakWord(queue[current], 0.9);
      }
      setTimeout(() => {
        writingInputRef.current?.focus();
      }, 60);
    }
  }, [stage, current, isFinished, writingStatus, dictationAudioOnly, queue, showManager, speakWord]);

  const handleHintChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const currentWord = queue[current]?.fr;
    if (currentWord) {
      const newHints = { ...hints, [currentWord]: val };
      setHints(newHints);
      try {
        localStorage.setItem(HINTS_KEY, JSON.stringify(newHints));
      } catch {
        // Ignore
      }
    }
  };

  const speak = (rate: number, e?: React.MouseEvent) => {
    if (!queue[current]) return;
    setReadingCountdown(0);
    speakWord(queue[current], rate, e);
  };

  const speakSentence = (rate: number, e?: React.MouseEvent) => {
    if (!queue[current]) return;
    setReadingCountdown(0);
    const ex = getCardExample(queue[current]);
    speakText(ex.exFr || queue[current].fr, getWordLang(queue[current]), rate, e);
  };

  const doRepeat = useCallback(() => {
    if (!('speechSynthesis' in window) || !queue[current]) return;
    window.speechSynthesis.cancel();
    const card = queue[current];
    const textToRepeat =
      stage === 'quiz' ? getCardExample(card).exFr || card.fr : card.fr;
    const u = new SpeechSynthesisUtterance(
      Array(10)
        .fill(textToRepeat)
        .join(stage === 'quiz' ? ' . ' : ' , ')
    );
    u.lang = getWordLang(card);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, [queue, current, stage]);

  const toggleRepeat = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadingCountdown(0);
    if (repeatActive) {
      stopSpeech();
    } else {
      setRepeatActive(true);
      doRepeat();
    }
  };

  const flipCard = useCallback(() => {
    if (isFinished || queue.length === 0) return;
    setFlipWarning(null);
    setIsFlipped((prev) => {
      if (!prev && !answered) {
        stopTimer();
      }
      return !prev;
    });
  }, [isFinished, queue.length, answered, stopTimer]);

  // Keyboard shortcuts for smooth study & Focus Mode (Esc to exit, Space to flip, 1/2/3 to answer, ArrowLeft/Right to navigate, R to speak)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showManager || showSpacedModal || showQuickCardEdit) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') {
          if (showNoteInput) {
            setShowNoteInput(false);
          } else if (focusMode) {
            setFocusMode(false);
          }
        }
        return;
      }
      if (e.key === 'Escape') {
        if (showNoteInput) {
          e.preventDefault();
          setShowNoteInput(false);
          return;
        }
        if (focusMode) {
          e.preventDefault();
          setFocusMode(false);
          return;
        }
      }
      if (!isFinished && queue.length > 0) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          prevCard();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextCard();
          return;
        }
        if (e.key.toLowerCase() === 'r' || e.key === 'ر') {
          e.preventDefault();
          if (stage === 'quiz') {
            speakSentence(0.9);
          } else {
            speak(0.9);
          }
          return;
        }
        if (e.key.toLowerCase() === 'f' || e.key === 'ب') {
          e.preventDefault();
          setFocusMode((prev) => !prev);
          return;
        }
      }
      if (
        (stage === 'flashcards' || stage === 'quiz') &&
        !isFinished &&
        queue.length > 0
      ) {
        if (e.code === 'Space') {
          e.preventDefault();
          flipCard();
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          handleSkipCard();
          return;
        }
        if ((isFlipped || answered) && e.key === '1') {
          e.preventDefault();
          handleAnswer(true);
          return;
        }
        if ((isFlipped || answered) && e.key === '3') {
          e.preventDefault();
          handleAnswer(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusMode,
    showNoteInput,
    stage,
    isFinished,
    queue.length,
    showManager,
    showSpacedModal,
    showQuickCardEdit,
    flipCard,
    isFlipped,
    answered,
    handleAnswer,
    handleSkipCard,
    prevCard,
    nextCard,
  ]);

  // Stage 3 (Writing) handlers
  const handleWritingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentCard = queue[current];
    if (!currentCard) return;

    // If already answered, pressing Enter / clicking moves to next card
    if (writingStatus !== 'idle') {
      nextCard();
      return;
    }

    if (!writingInput.trim()) return;

    const isMatch = isWrittenAnswerMatch(writingInput, currentCard.fr);
    setWritingStatus(isMatch ? 'correct' : 'wrong');

    const prev = cardAnswers[current];
    let newCorrect = correctCount;
    let newWrongList = [...wrongList];
    if (prev === undefined) {
      if (isMatch) {
        newCorrect++;
      } else {
        newWrongList.push(currentCard);
      }
    }

    handleAnswer(isMatch, true);
    setTimeout(() => {
      speakWord(currentCard, 0.9);
    }, 240);

    if (isMatch) {
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        advanceCard(newWrongList, newCorrect);
      }, 900);
    }
  };

  const handleRevealWritingAnswer = () => {
    const currentCard = queue[current];
    if (!currentCard || writingStatus !== 'idle') return;
    setWritingStatus('wrong');
    setWritingInput(currentCard.fr);
    handleAnswer(false, true);
    setTimeout(() => {
      speakWord(currentCard, 0.9);
    }, 240);
  };

  const handleWritingLetterHint = () => {
    const currentCard = queue[current];
    if (!currentCard || writingStatus !== 'idle') return;
    const target = currentCard.fr.split('/')[0].trim();
    const nextLen = Math.min(target.length, writingInput.length + 2);
    setWritingInput(target.slice(0, nextLen));
    writingInputRef.current?.focus();
  };

  const insertSpecialChar = (ch: string) => {
    if (writingStatus !== 'idle') return;
    setWritingInput((prev) => prev + ch);
    writingInputRef.current?.focus();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a')) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
    const dx = Math.abs(touchStartX.current - touchEndX.current);
    const dy = Math.abs(touchStartY.current - touchEndY.current);
    if (dx > 14 && dx > dy * 1.5) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current === null ||
      touchEndX.current === null ||
      touchStartY.current === null ||
      touchEndY.current === null
    ) {
      return;
    }
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = Math.abs(touchStartY.current - touchEndY.current);

    // Only trigger swipe navigation if gesture is predominantly horizontal
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > deltaY * 1.6) {
      if (deltaX > 60) {
        nextCard();
      } else if (deltaX < -60) {
        prevCard();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;

    setTimeout(() => {
      isSwiping.current = false;
    }, 60);
  };

  const resetAll = (force?: unknown) => {
    const answeredCount = Object.keys(cardAnswers).length;
    if (force !== true && !isFinished && answeredCount >= 2 && !confirmResetRound) {
      setConfirmResetRound(true);
      setTimeout(() => setConfirmResetRound(false), 3500);
      return;
    }
    setConfirmResetRound(false);
    stopTimer();
    stopSpeech();
    setFlipWarning(null);
    setStageLockMessage(null);
    setQueue(getActiveDeckSource());
    setWrongList([]);
    setSkippedList([]);
    setCurrent(0);
    setRound(1);
    setIsRetryRound(false);
    setCorrectCount(0);
    setWrongCount(0);
    setSkipCount(0);
    setCurrentStreak(0);
    setCardAnswers({});
    setIsFinished(false);
    setIsFlipped(false);
    setAnswered(false);
    setWritingInput('');
    setWritingStatus('idle');
  };

  const shuffle = () => {
    setConfirmResetRound(false);
    stopTimer();
    stopSpeech();
    setFlipWarning(null);
    setStageLockMessage(null);
    setQueue([...getActiveDeckSource()].sort(() => Math.random() - 0.5));
    setWrongList([]);
    setSkippedList([]);
    setCurrent(0);
    setRound(1);
    setIsRetryRound(false);
    setCorrectCount(0);
    setWrongCount(0);
    setSkipCount(0);
    setCurrentStreak(0);
    setCardAnswers({});
    setIsFinished(false);
    setIsFlipped(false);
    setAnswered(false);
    setWritingInput('');
    setWritingStatus('idle');
  };

  const restartRetry = () => {
    const seen = new Set<string>();
    const retryDeck: CardData[] = [];
    for (const item of [...wrongList, ...skippedList]) {
      if (item && !seen.has(item.fr)) {
        seen.add(item.fr);
        retryDeck.push(item);
      }
    }
    if (retryDeck.length === 0) {
      resetAll(true);
      return;
    }
    stopTimer();
    stopSpeech();
    setFlipWarning(null);
    setStageLockMessage(null);
    setQueue(retryDeck);
    setWrongList([]);
    setSkippedList([]);
    setCurrent(0);
    setRound(round + 1);
    setIsRetryRound(true);
    setCorrectCount(0);
    setWrongCount(0);
    setSkipCount(0);
    setCurrentStreak(0);
    setCardAnswers({});
    setIsFinished(false);
    setIsFlipped(false);
    setAnswered(false);
    setWritingInput('');
    setWritingStatus('idle');
  };

  // Handle image upload for AI analysis
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64Data = result.split(',')[1];
      if (base64Data) {
        setAiImage({
          data: base64Data,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Call backend Gemini endpoint to analyze words
  const handleAnalyzeWithAI = async () => {
    if (!aiInputText.trim() && !aiImage) {
      setAiError('يرجى كتابة الكلمات أو النص أو رفع صورة أولاً.');
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);
    setStatusBanner(null);

    try {
      const response = await fetch('/api/analyze-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiInputText,
          image: aiImage ? { data: aiImage.data, mimeType: aiImage.mimeType } : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر تحليل الكلمات حالياً.');
      }

      const cards: CardData[] = Array.isArray(data.cards) ? data.cards : [];
      if (cards.length === 0) {
        setAiError('لم يتم العثور على كلمات واضحة. حاول كتابة الكلمات أو الموضوع بشكل أوضح.');
      } else {
        setAnalyzedPreview(cards);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalyzedWords = (mode: 'append' | 'replace') => {
    if (analyzedPreview.length === 0) return;

    const currentLessonWords = lessonsMap[targetEditLesson] || [];
    let nextDeck: CardData[];
    if (mode === 'replace') {
      nextDeck = [...analyzedPreview];
    } else {
      nextDeck = [...currentLessonWords, ...analyzedPreview];
    }

    saveMasterWords(nextDeck, targetEditLesson);
    setAnalyzedPreview([]);
    setAiInputText('');
    setAiImage(null);
    setStatusBanner(
      mode === 'replace'
        ? `تم حفظ ${nextDeck.length} كلمة جديدة في (درس ${targetEditLesson}) بنجاح!`
        : `تمت إضافة الكلمات إلى (درس ${targetEditLesson}) بنجاح! إجمالي كلمات الدرس الآن ${nextDeck.length} كلمة.`
    );
    setTimeout(() => {
      setShowManager(false);
      setStatusBanner(null);
    }, 1100);
  };

  const removePreviewItem = (idx: number) => {
    setAnalyzedPreview((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteAllWords = () => {
    saveMasterWords([], targetEditLesson);
    setConfirmClearAll(false);
    setStatusBanner(
      `تم مسح جميع كلمات (درس ${targetEditLesson}) بنجاح. يمكنك الآن إضافة كلمات جديدة له بالذكاء الاصطناعي!`
    );
  };

  const handleRestoreDefaults = () => {
    saveMasterWords(allData, targetEditLesson);
    setConfirmRestoreDefaults(false);
    setStatusBanner(`تمت استعادة الكلمات الافتراضية (${allData.length} كلمة) في (درس ${targetEditLesson}).`);
  };

  const handleDeleteSingleWord = (frToDelete: string) => {
    const currentLessonWords = lessonsMap[targetEditLesson] || [];
    const updated = currentLessonWords.filter((w) => w.fr !== frToDelete);
    saveMasterWords(updated, targetEditLesson);
  };

  const startEditWord = (word: CardData) => {
    const ex = getCardExample(word);
    setEditingWordFr(word.fr);
    setEditWordFrVal(word.fr);
    setEditWordArVal(word.ar);
    setEditWordGenderVal(word.g || 'n');
    setEditWordHintVal(hints[word.fr] || '');
    setEditWordExFrVal(word.exFr || ex.exFr || '');
    setEditWordExArVal(word.exAr || ex.exAr || '');
  };

  const saveEditedWord = (originalFr: string) => {
    const cleanFr = editWordFrVal.trim();
    const cleanAr = editWordArVal.trim();
    const cleanHint = editWordHintVal.trim();
    const cleanExFr = editWordExFrVal.trim();
    const cleanExAr = editWordExArVal.trim();
    if (!cleanFr || !cleanAr) return;

    const updateCardObj = (item: CardData): CardData =>
      item.fr === originalFr
        ? {
            ...item,
            fr: cleanFr,
            ar: cleanAr,
            g: editWordGenderVal,
            kw: item.kw || cleanFr,
            exFr: cleanExFr || item.exFr,
            exAr: cleanExAr || item.exAr,
          }
        : item;

    const updatedMap: Record<number, CardData[]> = {};
    for (const [k, list] of Object.entries(lessonsMap) as [string, CardData[]][]) {
      updatedMap[Number(k)] = (list || []).map(updateCardObj);
    }

    setLessonsMap(updatedMap);
    try {
      localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(updatedMap));
    } catch {
      // Ignore
    }

    // Update or migrate saved hint/note
    setHints((prev) => {
      const next = { ...prev };
      if (originalFr !== cleanFr) {
        delete next[originalFr];
      }
      if (cleanHint) {
        next[cleanFr] = cleanHint;
      } else {
        delete next[cleanFr];
      }
      try {
        localStorage.setItem(HINTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    if (originalFr !== cleanFr) {
      if (favorites[originalFr]) {
        setFavorites((prev) => {
          const next = { ...prev };
          delete next[originalFr];
          next[cleanFr] = true;
          try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
          return next;
        });
      }
      if (weakWords[originalFr]) {
        setWeakWords((prev) => {
          const next = { ...prev };
          next[cleanFr] = next[originalFr];
          delete next[originalFr];
          try {
            localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
          return next;
        });
      }
      setStageOutcomes((prev) => {
        const next: StageOutcomesMap = {
          flashcards: { ...prev.flashcards },
          quiz: { ...prev.quiz },
          writing: { ...prev.writing },
        };
        (['flashcards', 'quiz', 'writing'] as StudyStage[]).forEach((stKey) => {
          if (next[stKey][originalFr]) {
            next[stKey][cleanFr] = next[stKey][originalFr];
            delete next[stKey][originalFr];
          }
        });
        return next;
      });
    }

    const refreshedWords = computeWordsForSelection(
      updatedMap,
      selectedDay,
      spacedSystem,
      selectedLessonScope
    );
    setMasterWords(refreshedWords);
    setQueue((prevQ) => prevQ.map(updateCardObj));
    setWrongList((prevW) => prevW.map(updateCardObj));
    setSkippedList((prevS) => prevS.map(updateCardObj));
    setEditingWordFr(null);
    setShowQuickCardEdit(false);
    setStatusBanner(`تم تعديل الكلمة "${cleanFr}" وحفظها بنجاح!`);
  };

  const buildBackupPayload = () => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        lessonsMap,
        lessonTitles,
        autoSpeak5Sec,
        spacedSystem,
        selectedDay,
        completedDays,
        completedDayLessons,
        completedDaysDates,
        dailyLearnedWords,
        favorites,
        weakWords,
        hints,
      },
      null,
      2
    );
  };

  const handleDownloadBackup = () => {
    const jsonStr = buildBackupPayload();
    setBackupJsonText(jsonStr);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusBanner('تم تحميل ملف النسخة الاحتياطية لجميع دروسك وتقدمك بنجاح!');
  };

  const handleCopyBackup = async () => {
    const jsonStr = buildBackupPayload();
    setBackupJsonText(jsonStr);
    try {
      await navigator.clipboard.writeText(jsonStr);
      setStatusBanner('تم نسخ كود النسخة الاحتياطية! يمكنك لصقه في أي جهاز آخر.');
    } catch {
      setStatusBanner('تم تجهيز كود النسخة الاحتياطية في المربع أدناه، انسخه يدوياً.');
    }
  };

  const applyBackupString = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object' || !parsed.lessonsMap) {
        setAiError('ملف أو كود النسخة الاحتياطية غير صالح.');
        return;
      }
      const nextLessonsMap = parsed.lessonsMap;
      const nextSys: SpacedSystemType =
        parsed.spacedSystem === '3' || parsed.spacedSystem === '4' || parsed.spacedSystem === '5'
          ? parsed.spacedSystem
          : spacedSystem;
      const nextDay =
        typeof parsed.selectedDay === 'number' && parsed.selectedDay >= 0 && parsed.selectedDay <= 30
          ? parsed.selectedDay
          : 0;

      setLessonsMap(nextLessonsMap);
      localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(nextLessonsMap));

      if (parsed.completedDays) setCompletedDays(parsed.completedDays);
      if (parsed.completedDayLessons) setCompletedDayLessons(parsed.completedDayLessons);
      if (parsed.completedDaysDates) setCompletedDaysDates(parsed.completedDaysDates);
      if (parsed.dailyLearnedWords && typeof parsed.dailyLearnedWords === 'object') {
        setDailyLearnedWords(parsed.dailyLearnedWords);
        localStorage.setItem(DAILY_LEARNED_KEY, JSON.stringify(parsed.dailyLearnedWords));
      }
      if (parsed.lessonTitles && typeof parsed.lessonTitles === 'object') {
        setLessonTitles(parsed.lessonTitles);
      }
      if (typeof parsed.autoSpeak5Sec === 'boolean') {
        setAutoSpeak5Sec(parsed.autoSpeak5Sec);
      }
      if (parsed.favorites) {
        setFavorites(parsed.favorites);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(parsed.favorites));
      }
      if (parsed.weakWords && typeof parsed.weakWords === 'object') {
        setWeakWords(parsed.weakWords);
        localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(parsed.weakWords));
      }
      if (parsed.hints) {
        setHints(parsed.hints);
        localStorage.setItem(HINTS_KEY, JSON.stringify(parsed.hints));
      }

      applySpacedSelection(nextDay, nextSys, 'new_lesson', nextLessonsMap);
      setStatusBanner('تم استرجاع جميع دروسك وتقدمك من النسخة الاحتياطية بنجاح!');
    } catch {
      setAiError('تعذر قراءة النسخة الاحتياطية. تأكد من صحة الكود أو الملف.');
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      if (text) {
        setBackupJsonText(text);
        applyBackupString(text);
      }
    };
    reader.readAsText(file);
  };
  // Test connection on mount
  useEffect(() => {
    testConnection().catch(() => {});
  }, []);

  // Subscribe to Firebase Auth and pull cloud data on sign-in
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserDataFromFirestore(user.uid)
          .then((cloudData) => {
            if (cloudData && cloudData.lessonsMap && Object.keys(cloudData.lessonsMap).length > 0) {
              setLessonsMap(cloudData.lessonsMap);
              try {
                localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(cloudData.lessonsMap));
              } catch {
                // Ignore storage error
              }
              if (cloudData.lessonTitles) setLessonTitles(cloudData.lessonTitles);
              if (cloudData.completedDays) setCompletedDays(cloudData.completedDays);
              if (cloudData.completedDayLessons) setCompletedDayLessons(cloudData.completedDayLessons);
              if (cloudData.completedDaysDates) setCompletedDaysDates(cloudData.completedDaysDates);
              if (cloudData.dailyLearnedWords) setDailyLearnedWords(cloudData.dailyLearnedWords);
              if (cloudData.favorites) setFavorites(cloudData.favorites);
              if (cloudData.weakWords) setWeakWords(cloudData.weakWords);
              if (cloudData.hints) setHints(cloudData.hints);
              if (typeof cloudData.autoSpeak5Sec === 'boolean') setAutoSpeak5Sec(cloudData.autoSpeak5Sec);
              if (cloudData.lastSyncedAt) {
                setLastCloudSyncTime(cloudData.lastSyncedAt);
                try {
                  localStorage.setItem('fr_fc7_last_cloud_sync', cloudData.lastSyncedAt);
                } catch {
                  // Ignore
                }
              }
              setStatusBanner('تم استرجاع ومزامنة بياناتك من السحابة بنجاح! ☁️');
            }
            isCloudDataLoadedRef.current = true;
          })
          .catch((err) => {
            console.error('Failed to load user cloud data:', err);
            isCloudDataLoadedRef.current = true;
          });
      } else {
        isCloudDataLoadedRef.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync debounced changes to Firestore when user is signed in
  useEffect(() => {
    if (!currentUser || !isCloudDataLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncUserDataToFirestore(currentUser.uid, {
        lessonsMap,
        lessonTitles,
        spacedSystem,
        selectedDay,
        completedDays,
        completedDayLessons,
        completedDaysDates,
        dailyLearnedWords,
        favorites,
        weakWords,
        hints,
        autoSpeak5Sec,
      })
        .then(() => {
          const nowStr = new Date().toISOString();
          setLastCloudSyncTime(nowStr);
          try {
            localStorage.setItem('fr_fc7_last_cloud_sync', nowStr);
          } catch {
            // Ignore
          }
          triggerCloudToast('تم الحفظ في السحابة بنجاح ☁️✓');
        })
        .catch((err) => {
          console.warn('Auto cloud sync failed:', err);
        });
    }, 2500);
    return () => clearTimeout(timer);
  }, [
    currentUser,
    lessonsMap,
    lessonTitles,
    spacedSystem,
    selectedDay,
    completedDays,
    completedDayLessons,
    completedDaysDates,
    dailyLearnedWords,
    favorites,
    weakWords,
    hints,
    autoSpeak5Sec,
    triggerCloudToast,
  ]);

  const handleSyncToCloud = async (overrideUid?: string) => {
    const targetUid = overrideUid || currentUser?.uid;
    if (!targetUid) {
      handleGoogleSignIn();
      return;
    }
    setIsSyncingCloud(true);
    setCloudSyncMessage('جاري مزامنة ورفع الكلمات إلى السحابة...');
    try {
      const nowStr = new Date().toISOString();
      await syncUserDataToFirestore(targetUid, {
        lessonsMap,
        lessonTitles,
        spacedSystem,
        selectedDay,
        completedDays,
        completedDayLessons,
        completedDaysDates,
        dailyLearnedWords,
        favorites,
        weakWords,
        hints,
        autoSpeak5Sec,
      });
      setLastCloudSyncTime(nowStr);
      try {
        localStorage.setItem('fr_fc7_last_cloud_sync', nowStr);
      } catch {
        // Ignore
      }
      setCloudSyncMessage('تم حفظ جميع الكلمات والتقدم على السحابة بنجاح! ✅');
      setStatusBanner('تم حفظ دروسك وتقدمك بالسحابة بنجاح!');
      triggerCloudToast('تم الحفظ في السحابة بنجاح ☁️✓');
    } catch (err) {
      console.error('Error syncing to cloud:', err);
      setCloudSyncMessage('حدث خطأ أثناء المزامنة. يرجى إعادة المحاولة.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!currentUser) {
      handleGoogleSignIn();
      return;
    }
    setIsSyncingCloud(true);
    setCloudSyncMessage('جاري استرجاع الكلمات من السحابة...');
    try {
      const cloudData = await loadUserDataFromFirestore(currentUser.uid);
      if (cloudData && cloudData.lessonsMap && Object.keys(cloudData.lessonsMap).length > 0) {
        setLessonsMap(cloudData.lessonsMap);
        try {
          localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(cloudData.lessonsMap));
        } catch {
          // Ignore
        }
        if (cloudData.lessonTitles) setLessonTitles(cloudData.lessonTitles);
        if (cloudData.completedDays) setCompletedDays(cloudData.completedDays);
        if (cloudData.completedDayLessons) setCompletedDayLessons(cloudData.completedDayLessons);
        if (cloudData.completedDaysDates) setCompletedDaysDates(cloudData.completedDaysDates);
        if (cloudData.dailyLearnedWords) setDailyLearnedWords(cloudData.dailyLearnedWords);
        if (cloudData.favorites) setFavorites(cloudData.favorites);
        if (cloudData.weakWords) setWeakWords(cloudData.weakWords);
        if (cloudData.hints) setHints(cloudData.hints);
        if (typeof cloudData.autoSpeak5Sec === 'boolean') setAutoSpeak5Sec(cloudData.autoSpeak5Sec);
        if (cloudData.lastSyncedAt) {
          setLastCloudSyncTime(cloudData.lastSyncedAt);
          try {
            localStorage.setItem('fr_fc7_last_cloud_sync', cloudData.lastSyncedAt);
          } catch {
            // Ignore
          }
        }
        applySpacedSelection(cloudData.selectedDay, cloudData.spacedSystem, 'new_lesson', cloudData.lessonsMap);
        setCloudSyncMessage('تم استرجاع جميع الكلمات والتقدم من السحابة بنجاح! 🎉');
        setStatusBanner('تم تحديث التطبيق بالكلمات المحفوظة بالسحابة!');
      } else {
        setCloudSyncMessage('لا توجد بيانات سابقة محفوظة في حسابك السحابي بعد.');
      }
    } catch (err) {
      console.error('Failed to pull cloud data:', err);
      setCloudSyncMessage('تعذر جلب البيانات من السحابة. تحقق من اتصالك.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSyncingCloud(true);
      setCloudSyncMessage('جاري تسجيل الدخول بحساب Google...');
      const user = await signInWithGoogle();
      setCurrentUser(user);
      const cloudData = await loadUserDataFromFirestore(user.uid);
      if (cloudData && cloudData.lessonsMap && Object.keys(cloudData.lessonsMap).length > 0) {
        setLessonsMap(cloudData.lessonsMap);
        try {
          localStorage.setItem(LESSONS_MAP_KEY, JSON.stringify(cloudData.lessonsMap));
        } catch {
          // Ignore
        }
        if (cloudData.lessonTitles) setLessonTitles(cloudData.lessonTitles);
        if (cloudData.completedDays) setCompletedDays(cloudData.completedDays);
        if (cloudData.completedDayLessons) setCompletedDayLessons(cloudData.completedDayLessons);
        if (cloudData.completedDaysDates) setCompletedDaysDates(cloudData.completedDaysDates);
        if (cloudData.dailyLearnedWords) setDailyLearnedWords(cloudData.dailyLearnedWords);
        if (cloudData.favorites) setFavorites(cloudData.favorites);
        if (cloudData.weakWords) setWeakWords(cloudData.weakWords);
        if (cloudData.hints) setHints(cloudData.hints);
        if (typeof cloudData.autoSpeak5Sec === 'boolean') setAutoSpeak5Sec(cloudData.autoSpeak5Sec);
        applySpacedSelection(cloudData.selectedDay, cloudData.spacedSystem, 'new_lesson', cloudData.lessonsMap);
        setCloudSyncMessage('تم تسجيل الدخول واسترجاع كلماتك من السحابة! 🎉');
        setStatusBanner('أهلاً بك! تم تحميل كلماتك المحفوظة بالسحابة.');
      } else {
        await handleSyncToCloud(user.uid);
        setStatusBanner('أهلاً بك! تم ربط حسابك ورفع كلماتك إلى السحابة.');
      }
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setCloudSyncMessage('تعذر تسجيل الدخول.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setCloudSyncMessage('تم تسجيل الخروج.');
      setStatusBanner('تم تسجيل الخروج من الحساب السحابي.');
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFr.trim() || !manualAr.trim()) return;
    const newCard: CardData = {
      fr: manualFr.trim(),
      ar: manualAr.trim(),
      g: manualGender,
      cat: manualCat.trim() || '📝 مفردات عامة',
      kw: manualFr.trim(),
    };
    const currentLessonWords = lessonsMap[targetEditLesson] || [];
    saveMasterWords([newCard, ...currentLessonWords], targetEditLesson);
    setManualFr('');
    setManualAr('');
    setStatusBanner(`تمت إضافة "${newCard.fr}" إلى (درس ${targetEditLesson}).`);
  };

  const targetLessonWords = lessonsMap[targetEditLesson] || [];
  const filteredMasterWords = targetLessonWords.filter(
    (w) =>
      w.fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.ar.includes(searchQuery) ||
      w.cat.includes(searchQuery)
  );
  const dueLessonsToday = getLessonsForDay(selectedDay, spacedSystem);
  const completedDaysCount = Object.values(completedDays).filter(Boolean).length;
  const previousReviewLessonsToday = dueLessonsToday.filter((l) => l !== selectedDay);
  const previousReviewWordsCount = previousReviewLessonsToday.reduce(
    (sum, l) => sum + (lessonsMap[l]?.length || 0),
    0
  );

  // Compute last 7 days learned words chart data from stored progress in localStorage
  const last7DaysChartData = (() => {
    const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayStr = getLocalDateKey();
    const result: {
      dateKey: string;
      dayLabel: string;
      fullLabel: string;
      count: number;
      isToday: boolean;
    }[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const dObj = new Date(Date.now() - offset * 86400000);
      const dateKey = getLocalDateKey(dObj);
      const dayName = arabicDayNames[dObj.getDay()];
      const dayLabel = offset === 0 ? 'اليوم' : offset === 1 ? 'أمس' : dayName;
      const fullLabel = `${dayName} (${dObj.getDate()}/${dObj.getMonth() + 1})`;

      const learnedSet = new Set<string>();

      // 1. Direct daily learned words log
      const loggedWords = dailyLearnedWords[dateKey];
      if (Array.isArray(loggedWords)) {
        for (const w of loggedWords) {
          if (w) learnedSet.add(w);
        }
      }

      // 2. Words from days marked completed on this dateKey in completedDaysDates
      for (const [dayNumStr, completedDate] of Object.entries(completedDaysDates)) {
        const dayNum = Number(dayNumStr);
        if (completedDate === dateKey && completedDays[dayNum]) {
          const dueForThatDay = getLessonsForDay(dayNum, spacedSystem);
          for (const lNum of dueForThatDay) {
            for (const card of lessonsMap[lNum] || []) {
              if (card?.fr) learnedSet.add(card.fr);
            }
          }
        }
      }

      // 3. For today: also include any words answered correctly in the active session or completed days without a stored date
      if (dateKey === todayStr) {
        for (const [idxStr, status] of Object.entries(cardAnswers)) {
          if (status === 'correct') {
            const card = queue[Number(idxStr)];
            if (card?.fr) learnedSet.add(card.fr);
          }
        }
        for (const [dayNumStr, isDone] of Object.entries(completedDays)) {
          const dayNum = Number(dayNumStr);
          if (isDone && !completedDaysDates[dayNum]) {
            const dueForThatDay = getLessonsForDay(dayNum, spacedSystem);
            for (const lNum of dueForThatDay) {
              for (const card of lessonsMap[lNum] || []) {
                if (card?.fr) learnedSet.add(card.fr);
              }
            }
          }
        }
      }

      result.push({
        dateKey,
        dayLabel,
        fullLabel,
        count: learnedSet.size,
        isToday: offset === 0,
      });
    }

    return result;
  })();

  const totalLearnedLast7Days = last7DaysChartData.reduce((sum, item) => sum + item.count, 0);
  const learnedTodayCount = last7DaysChartData[last7DaysChartData.length - 1]?.count || 0;

  // Move to the next day, clear the screen for the new lesson, and open AI modal to add new words
  const startNextDayAndAddNewWords = useCallback(() => {
    markDayOrLessonCompleted(selectedDay, selectedLessonScope, spacedSystem, true);
    const nextDay = Math.min(30, selectedDay + 1);
    applySpacedSelection(nextDay, spacedSystem, 'new_lesson');
    setTargetEditLesson(nextDay);
    setAnalyzedPreview([]);
    setAiInputText('');
    setAiImage(null);
    setManagerTab('ai');
    setShowManager(true);
  }, [selectedDay, selectedLessonScope, spacedSystem, markDayOrLessonCompleted, applySpacedSelection]);

  // Clear the current lesson's words and open AI modal to add brand-new words
  const clearCurrentLessonAndAddNewWords = useCallback(() => {
    const lessonToClear =
      typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay;
    saveMasterWords([], lessonToClear);
    setTargetEditLesson(lessonToClear);
    setAnalyzedPreview([]);
    setAiInputText('');
    setAiImage(null);
    setManagerTab('ai');
    setShowManager(true);
  }, [selectedLessonScope, selectedDay, saveMasterWords]);

  // Guarantee stage unlock & automatic day/lesson completion whenever round finishes
  useEffect(() => {
    if (isFinished && queue.length > 0) {
      if (stage === 'flashcards') {
        setStage2Unlocked(true);
      } else if (stage === 'quiz') {
        setStage3Unlocked(true);
      }
      if (
        wrongList.length === 0 &&
        skippedList.length === 0 &&
        correctCount === queue.length
      ) {
        if (selectedLessonScope === 'review_old') {
          markDayOrLessonCompleted(selectedDay, 'review_old', spacedSystem);
        } else if (stage === 'writing') {
          markDayOrLessonCompleted(selectedDay, selectedLessonScope, spacedSystem);
        }
      }
    }
  }, [
    isFinished,
    wrongList.length,
    skippedList.length,
    correctCount,
    queue.length,
    stage,
    selectedDay,
    selectedLessonScope,
    spacedSystem,
    markDayOrLessonCompleted,
  ]);

  const d = queue[current];
  const h = d ? hints[d.fr] || '' : '';
  const currentAnswer = cardAnswers[current];
  const genderInfo = getGenderInfo(d?.g);
  const isCurrentFavorite = d ? Boolean(favorites[d.fr]) : false;
  const exampleSentence = d ? getCardExample(d) : { exFr: '', exAr: '' };
  const isCurrentFrench = d ? getWordLang(d).startsWith('fr') : false;
  const currentCardLessonNum = (() => {
    if (!d) return selectedDay;
    if (typeof selectedLessonScope === 'number') return selectedLessonScope;
    const ordered = [selectedDay, ...dueLessonsToday.filter((l) => l !== selectedDay)];
    for (const l of ordered) {
      if ((lessonsMap[l] || []).some((w) => w.fr === d.fr)) {
        return l;
      }
    }
    return selectedDay;
  })();

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center px-3.5 py-3 sm:px-6 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))] ${
        focusMode ? 'max-w-xl' : 'max-w-xl lg:max-w-5xl'
      } mx-auto font-sans w-full overflow-x-hidden transition-all ${
        focusMode && !isFinished && queue.length > 0 ? 'justify-between' : ''
      }`}
    >
      {/* Non-intrusive Offline Banner for Mobile PWA */}
      {!isOnline && (
        <div className="w-full mb-2.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5">
          <span>وضع عدم الاتصال بالإنترنت — بياناتك وكلماتك محفوظة وتعمل بالكامل على جهازك</span>
        </div>
      )}
      {/* Instant Green Cloud Notification Toast */}
      <AnimatePresence>
        {cloudToast.visible && (
          <motion.div
            key={cloudToast.id}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600/95 dark:bg-emerald-700/95 text-white backdrop-blur-md border border-emerald-400/50 shadow-xl shadow-emerald-950/25 text-xs sm:text-sm font-extrabold"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
            <Cloud size={17} className="text-emerald-100 shrink-0" />
            <span>{cloudToast.message}</span>
            <Check size={15} className="text-emerald-200 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar (Transforms into a sleek floating Zen bar when Focus Mode is active) */}
      {focusMode && !isFinished && queue.length > 0 ? (
        <header className="w-full flex items-center justify-between gap-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 mb-3 shadow-xs">
          {/* Right: Compact Lesson Badge + Stage Dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold tabular-nums">
              {getLessonLabel(currentCardLessonNum)}
            </span>
            <div className="flex items-center gap-1 bg-[var(--muted)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => switchStage('flashcards')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  stage === 'flashcards'
                    ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-[var(--muted-foreground)]'
                }`}
                title="المرحلة 1: قلب الكروت"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => switchStage('quiz')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  stage === 'quiz'
                    ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : stage2Unlocked
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] opacity-45'
                }`}
                title="المرحلة 2: فلاش كارت الجمل"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => switchStage('writing')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  stage === 'writing'
                    ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : stage3Unlocked
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] opacity-45'
                }`}
                title="المرحلة 3: الكتابة والإملاء"
              >
                3
              </button>
            </div>
          </div>

          {/* Center: Minimal Calm Progress Line + Card Index */}
          <div className="flex items-center gap-2.5 flex-1 max-w-[200px]">
            <div className="flex-1 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${((current + 1) / Math.max(1, queue.length)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-[var(--foreground)] tabular-nums shrink-0">
              {current + 1}/{queue.length}
            </span>
          </div>

          {/* Left: Sound Effects Toggle + Dark Mode + Exit Focus Mode */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleSoundEffects}
              aria-label={soundEffectsEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
              title={soundEffectsEnabled ? 'كتم أصوات النجاح والتنبيه' : 'تفعيل أصوات النجاح والتنبيه'}
              className={`w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center transition-colors ${
                soundEffectsEnabled
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--muted)]/50 text-[var(--muted-foreground)]'
              }`}
            >
              {soundEffectsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'وضع نهاري' : 'وضع ليلي'}
              className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-colors"
            >
              {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              title="الخروج من وضع التركيز التام (Esc)"
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 transition-all"
            >
              <X size={14} />
              <span>إنهاء التركيز</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="w-full flex justify-between items-center mb-3 pb-2.5 border-b border-[var(--border)] gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-[var(--foreground)] whitespace-nowrap">
              فلاش كارت الذكي
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => {
                stopTimer();
                setShowSpacedModal(true);
              }}
              className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] hover:border-emerald-500/50 hover:bg-[var(--muted)] rounded-xl px-2 sm:px-2.5 py-1.5 text-[11px] font-bold transition-all shadow-2xs min-h-[34px] whitespace-nowrap"
            >
              <Calendar size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">
                جدول التكرار ({SPACED_SYSTEM_INFO[spacedSystem].shortLabel})
              </span>
              <span className="sm:hidden">الجدول</span>
            </button>

            <button
              onClick={() => {
                stopTimer();
                setTargetEditLesson(
                  typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay
                );
                setShowManager(true);
              }}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all shadow-sm shadow-emerald-600/20 whitespace-nowrap min-h-[34px]"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">إدارة الكلمات و AI</span>
              <span className="sm:hidden">الكلمات</span>
            </button>

            <button
              onClick={() => {
                if (currentUser) {
                  setShowCloudModal(true);
                } else {
                  handleGoogleSignIn();
                }
              }}
              title={
                currentUser
                  ? `حساب سحابي متصل: ${currentUser.email} (اضغط لإدارة المزامنة)`
                  : 'تسجيل الدخول بحساب Google لحفظ كلماتك ودروسك على السحابة'
              }
              className={`flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-[11px] font-bold border transition-all min-h-[34px] shadow-2xs whitespace-nowrap ${
                currentUser
                  ? 'bg-sky-500/10 border-sky-500/35 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-emerald-500/40'
              }`}
            >
              <Cloud size={13} className={currentUser ? 'text-sky-600 dark:text-sky-400' : ''} />
              {currentUser ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[80px]">
                    {currentUser.displayName?.split(' ')[0] || 'سحابي'}
                  </span>
                  <span className="sm:hidden">سحابي</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">حفظ بالسحابة</span>
                  <span className="sm:hidden">سحابة</span>
                </>
              )}
            </button>

            {/* Sound Effects Toggle Button in Main Header */}
            <button
              onClick={toggleSoundEffects}
              aria-label={soundEffectsEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
              title={
                soundEffectsEnabled
                  ? 'المؤثرات الصوتية مفعلة (اضغط للكتم)'
                  : 'المؤثرات الصوتية مكتومة (اضغط للتفعيل)'
              }
              className={`flex items-center justify-center border rounded-xl p-1.5 text-xs transition-colors min-h-[34px] min-w-[34px] shadow-2xs ${
                soundEffectsEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {soundEffectsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'وضع نهاري' : 'وضع ليلي'}
              className="flex items-center justify-center border border-[var(--border)] rounded-xl p-1.5 text-xs bg-[var(--card)] hover:bg-[var(--muted)] transition-colors min-h-[34px] min-w-[34px] shadow-2xs"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>
          </div>
        </header>
      )}

      {/* Unified Top Study Control Dock: Day Navigator + Quick Toggles (Favorites & 5s Audio) + 3-Stage Stepper */}
      {!focusMode && (
        <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2.5 mb-2.5 shadow-2xs space-y-2 transition-all">
          {/* Row 1: Day Navigation (Right) + Quick Utilities & Details Toggle (Left) */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
            {/* Right: Day Navigation + Current Lesson Quick Summary */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  applySpacedSelection(Math.max(0, selectedDay - 1), spacedSystem, 'new_lesson')
                }
                disabled={selectedDay === 0}
                className="w-7 h-7 rounded-xl bg-[var(--muted)] hover:bg-emerald-500/10 flex items-center justify-center disabled:opacity-35 transition-colors shrink-0"
                aria-label="اليوم السابق"
              >
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={() => setShowSpacedModal(true)}
                className={`px-2.5 h-7 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
                  completedDays[selectedDay]
                    ? 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)]'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <span className="tabular-nums">اليوم {selectedDay}</span>
                <span aria-hidden="true" className="opacity-50">·</span>
                <span className="font-semibold">
                  {getLessonLabel(
                    typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay
                  )}
                </span>
                {completedDays[selectedDay] && <Check size={11} className="shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() =>
                  applySpacedSelection(Math.min(30, selectedDay + 1), spacedSystem, 'new_lesson')
                }
                disabled={selectedDay >= 30}
                className="w-7 h-7 rounded-xl bg-[var(--muted)] hover:bg-emerald-500/10 flex items-center justify-center disabled:opacity-35 transition-colors shrink-0"
                aria-label="اليوم التالي"
              >
                <ArrowLeft size={13} />
              </button>
            </div>

            {/* Left: Integrated Favorites Toggle + 5s Auto-Speak Toggle + Day Details Toggle */}
            <div className="flex items-center gap-1 shrink-0">
              {masterWords.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      switchStudyMode(studyFilter === 'favorites' ? 'all' : 'favorites')
                    }
                    title={
                      studyFilter === 'favorites'
                        ? 'اضغط للعودة إلى كل الكلمات'
                        : 'اضغط لعرض الكلمات المفضلة فقط'
                    }
                    className={`h-7 px-2 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all whitespace-nowrap shrink-0 ${
                      studyFilter === 'favorites'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                        : 'bg-[var(--muted)] border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Heart
                      size={11}
                      className={`shrink-0 ${
                        studyFilter === 'favorites' || favoriteWordsList.length > 0
                          ? 'fill-rose-500 text-rose-500'
                          : ''
                      }`}
                    />
                    <span className="hidden sm:inline">المفضلة</span>
                    <span className="tabular-nums">{favoriteWordsList.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoSpeak5Sec((prev) => !prev)}
                    title="نطق الكلمة تلقائياً بعد 5 ثوانٍ لإعطائك وقتاً لقراءتها أولاً"
                    className={`h-7 px-2 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all whitespace-nowrap shrink-0 ${
                      autoSpeak5Sec
                        ? 'bg-emerald-600/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-300'
                        : 'bg-[var(--muted)] border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Volume2 size={11} className="shrink-0" />
                    <span>5ث</span>
                  </button>
                </>
              )}

              {previousReviewLessonsToday.length > 0 && !showDailyDetails && (
                <button
                  type="button"
                  onClick={() =>
                    applySpacedSelection(
                      selectedDay,
                      spacedSystem,
                      selectedLessonScope === 'review_old' ? 'new_lesson' : 'review_old'
                    )
                  }
                  className={`h-7 px-2 rounded-xl text-[11px] font-bold border transition-all whitespace-nowrap shrink-0 ${
                    selectedLessonScope === 'review_old'
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-emerald-500/40'
                  }`}
                >
                  {selectedLessonScope === 'review_old'
                    ? `درس ${selectedDay}`
                    : `مراجعة (${previousReviewWordsCount})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowDailyDetails((prev) => !prev)}
                title={showDailyDetails ? 'إخفاء تفاصيل اليوم' : 'عرض تفاصيل اليوم'}
                className={`h-7 px-2 rounded-xl border text-[11px] font-bold flex items-center gap-0.5 transition-colors whitespace-nowrap shrink-0 ${
                  showDailyDetails
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[var(--muted)] hover:bg-emerald-500/10 border-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                <span className="hidden sm:inline">تفاصيل</span>
                {showDailyDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {showDailyDetails && (
            <div className="pt-2 border-t border-[var(--border)] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                  نظام التكرار المتباعد:
                </span>
                <div className="flex items-center gap-1 bg-[var(--muted)] p-1 rounded-xl">
                  {(['3', '4', '5'] as SpacedSystemType[]).map((sys) => (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => applySpacedSelection(selectedDay, sys, 'new_lesson')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                        spacedSystem === sys
                          ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-2xs'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {sys} مرات
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1 (New Lesson) vs Step 2 (Quick Review of Old Lessons) */}
              {previousReviewLessonsToday.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applySpacedSelection(selectedDay, spacedSystem, 'new_lesson')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      selectedLessonScope === 'new_lesson' || selectedLessonScope === selectedDay
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : Boolean(completedDays[selectedDay]) ||
                          Boolean(completedDayLessons[`${selectedDay}_${selectedDay}`])
                        ? 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)]'
                        : 'bg-[var(--muted)] border-transparent text-[var(--foreground)] hover:border-[var(--border)]'
                    }`}
                  >
                    {(Boolean(completedDays[selectedDay]) ||
                      Boolean(completedDayLessons[`${selectedDay}_${selectedDay}`])) && (
                      <Check size={12} className="shrink-0" />
                    )}
                    <span>
                      1. درس {selectedDay} الجديد ({lessonsMap[selectedDay]?.length || 0})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applySpacedSelection(selectedDay, spacedSystem, 'review_old')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      selectedLessonScope === 'review_old'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : Boolean(completedDays[selectedDay]) ||
                          previousReviewLessonsToday.every((l) =>
                            Boolean(completedDayLessons[`${selectedDay}_${l}`])
                          )
                        ? 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)]'
                        : 'bg-[var(--muted)] border-transparent text-[var(--foreground)] hover:border-[var(--border)]'
                    }`}
                  >
                    {(Boolean(completedDays[selectedDay]) ||
                      previousReviewLessonsToday.every((l) =>
                        Boolean(completedDayLessons[`${selectedDay}_${l}`])
                      )) && <Check size={12} className="shrink-0" />}
                    <span>2. مراجعة السابق ({previousReviewWordsCount})</span>
                  </button>
                </div>
              )}

              {/* Today's Due Lessons Formula Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {dueLessonsToday.map((lessonNum, idx) => {
                  const count = lessonsMap[lessonNum]?.length || 0;
                  const isSelected =
                    selectedLessonScope === lessonNum ||
                    (selectedLessonScope === 'new_lesson' && lessonNum === selectedDay);
                  const isLessonDone =
                    Boolean(completedDays[selectedDay]) ||
                    Boolean(completedDayLessons[`${selectedDay}_${lessonNum}`]);
                  return (
                    <React.Fragment key={lessonNum}>
                      {idx > 0 && (
                        <span className="text-xs text-[var(--muted-foreground)] font-bold">+</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          applySpacedSelection(
                            selectedDay,
                            spacedSystem,
                            lessonNum === selectedDay ? 'new_lesson' : lessonNum
                          )
                        }
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600/15 border-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold'
                            : isLessonDone
                            ? 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)]'
                            : count === 0
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                            : 'bg-[var(--muted)] border-transparent text-[var(--foreground)] hover:border-[var(--border)]'
                        }`}
                      >
                        {isLessonDone && <Check size={11} className="shrink-0" />}
                        <span>
                          {getLessonLabel(lessonNum)}
                          {lessonNum === selectedDay ? ' (جديد)' : ''}
                        </span>
                        <span className="opacity-75 tabular-nums">({count})</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Custom Lesson Title + Progress Footer */}
              <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] whitespace-nowrap">
                    عنوان درس{' '}
                    {typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay}:
                  </span>
                  <input
                    type="text"
                    value={
                      lessonTitles[
                        typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay
                      ] || ''
                    }
                    onChange={(e) =>
                      updateLessonTitle(
                        typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay,
                        e.target.value
                      )
                    }
                    placeholder="اكتب عنواناً للدرس (مثلاً: السفر، المطعم...)"
                    className="flex-1 border border-[var(--border)] rounded-xl px-2.5 py-1 text-xs bg-[var(--muted)]/70 outline-none focus:border-emerald-600 focus:bg-[var(--card)] transition-all"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0">
                  <span className="text-[var(--muted-foreground)] tabular-nums text-[11px]">
                    الأيام المنجزة:{' '}
                    <b className="text-emerald-600 dark:text-emerald-400">{completedDaysCount}/31</b>
                  </span>

                  {completedDays[selectedDay] ? (
                    <span className="text-[11px] font-bold text-[var(--correct-text)] flex items-center gap-1">
                      <Check size={12} /> محسوب
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        markDayOrLessonCompleted(
                          selectedDay,
                          selectedLessonScope,
                          spacedSystem,
                          true
                        )
                      }
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--muted)] hover:bg-emerald-600/15 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
                    >
                      ✓ احتساب اليوم {selectedDay}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Row 2 inside Unified Dock: 3-Stage Mastery Switcher (No truncation on mobile!) */}
          {masterWords.length > 0 &&
            (() => {
              const activeDeckForTabs = getActiveDeckSource();
              const totalForTabs = Math.max(1, activeDeckForTabs.length);
              const getStagePct = (stKey: StudyStage) => {
                const map = stageOutcomes[stKey] || {};
                let c = 0;
                activeDeckForTabs.forEach((card) => {
                  if (map[card.fr] === 'correct') c++;
                });
                return Math.round((c / totalForTabs) * 100);
              };
              const st1Pct = getStagePct('flashcards');
              const st2Pct = getStagePct('quiz');
              const st3Pct = getStagePct('writing');

              return (
                <div className="w-full grid grid-cols-3 gap-1 p-1 bg-[var(--muted)]/85 rounded-xl border border-[var(--border)]/50">
                  <button
                    type="button"
                    onClick={() => switchStage('flashcards')}
                    className={`relative overflow-hidden py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                      stage === 'flashcards'
                        ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <Layers size={12} className="shrink-0" />
                    <span className="sm:hidden">1. الكلمات</span>
                    <span className="hidden sm:inline">1. قلب الكروت</span>
                    {st1Pct > 0 ? (
                      <span className="text-[10px] px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums shrink-0">
                        {st1Pct}%
                      </span>
                    ) : (
                      stage2Unlocked && (
                        <Check size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    )}
                    {st1Pct > 0 && (
                      <span
                        className="absolute bottom-0 right-0 h-0.5 bg-emerald-500 transition-all duration-300"
                        style={{ width: `${st1Pct}%` }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchStage('quiz')}
                    className={`relative overflow-hidden py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                      stage === 'quiz'
                        ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs'
                        : stage2Unlocked
                        ? 'text-[var(--foreground)] hover:bg-[var(--card)]/60'
                        : 'text-[var(--muted-foreground)] opacity-60'
                    }`}
                  >
                    {stage2Unlocked ? (
                      <BookOpen size={12} className="shrink-0" />
                    ) : (
                      <Lock size={11} className="shrink-0" />
                    )}
                    <span className="sm:hidden">2. الجمل</span>
                    <span className="hidden sm:inline">2. جمل الكلمات</span>
                    {st2Pct > 0 ? (
                      <span className="text-[10px] px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums shrink-0">
                        {st2Pct}%
                      </span>
                    ) : (
                      stage3Unlocked && (
                        <Check size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    )}
                    {st2Pct > 0 && (
                      <span
                        className="absolute bottom-0 right-0 h-0.5 bg-emerald-500 transition-all duration-300"
                        style={{ width: `${st2Pct}%` }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchStage('writing')}
                    className={`relative overflow-hidden py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                      stage === 'writing'
                        ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 font-extrabold shadow-2xs'
                        : stage3Unlocked
                        ? 'text-[var(--foreground)] hover:bg-[var(--card)]/60'
                        : 'text-[var(--muted-foreground)] opacity-60'
                    }`}
                  >
                    {stage3Unlocked ? (
                      <PenTool size={12} className="shrink-0" />
                    ) : (
                      <Lock size={11} className="shrink-0" />
                    )}
                    <span className="sm:hidden">3. الكتابة</span>
                    <span className="hidden sm:inline">3. الكتابة والإملاء</span>
                    {st3Pct > 0 && (
                      <span className="text-[10px] px-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums shrink-0">
                        {st3Pct}%
                      </span>
                    )}
                    {st3Pct > 0 && (
                      <span
                        className="absolute bottom-0 right-0 h-0.5 bg-emerald-500 transition-all duration-300"
                        style={{ width: `${st3Pct}%` }}
                      />
                    )}
                  </button>
                </div>
              );
            })()}

          {stageLockMessage && (
            <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>{stageLockMessage}</span>
              <button
                type="button"
                onClick={() => setStageLockMessage(null)}
                className="p-1 rounded-lg hover:bg-black/5"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
      {showSpacedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">جدول التكرار المتباعد (اليوم 0 إلى 30)</h2>
              </div>
              <button
                onClick={() => setShowSpacedModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 7-Day Daily Learned Words Chart (Recharts) */}
              <div className="p-3.5 rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <BarChart3 size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>الكلمات المتعلمة يومياً (آخر 7 أيام)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-bold">
                      اليوم: {learnedTodayCount} كلمة
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] font-semibold">
                      إجمالي 7 أيام: {totalLearnedLast7Days}
                    </span>
                  </div>
                </div>

                <div className="w-full h-40" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={last7DaysChartData}
                      margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis
                        dataKey="dayLabel"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          textAlign: 'right',
                          direction: 'rtl',
                        }}
                        formatter={(value: number) => [`${value} كلمة`, 'تم تعلمها']}
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.fullLabel || String(_label)
                        }
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                        {last7DaysChartData.map((entry, index) => (
                          <Cell
                            key={`cell-spaced-${index}`}
                            fill={entry.isToday ? '#059669' : '#10b981'}
                            fillOpacity={entry.isToday ? 1 : 0.65}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* System Selector: 3 / 4 / 5 Times */}
              <div className="space-y-2">
                <div className="text-xs font-semibold">اختر نظام التكرار المتباعد:</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['3', '4', '5'] as SpacedSystemType[]).map((sys) => {
                    const info = SPACED_SYSTEM_INFO[sys];
                    const active = spacedSystem === sys;
                    return (
                      <button
                        key={sys}
                        type="button"
                        onClick={() => applySpacedSelection(selectedDay, sys, 'new_lesson')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          active
                            ? 'bg-emerald-600/15 border-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        <div className="text-xs font-bold">{info.label}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          {sys === '3'
                            ? '1، 7، 30 يوم'
                            : sys === '4'
                            ? '1، 7، 14، 30 يوم'
                            : '1، 3، 7، 14، 30 يوم'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] text-center">
                  {SPACED_SYSTEM_INFO[spacedSystem].intervalsLabel}
                </div>
              </div>

              {/* 30-Day Schedule List */}
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {Array.from({ length: 31 }, (_, dayIndex) => {
                  const formula = formatDayLessonsFormula(dayIndex, spacedSystem);
                  const dayLessons = getLessonsForDay(dayIndex, spacedSystem);
                  const totalWordsInDay = dayLessons.reduce(
                    (sum, l) => sum + (lessonsMap[l]?.length || 0),
                    0
                  );
                  const isCurrentDay = selectedDay === dayIndex;
                  const isDone = Boolean(completedDays[dayIndex]);

                  return (
                    <div
                      key={dayIndex}
                      onClick={() => {
                        applySpacedSelection(dayIndex, spacedSystem, 'new_lesson');
                        setShowSpacedModal(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isCurrentDay
                          ? 'bg-emerald-600/15 border-emerald-600 font-bold'
                          : isDone
                          ? 'bg-[var(--correct-bg)]/50 border-[var(--correct-border)]'
                          : 'bg-[var(--muted)] border-[var(--border)] hover:border-emerald-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleDayCompleted(dayIndex, e)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-[var(--border)] bg-[var(--card)]'
                          }`}
                          aria-label={`تحديد اليوم ${dayIndex} كمكتمل`}
                        >
                          {isDone && <Check size={12} />}
                        </button>
                        <div className="truncate">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">
                            اليوم {dayIndex}:{' '}
                          </span>
                          <span>
                            {dayLessons.map((l) => getLessonLabel(l)).join(' + ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                          ({totalWordsInDay} كلمة)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetEditLesson(dayIndex);
                            setShowSpacedModal(false);
                            setManagerTab('ai');
                            setShowManager(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[10px] hover:border-emerald-600 whitespace-nowrap"
                        >
                          + كلمات درس {dayIndex}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Spaced Repetition 30-Day Schedule Modal */}

      {focusMode && stageLockMessage && (
        <div className="w-full p-3 mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
          <span>{stageLockMessage}</span>
          <button
            type="button"
            onClick={() => setStageLockMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Word Manager & AI Analyzer Modal */}
      {showManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold">إدارة الكلمات والمحلل الذكي (AI)</h2>
              </div>
              <button
                onClick={() => setShowManager(false)}
                className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lesson Selector Bar inside Word Manager */}
            <div className="px-5 pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  الدرس المختار للإضافة أو التعديل:
                </span>
                <select
                  value={targetEditLesson}
                  onChange={(e) => setTargetEditLesson(Number(e.target.value))}
                  className="rounded-lg border border-emerald-600/40 bg-[var(--card)] px-3 py-1.5 text-xs font-bold outline-none"
                >
                  {Array.from({ length: 31 }, (_, idx) => (
                    <option key={idx} value={idx}>
                      {getLessonLabel(idx)} ({lessonsMap[idx]?.length || 0} كلمة)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">
                  🏷️ عنوان درس {targetEditLesson}:
                </span>
                <input
                  type="text"
                  value={lessonTitles[targetEditLesson] || ''}
                  onChange={(e) => updateLessonTitle(targetEditLesson, e.target.value)}
                  placeholder="اختياري: اكتب عنواناً يذكرك بموضوع هذا الدرس..."
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Interactive Segmented Tabs */}
            <div className="px-5 pt-2.5">
              <div className="grid grid-cols-5 gap-1 p-1 bg-[var(--muted)] rounded-xl">
                <button
                  onClick={() => setManagerTab('ai')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                    managerTab === 'ai'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>إضافة بـ AI</span>
                </button>
                <button
                  onClick={() => setManagerTab('list')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                    managerTab === 'list'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <ListChecks size={12} />
                  <span className="tabular-nums">
                    درس {targetEditLesson} ({targetLessonWords.length})
                  </span>
                </button>
                <button
                  onClick={() => setManagerTab('favorites')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                    managerTab === 'favorites'
                      ? 'bg-[var(--card)] text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Heart
                    size={12}
                    className={favoriteWordsList.length > 0 ? 'fill-rose-500 text-rose-500' : ''}
                  />
                  <span className="tabular-nums">المفضلة ({favoriteWordsList.length})</span>
                </button>
                <button
                  onClick={() => setManagerTab('stats')}
                  className={`py-2 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                    managerTab === 'stats'
                      ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <BarChart3 size={12} />
                  <span>الإحصائيات</span>
                </button>
                <button
                  onClick={() => {
                    setBackupJsonText(buildBackupPayload());
                    setManagerTab('backup');
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                    managerTab === 'backup'
                      ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Cloud size={12} />
                  <span>سحابة ونسخ</span>
                </button>
              </div>
            </div>

            {statusBanner && (
              <div className="mx-5 mt-3 p-3 rounded-xl bg-[var(--correct-bg)] border border-[var(--correct-border)] text-[var(--correct-text)] text-xs font-medium flex items-center gap-2">
                <Check size={15} className="shrink-0" />
                <span>{statusBanner}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {managerTab === 'ai' ? (
                <>
                  {/* Quick Clear All Bar right inside AI tab for convenience */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                    <div className="text-xs">
                      <span className="font-semibold">كلمات (درس {targetEditLesson}): </span>
                      <span className="tabular-nums font-bold">{targetLessonWords.length} كلمة</span>
                    </div>
                    {!confirmClearAll ? (
                      <button
                        onClick={() => setConfirmClearAll(true)}
                        disabled={targetLessonWords.length === 0}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--wrong-bg)] text-[var(--wrong-text)] border border-[var(--wrong-border)] hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                      >
                        <Trash2 size={13} />
                        <span>مسح كلمات درس {targetEditLesson}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleDeleteAllWords}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                        >
                          تأكيد المسح
                        </button>
                        <button
                          onClick={() => setConfirmClearAll(false)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] whitespace-nowrap"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Input Section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold">
                      الصق كلماتك بأي لغة (إنجليزي، فرنسي، ألماني...) أو اكتب موضوعاً ليقوم AI بتحليلها:
                    </label>
                    <textarea
                      rows={4}
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder="الصق قائمة كلماتك هنا كما هي (إنجليزي أو فرنسي أو غيره) وسيحتفظ AI بنفس لغة كلماتك مع ترجمتها العربية وجمل أمثلة وصور توضيحية..."
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs leading-relaxed outline-none focus:border-emerald-600 transition-colors resize-none"
                    />

                    {/* Quick Topic Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        '10 كلمات إنجليزي عن السفر والمطار',
                        '10 كلمات إنجليزي أكاديمية مهمة',
                        '10 كلمات فرنساوي عن الطعام والمشروبات',
                        '10 كلمات فرنساوي عن المدرسة',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setAiInputText(suggestion)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--muted)] hover:bg-emerald-600/15 border border-[var(--border)] transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Image Upload for Textbook/Notes */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {!aiImage ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border)] hover:border-emerald-600 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center justify-center gap-2 transition-colors"
                      >
                        <Upload size={15} />
                        <span>أو ارفع صورة لصفحة كتاب / ملزمة لاستخراج الكلمات منها تلقائياً</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                        <span className="truncate font-medium">📷 {aiImage.name}</span>
                        <button
                          type="button"
                          onClick={() => setAiImage(null)}
                          className="text-red-500 hover:underline px-2 py-0.5 text-xs whitespace-nowrap"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    )}
                  </div>

                  {aiError && (
                    <div className="p-3 rounded-xl bg-[var(--wrong-bg)] border border-[var(--wrong-border)] text-[var(--wrong-text)] text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={isAnalyzing}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جاري تحليل جميع الكلمات وتجهيز الأمثلة والصور...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>تحليل الكلمات بالذكاء الاصطناعي</span>
                      </>
                    )}
                  </button>

                  {/* Analyzed Preview Results */}
                  {analyzedPreview.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          تم استخراج وتحليل {analyzedPreview.length} كلمة:
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnalyzedPreview([])}
                          className="text-[11px] text-[var(--muted-foreground)] hover:underline"
                        >
                          مسح النتائج
                        </button>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {analyzedPreview.map((item, idx) => {
                          const gInfo = getGenderInfo(item.g);
                          return (
                            <div
                              key={`${item.fr}-${idx}`}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono tabular-nums text-[var(--muted-foreground)] w-5 text-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: gInfo.color }}
                                />
                                <span className="font-bold truncate" dir="ltr">
                                  {item.fr}
                                </span>
                                <span className="text-[var(--muted-foreground)]">·</span>
                                <span className="truncate">{item.ar}</span>
                                <span className="text-[10px] text-[var(--muted-foreground)] hidden sm:inline">
                                  · {gInfo.label}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePreviewItem(idx)}
                                className="p-1 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                                aria-label="حذف"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => applyAnalyzedWords('append')}
                          className="py-2.5 px-3 rounded-xl bg-[var(--correct-bg)] border border-[var(--correct-border)] text-[var(--correct-text)] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                        >
                          <Plus size={15} />
                          <span>إضافة للكلمات الحالية (+{analyzedPreview.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyAnalyzedWords('replace')}
                          className="py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-800 transition-colors"
                        >
                          <Check size={15} />
                          <span>مسح القديم واعتماد هذه فقط</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : managerTab === 'list' ? (
                /* Tab 2: Manage Current Words */
                <div className="space-y-4">
                  {/* Bulk Actions: Delete All or Restore Default */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                    {!confirmClearAll ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClearAll(true);
                          setConfirmRestoreDefaults(false);
                        }}
                        disabled={targetLessonWords.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--wrong-bg)] border border-[var(--wrong-border)] text-[var(--wrong-text)] text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        <Trash2 size={14} />
                        <span>
                          مسح كلمات درس {targetEditLesson} ({targetLessonWords.length})
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--wrong-text)]">
                          مسح الكل نهائياً؟
                        </span>
                        <button
                          type="button"
                          onClick={handleDeleteAllWords}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                        >
                          نعم، امسح الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}

                    {!confirmRestoreDefaults ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRestoreDefaults(true);
                          setConfirmClearAll(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)] transition-colors"
                      >
                        <RotateCcw size={14} />
                        <span>استعادة الكلمات الأصلية</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRestoreDefaults}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                        >
                          تأكيد الاستعادة ({allData.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreDefaults(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Manual Single-Word Add */}
                  <form
                    onSubmit={handleManualAdd}
                    className="p-3 rounded-xl border border-[var(--border)] space-y-2.5"
                  >
                    <div className="text-xs font-semibold">إضافة كلمة سريعة يدوياً:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={manualFr}
                        onChange={(e) => setManualFr(e.target.value)}
                        placeholder="الكلمة (مثال: book أو le livre)"
                        className="border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                      />
                      <input
                        type="text"
                        value={manualAr}
                        onChange={(e) => setManualAr(e.target.value)}
                        placeholder="المعنى بالعربية (الكتاب)"
                        className="border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={manualGender}
                        onChange={(e) => setManualGender(e.target.value as Gender)}
                        className="border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                      >
                        <option value="n">اسم (Noun)</option>
                        <option value="v">فعل (Verb)</option>
                        <option value="adj">صفة (Adj)</option>
                        <option value="m">مذكر (m)</option>
                        <option value="f">مؤنث (f)</option>
                        <option value="pl">جمع (pl)</option>
                      </select>
                      <input
                        type="text"
                        value={manualCat}
                        onChange={(e) => setManualCat(e.target.value)}
                        placeholder="التصنيف"
                        className="flex-1 border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus size={14} />
                        <span>إضافة</span>
                      </button>
                    </div>
                  </form>

                  {/* Search & Word List */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث في الكلمات الحالية..."
                        className="w-full border border-[var(--border)] rounded-xl pr-9 pl-3 py-2 text-xs bg-[var(--muted)] outline-none"
                      />
                    </div>

                    {filteredMasterWords.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
                        {targetLessonWords.length === 0
                          ? `قائمة (درس ${targetEditLesson}) فارغة حالياً. انتقل إلى تبويب "تحليل بـ AI" لإضافة كلماتك الجديدة!`
                          : 'لا توجد كلمات مطابقة للبحث.'}
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl">
                        {filteredMasterWords.map((item, idx) => {
                          const gInfo = getGenderInfo(item.g);
                          const isFav = Boolean(favorites[item.fr]);
                          const isEditingThis = editingWordFr === item.fr;
                          return (
                            <div
                              key={`${item.fr}-${idx}`}
                              className="px-3 py-2.5 text-xs hover:bg-[var(--muted)] transition-colors"
                            >
                              {isEditingThis ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      dir="ltr"
                                      value={editWordFrVal}
                                      onChange={(e) => setEditWordFrVal(e.target.value)}
                                      className="border border-emerald-600 rounded-lg px-2 py-1 text-xs bg-[var(--card)] font-bold outline-none"
                                      placeholder="الكلمة"
                                    />
                                    <input
                                      type="text"
                                      value={editWordArVal}
                                      onChange={(e) => setEditWordArVal(e.target.value)}
                                      className="border border-emerald-600 rounded-lg px-2 py-1 text-xs bg-[var(--card)] outline-none"
                                      placeholder="المعنى بالعربية"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <select
                                      value={editWordGenderVal}
                                      onChange={(e) => setEditWordGenderVal(e.target.value as Gender)}
                                      className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs bg-[var(--card)] outline-none"
                                    >
                                      <option value="n">اسم (Noun)</option>
                                      <option value="v">فعل (Verb)</option>
                                      <option value="adj">صفة (Adj)</option>
                                      <option value="m">مذكر (m)</option>
                                      <option value="f">مؤنث (f)</option>
                                      <option value="pl">جمع (pl)</option>
                                    </select>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => saveEditedWord(item.fr)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-xs"
                                      >
                                        حفظ التعديل
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingWordFr(null)}
                                        className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: gInfo.color }}
                                    />
                                    <span className="font-bold truncate" dir="ltr">
                                      {item.fr}
                                    </span>
                                    <span className="text-[var(--muted-foreground)]">·</span>
                                    <span className="truncate">{item.ar}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => startEditWord(item)}
                                      className="p-1.5 text-[var(--muted-foreground)] hover:text-emerald-600 rounded-lg transition-colors"
                                      aria-label={`تعديل ${item.fr}`}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => toggleFavorite(item.fr, e)}
                                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                      aria-label={
                                        isFav
                                          ? `إزالة ${item.fr} من المفضلة`
                                          : `إضافة ${item.fr} للمفضلة`
                                      }
                                    >
                                      <Heart
                                        size={14}
                                        className={
                                          isFav
                                            ? 'fill-rose-500 text-rose-500'
                                            : 'text-[var(--muted-foreground)]'
                                        }
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSingleWord(item.fr)}
                                      className="p-1.5 text-[var(--muted-foreground)] hover:text-red-600 rounded-lg transition-colors"
                                      aria-label={`حذف ${item.fr}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : managerTab === 'favorites' ? (
                /* Tab 3: Dedicated Favorites List */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                    <div className="text-xs">
                      <span className="font-semibold">الكلمات المحفوظة في المفضلة: </span>
                      <span className="tabular-nums font-bold">{favoriteWordsList.length}</span>
                    </div>
                    {favoriteWordsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          switchStudyMode('favorites');
                          setShowManager(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Heart size={13} className="fill-white" />
                        <span>مراجعة المفضلة الآن</span>
                      </button>
                    )}
                  </div>

                  {favoriteWordsList.length === 0 ? (
                    <div className="text-center py-10 px-4 space-y-2">
                      <Heart
                        size={32}
                        className="mx-auto text-[var(--muted-foreground)] opacity-40"
                      />
                      <div className="text-sm font-bold">لا توجد كلمات في المفضلة بعد</div>
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                        اضغط على أيقونة القلب الموجودة أعلى يسار الكارت لحفظ الكلمات الصعبة ومراجعتها هنا في أي وقت.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl">
                      {favoriteWordsList.map((item, idx) => {
                        const gInfo = getGenderInfo(item.g);
                        const isEditingFav = editingWordFr === item.fr;
                        return (
                          <div
                            key={`${item.fr}-${idx}`}
                            className="px-3 py-2.5 text-xs hover:bg-[var(--muted)] transition-colors"
                          >
                            {isEditingFav ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    dir="ltr"
                                    value={editWordFrVal}
                                    onChange={(e) => setEditWordFrVal(e.target.value)}
                                    className="border border-emerald-600 rounded-lg px-2 py-1 text-xs bg-[var(--card)] font-bold outline-none"
                                    placeholder="الكلمة"
                                  />
                                  <input
                                    type="text"
                                    value={editWordArVal}
                                    onChange={(e) => setEditWordArVal(e.target.value)}
                                    className="border border-emerald-600 rounded-lg px-2 py-1 text-xs bg-[var(--card)] outline-none"
                                    placeholder="المعنى بالعربية"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => saveEditedWord(item.fr)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-xs"
                                  >
                                    حفظ التعديل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingWordFr(null)}
                                    className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: gInfo.color }}
                                  />
                                  <span className="font-bold truncate" dir="ltr">
                                    {item.fr}
                                  </span>
                                  <span className="text-[var(--muted-foreground)]">·</span>
                                  <span className="truncate">{item.ar}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEditWord(item)}
                                    className="p-1.5 text-[var(--muted-foreground)] hover:text-emerald-600 rounded-lg transition-colors"
                                    aria-label={`تعديل ${item.fr}`}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => speakWord(item, 0.9, e)}
                                    className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors"
                                    aria-label={`نطق ${item.fr}`}
                                  >
                                    <Volume2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(item.fr, e)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    aria-label={`إزالة ${item.fr} من المفضلة`}
                                  >
                                    <Heart size={14} className="fill-rose-500" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : managerTab === 'stats' ? (
                /* Tab 4: Dedicated 7-Day Statistics & Weak Words Overview */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <BarChart3 size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span>إحصائيات الكلمات المتعلمة (آخر 7 أيام)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-bold">
                          اليوم: {learnedTodayCount} كلمة
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] font-semibold">
                          إجمالي 7 أيام: {totalLearnedLast7Days}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-44" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={last7DaysChartData}
                          margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                          <XAxis
                            dataKey="dayLabel"
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              borderColor: 'var(--border)',
                              borderRadius: '12px',
                              fontSize: '12px',
                              textAlign: 'right',
                              direction: 'rtl',
                            }}
                            formatter={(value: number) => [`${value} كلمة`, 'تم تعلمها']}
                            labelFormatter={(_label, payload) =>
                              payload?.[0]?.payload?.fullLabel || String(_label)
                            }
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                            {last7DaysChartData.map((entry, index) => (
                              <Cell
                                key={`cell-mgr-${index}`}
                                fill={entry.isToday ? '#059669' : '#10b981'}
                                fillOpacity={entry.isToday ? 1 : 0.65}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 5: Cloud Synchronization & Backup Export / Import */
                <div className="space-y-4">
                  {/* Cloud Synchronization Section */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-transparent border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                          <Cloud size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                            الحفظ السحابي التلقائي (Firebase Cloud)
                          </h3>
                          <p className="text-[11px] text-[var(--muted-foreground)]">
                            حفظ جميع كلماتك والـ 30 درساً وتقدمك لعدم فقدانها أبداً
                          </p>
                        </div>
                      </div>
                      {currentUser && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>متصل</span>
                        </span>
                      )}
                    </div>

                    {currentUser ? (
                      /* Authenticated state */
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {currentUser.photoURL ? (
                              <img
                                src={currentUser.photoURL}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-[var(--border)] shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                                {currentUser.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold truncate text-[11px]">
                                {currentUser.displayName || 'مستخدم مسجل'}
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)] truncate" dir="ltr">
                                {currentUser.email}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 font-medium"
                          >
                            <LogOut size={12} />
                            <span>خروج</span>
                          </button>
                        </div>

                        {lastCloudSyncTime && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <ShieldCheck size={12} />
                            <span>
                              آخر مزامنة سحابية:{' '}
                              {new Date(lastCloudSyncTime).toLocaleDateString('ar-EG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSyncToCloud()}
                            disabled={isSyncingCloud}
                            className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            {isSyncingCloud ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CloudUpload size={14} />
                            )}
                            <span>مزامنة ورفع إلى السحابة الآن</span>
                          </button>

                          <button
                            type="button"
                            onClick={handlePullFromCloud}
                            disabled={isSyncingCloud}
                            className="py-2.5 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {isSyncingCloud ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CloudDownload size={14} />
                            )}
                            <span>استرجاع وتحديث من السحابة</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Guest state */
                      <div className="space-y-3 pt-1">
                        <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                          هل ترغب في فتح كلماتك من الموبايل أو أي كمبيوتر آخر؟ سجّل دخولك بحساب Google ليتم حفظ كل كلماتك ودروسك وإحصائياتك تلقائياً على خوادم سحابية آمنة.
                        </p>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={isSyncingCloud}
                          className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          {isSyncingCloud ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <LogIn size={14} />
                          )}
                          <span>تسجيل الدخول بـ Google وحفظ كلماتي بالسحابة</span>
                        </button>
                      </div>
                    )}

                    {cloudSyncMessage && (
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-800 dark:text-sky-200 text-[11px] font-medium flex items-center gap-1.5">
                        <Cloud size={13} className="shrink-0" />
                        <span>{cloudSyncMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Local Backup Section */}
                  <div className="p-3.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-xs space-y-1.5">
                    <div className="font-bold text-[var(--foreground)]">
                      💾 أو تحميل نسخة احتياطية محلية (.json)
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                      يمكنك أيضاً تحميل ملف احتياطي كنسخة يدوية أو نسخ الكود لحفظه في ملاحظاتك.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download size={14} />
                      <span>تحميل ملف النسخة الاحتياطية</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyBackup}
                      className="py-2.5 px-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:brightness-95 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Copy size={14} />
                      <span>نسخ كود النسخة الاحتياطية</span>
                    </button>
                  </div>

                  <div>
                    <input
                      ref={backupFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleBackupFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border)] hover:border-emerald-600 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload size={14} />
                      <span>استرجاع الدروس من ملف نسخة احتياطية (.json)</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <label className="block text-xs font-semibold">
                      أو الصق كود النسخة الاحتياطية هنا لاسترجاع دروسك:
                    </label>
                    <textarea
                      rows={4}
                      dir="ltr"
                      value={backupJsonText}
                      onChange={(e) => setBackupJsonText(e.target.value)}
                      placeholder='{"version":1,"lessonsMap":...}'
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-2.5 text-[11px] font-mono outline-none focus:border-emerald-600 resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => applyBackupString(backupJsonText)}
                      disabled={!backupJsonText.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                    >
                      استرجاع البيانات من الكود الملصق
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty Deck State */}
      {queue.length === 0 ? (
        studyFilter === 'favorites' && masterWords.length > 0 ? (
          <div className="flex flex-col items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full p-8 text-center gap-4 my-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart size={28} />
            </div>
            <h2 className="text-xl font-bold">قائمة المفضلة فارغة حالياً</h2>
            <p className="text-xs text-[var(--muted-foreground)] max-w-xs leading-relaxed">
              أثناء مراجعة الكروت، اضغط على أيقونة القلب في أعلى الكارت لحفظ الكلمات الصعبة هنا ومراجعتها لاحقاً في قائمة منفصلة.
            </p>
            <button
              onClick={() => switchStudyMode('all')}
              className="mt-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen size={15} />
              <span>العودة إلى كل الكلمات ({masterWords.length})</span>
            </button>
          </div>
        ) : studyFilter === 'weak' && masterWords.length > 0 ? (
          <div className="flex flex-col items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full p-8 text-center gap-4 my-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Target size={28} />
            </div>
            <h2 className="text-xl font-bold">لا توجد نقاط ضعف مسجلة حتى الآن! 🎉</h2>
            <p className="text-xs text-[var(--muted-foreground)] max-w-xs leading-relaxed">
              أي كلمة تخطئ فيها أثناء المراحل الثلاث سيتم تجميعها هنا تلقائياً مع عدد مرات الخطأ لتتمكن من التركيز عليها وإتقانها.
            </p>
            <button
              onClick={() => switchStudyMode('all')}
              className="mt-2 bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen size={15} />
              <span>العودة إلى كل الكلمات ({masterWords.length})</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full p-8 text-center gap-4 my-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles size={28} />
            </div>
            <h2 className="text-xl font-bold">
              {typeof selectedLessonScope === 'number'
                ? `درس ${selectedLessonScope} فارغ — جاهز لإضافة الكلمات الجديدة!`
                : `اليوم ${selectedDay}: أضف الكلمات الجديدة لـ (درس ${selectedDay})`}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] max-w-xs leading-relaxed">
              {typeof selectedLessonScope === 'number'
                ? `تم تفريغ الشاشة لك! أضف الآن كلمات (درس ${selectedLessonScope}) الجديدة بالذكاء الاصطناعي.`
                : previousReviewWordsCount > 0
                ? `تم حفظ كلمات الدروس السابقة (${previousReviewLessonsToday
                    .map((l) => `درس ${l}`)
                    .join(' + ')}) للمراجعة ✅. أضف الآن الكلمات الجديدة الخاصة بـ (درس ${selectedDay}) ليبدأ اليوم ${selectedDay}!`
                : `أضف الآن الكلمات الجديدة الخاصة بـ (درس ${selectedDay}) بالذكاء الاصطناعي لبدء مذاكرة اليوم ${selectedDay}!`}
            </p>
            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={() => {
                  setTargetEditLesson(
                    typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay
                  );
                  setManagerTab('ai');
                  setShowManager(true);
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Sparkles size={15} />
                <span>
                  + إضافة الكلمات الجديدة لـ (درس{' '}
                  {typeof selectedLessonScope === 'number' ? selectedLessonScope : selectedDay}) بـ AI
                </span>
              </button>

              {previousReviewWordsCount > 0 && previousReviewLessonsToday.length > 0 && (
                <button
                  onClick={() =>
                    applySpacedSelection(selectedDay, spacedSystem, previousReviewLessonsToday[0])
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:brightness-95 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>
                    أو مراجعة ({previousReviewLessonsToday.map((l) => `درس ${l}`).join(' + ')}) فقط الآن
                  </span>
                </button>
              )}
            </div>
          </div>
        )
      ) : isFinished ? (
        /* Simplified & Decluttered Finished Round View */
        (() => {
          const activeDeck = getActiveDeckSource();
          const activeDeckTotal = activeDeck.length;
          const retryDeckCount = wrongList.length + skippedList.length;
          const isHundredPercent =
            retryDeckCount === 0 && skippedCount === 0 && correctCount === queue.length;
          const roundPercentage = isHundredPercent
            ? 100
            : Math.min(99, Math.round((correctCount / Math.max(1, queue.length)) * 100));

          return (
            <div className="flex flex-col items-center bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-xl mx-auto p-6 sm:p-8 text-center gap-4 shadow-sm my-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 bg-[var(--muted)]/70 border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center gap-3.5 text-right">
                  <div className="text-4xl sm:text-5xl shrink-0">
                    {isHundredPercent ? '🏆' : roundPercentage >= 50 ? '💪' : '🔁'}
                  </div>
                  <div>
                    <h2
                      className={`text-base sm:text-xl font-extrabold ${
                        isHundredPercent ? 'text-[var(--correct-text)]' : ''
                      }`}
                    >
                      {stage === 'flashcards'
                        ? isHundredPercent
                          ? 'ممتاز! جبت 100% في فلاش كارت الكلمات!'
                          : 'أنهيت جولة الكلمات — لم تصل إلى 100% بعد'
                        : stage === 'quiz'
                        ? isHundredPercent
                          ? 'رائع! جبت 100% في فلاش كارت الجمل!'
                          : 'أنهيت جولة فلاش كارت الجمل — لم تصل إلى 100% بعد'
                        : isHundredPercent
                        ? 'مبروك التخرج! أتقنت المراحل الثلاث!'
                        : 'أنهيت جولة كتابة الكلمات!'}
                    </h2>
                    <div className="tabular-nums text-xs text-[var(--muted-foreground)] mt-1">
                      {isHundredPercent && isRetryRound ? (
                        <>
                          أتقنت جميع الكلمات بالكامل: <b>{activeDeckTotal}</b> من{' '}
                          <b>{activeDeckTotal}</b>
                        </>
                      ) : (
                        <>
                          نتيجة هذه الجولة: صح <b>{correctCount}</b> من <b>{queue.length}</b>
                          {wrongList.length > 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              {' '}
                              • خطأ {wrongList.length}
                            </span>
                          )}
                          {skippedCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {' '}
                              • تخطي (Skip) {skippedCount}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-[var(--muted-foreground)]">
                      نسبة الجولة
                    </div>
                    <div
                      className={`text-3xl font-extrabold tabular-nums ${
                        isHundredPercent
                          ? 'text-[var(--correct-text)]'
                          : roundPercentage >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[var(--wrong-text)]'
                      }`}
                    >
                      {roundPercentage}%
                    </div>
                  </div>
                </div>
              </div>

              {!isHundredPercent ? (
                <div className="w-full mt-1">
                  <button
                    onClick={restartRetry}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <RotateCcw size={16} />
                    <span>
                      مراجعة كل الخاطئ والمتخطى معاً ({retryDeckCount}) للوصول إلى 100%
                    </span>
                  </button>
                </div>
              ) : selectedLessonScope === 'review_old' ? (
                <div className="w-full space-y-3 mt-1">
                  <div className="p-3 rounded-xl bg-[var(--correct-bg)] border border-[var(--correct-border)] text-[var(--correct-text)] text-xs font-bold leading-relaxed flex items-center justify-center gap-1.5">
                    <Check size={16} className="shrink-0" />
                    <span>
                      تم إنهاء مراجعة الدروس السابقة واحتساب (اليوم {selectedDay}) مكتملاً! (
                      {completedDaysCount} / 31)
                    </span>
                  </div>

                  {selectedDay < 30 ? (
                    <button
                      onClick={startNextDayAndAddNewWords}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Plus size={16} />
                      <span>
                        ابدأ اليوم {selectedDay + 1} وأضف كلمات (درس {selectedDay + 1}) الجديدة
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={resetAll}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <RotateCcw size={16} />
                      <span>إعادة جولة المراجعة السريعة</span>
                    </button>
                  )}
                </div>
              ) : stage === 'flashcards' ? (
                <div className="w-full space-y-3 mt-1">
                  <button
                    onClick={() => switchStage('quiz', undefined, true)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <BookOpen size={16} />
                    <span>ابدأ المرحلة 2 الآن: فلاش كارت الجمل ({activeDeckTotal})</span>
                  </button>
                </div>
              ) : stage === 'quiz' ? (
                <div className="w-full space-y-3 mt-1">
                  <button
                    onClick={() => switchStage('writing', undefined, true)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <PenTool size={16} />
                    <span>ابدأ المرحلة 3 الآن: كتابة الكلمات ({activeDeckTotal})</span>
                  </button>
                </div>
              ) : (
                /* Finished Stage 3 (Writing) at 100% */
                <div className="w-full space-y-2.5 mt-1">
                  {previousReviewWordsCount > 0 && !completedDays[selectedDay] ? (
                    <button
                      onClick={() => applySpacedSelection(selectedDay, spacedSystem, 'review_old')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <RotateCcw size={16} />
                      <span>
                        ابدأ الخطوة 2: المراجعة السريعة للدروس السابقة ({previousReviewWordsCount}{' '}
                        كلمة)
                      </span>
                    </button>
                  ) : selectedDay < 30 ? (
                    <button
                      onClick={startNextDayAndAddNewWords}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Plus size={16} />
                      <span>
                        ابدأ اليوم {selectedDay + 1} وأضف كلمات (درس {selectedDay + 1}) الجديدة
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={resetAll}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <RotateCcw size={16} />
                      <span>إعادة مراجعة نفس الكلمات</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        /* ==========================================
           ACTIVE STUDY WORKSPACE (2-Column on Desktop, Sleek Compact on Mobile)
           ========================================== */
        (() => {
          const activeDeck = getActiveDeckSource();
          const activeDeckTotal = activeDeck.length;
          const liveStages: { key: StudyStage; label: string }[] = [
            { key: 'flashcards', label: '1. الكلمات' },
            { key: 'quiz', label: '2. الجمل' },
            { key: 'writing', label: '3. الكتابة' },
          ];
          const liveStageStats = liveStages.map((st) => {
            const map = stageOutcomes[st.key] || {};
            let c = 0;
            let w = 0;
            let s = 0;
            activeDeck.forEach((card) => {
              const out = map[card.fr];
              if (out === 'correct') c++;
              else if (out === 'wrong') w++;
              else if (out === 'skipped') s++;
            });
            const pct = Math.round((c / Math.max(1, activeDeckTotal)) * 100);
            return { ...st, correct: c, wrong: w, skipped: s, pct };
          });
          const liveTotalCorrect = liveStageStats.reduce((acc, st) => acc + st.correct, 0);
          const liveTotalPossible = Math.max(1, activeDeckTotal * 3);
          const liveComprehensivePct = Math.round((liveTotalCorrect / liveTotalPossible) * 100);

          const cardStatusGlow =
            answerEffect === 'correct'
              ? 'ring-4 ring-emerald-400 border-emerald-500 shadow-2xl shadow-emerald-500/35'
              : answerEffect === 'wrong'
              ? 'ring-4 ring-rose-500 border-rose-600 shadow-2xl shadow-rose-600/40'
              : currentAnswer === 'correct'
              ? 'ring-2 ring-emerald-500/70 border-emerald-500/60 shadow-emerald-500/10'
              : currentAnswer === 'wrong'
              ? 'ring-2 ring-rose-500/70 border-rose-500/60 shadow-rose-500/10'
              : currentAnswer === 'skipped'
              ? 'ring-2 ring-amber-500/70 border-amber-500/60 shadow-amber-500/10'
              : 'border-[var(--border)]';

          const cardKineticAnimation =
            answerEffect === 'correct'
              ? {
                  scale: [1, 1.055, 0.99, 1],
                  y: [0, -14, 0],
                  rotateZ: [0, 1.2, -1.2, 0],
                }
              : isShaking || answerEffect === 'wrong'
              ? {
                  x: [0, -18, 18, -14, 14, -9, 9, -4, 4, 0],
                  y: [0, 8, -3, 5, 0],
                  rotateZ: [0, -3.8, 3.8, -2.5, 2.5, -1.2, 1.2, 0],
                  scale: [1, 0.94, 0.97, 1],
                }
              : { x: 0, y: 0, rotateZ: 0, scale: 1 };

          const renderCardFeedbackOverlay = () => (
            <AnimatePresence>
              {answerEffect === 'correct' && (
                <motion.div
                  key={`effect-correct-${answerEffectKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-none absolute inset-0 z-30 rounded-3xl overflow-hidden flex items-center justify-center"
                >
                  {/* Luminous Emerald-Gold Flash */}
                  <motion.div
                    initial={{ opacity: 0.75 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="absolute inset-0 bg-gradient-to-br from-emerald-400/35 via-teal-300/20 to-amber-300/30"
                  />

                  {/* Radial Confetti & Sparkle Particles */}
                  {[
                    { dx: -115, dy: -85, color: '#10b981', rot: -45 },
                    { dx: 115, dy: -85, color: '#f59e0b', rot: 45 },
                    { dx: -135, dy: 10, color: '#34d399', rot: -90 },
                    { dx: 135, dy: 10, color: '#fbbf24', rot: 90 },
                    { dx: -95, dy: 95, color: '#059669', rot: -135 },
                    { dx: 95, dy: 95, color: '#14b8a6', rot: 135 },
                    { dx: 0, dy: -115, color: '#f59e0b', rot: 180 },
                    { dx: -55, dy: -105, color: '#6ee7b7', rot: -60 },
                    { dx: 55, dy: -105, color: '#fcd34d', rot: 60 },
                    { dx: -65, dy: 105, color: '#fbbf24', rot: 120 },
                    { dx: 65, dy: 105, color: '#10b981', rot: -120 },
                    { dx: 0, dy: 115, color: '#34d399', rot: 90 },
                  ].map((p, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                      animate={{
                        x: p.dx,
                        y: p.dy,
                        scale: [0, 1.35, 0.85, 0],
                        opacity: [1, 1, 0.8, 0],
                        rotate: p.rot,
                      }}
                      transition={{ duration: 0.62, ease: 'easeOut' }}
                      style={{ backgroundColor: p.color }}
                      className={`absolute ${
                        idx % 2 === 0 ? 'w-3 h-3 rounded-full' : 'w-3.5 h-2 rounded-xs'
                      } shadow-sm`}
                    />
                  ))}

                  {/* Floating Celebration Pill (Top-aligned so it never covers the card's Arabic meaning!) */}
                  <motion.div
                    initial={{ scale: 0.5, y: 12, opacity: 0 }}
                    animate={{ scale: [0.5, 1.1, 1], y: [12, 0, -6], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.68, ease: 'easeOut' }}
                    className="self-start mt-14 px-4 py-2 rounded-2xl bg-emerald-600/95 backdrop-blur-xs text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/40 border-2 border-emerald-300 flex items-center gap-2"
                  >
                    <span>
                      {currentStreak >= 5 && currentStreak % 5 === 0
                        ? `🏆 سلسلة خارقة! (${currentStreak} متتالية)`
                        : '✨ ممتاز! عرفتها +1'}
                    </span>
                    {currentStreak >= 2 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-emerald-950 text-xs font-black">
                        🔥 {currentStreak}
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {answerEffect === 'wrong' && (
                <motion.div
                  key={`effect-wrong-${answerEffectKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-none absolute inset-0 z-30 rounded-3xl overflow-hidden flex items-center justify-center"
                >
                  {/* Harsh Crimson Danger Vignette & Glitch Flash */}
                  <motion.div
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: [0.9, 0.4, 0.75, 0] }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="absolute inset-0 bg-gradient-to-b from-rose-600/45 via-red-600/20 to-rose-950/50 border-4 border-rose-500 rounded-3xl"
                  />

                  {/* Jagged Crimson Crack / Fissure SVG */}
                  <motion.svg
                    viewBox="0 0 200 200"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: [0, 0.85, 0.6, 0], scale: [0.85, 1.04, 1] }}
                    transition={{ duration: 0.62, ease: 'easeOut' }}
                    className="absolute inset-0 w-full h-full stroke-rose-500/75 fill-none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M100 10 L88 55 L112 85 L82 130 L106 165 L92 195" />
                    <path d="M88 55 L52 78 L30 72" />
                    <path d="M112 85 L152 105 L175 98" />
                    <path d="M82 130 L45 152" />
                  </motion.svg>

                  {/* Falling Red Shatter Shards */}
                  {[
                    { dx: -100, dy: 75, rot: -65 },
                    { dx: 100, dy: 75, rot: 65 },
                    { dx: -120, dy: -35, rot: -115 },
                    { dx: 120, dy: -35, rot: 115 },
                    { dx: -60, dy: 110, rot: -40 },
                    { dx: 60, dy: 110, rot: 40 },
                    { dx: -45, dy: -85, rot: -80 },
                    { dx: 45, dy: -85, rot: 80 },
                  ].map((s, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ x: 0, y: -10, scale: 0.3, opacity: 1, rotate: 0 }}
                      animate={{
                        x: s.dx,
                        y: s.dy,
                        scale: [0.3, 1.2, 0],
                        opacity: [1, 0.9, 0],
                        rotate: s.rot,
                      }}
                      transition={{ duration: 0.58, ease: 'easeIn' }}
                      className="absolute w-3 h-3 bg-rose-500 rotate-45 shadow-sm shadow-rose-900"
                    />
                  ))}

                  {/* Shaking Penalty Stamp Badge (Top-aligned so the user can still read the correct meaning underneath!) */}
                  <motion.div
                    initial={{ scale: 1.3, opacity: 0, rotate: -6 }}
                    animate={{
                      scale: [1.3, 0.95, 1.04, 1],
                      rotate: [-6, 6, -4, 4, 0],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: 0.68, ease: 'easeInOut' }}
                    className="self-start mt-14 px-4 py-2 rounded-2xl bg-rose-600/95 backdrop-blur-xs text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-rose-900/50 border-2 border-rose-300 flex flex-col items-center gap-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>💥 غلطة! ستُعاد في التصفية</span>
                    </div>
                    {brokenStreakCount >= 2 && (
                      <span className="text-[11px] font-bold text-rose-100">
                        💔 ضاعت سلسلة {brokenStreakCount} إجابات متتالية!
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          );

          return (
            <div
              className={`w-full ${
                focusMode
                  ? 'flex flex-col my-auto'
                  : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'
              }`}
            >
              {/* Full-Screen Viewport Aura / Danger Vignette */}
              <AnimatePresence>
                {answerEffect === 'correct' && (
                  <motion.div
                    key={`screen-correct-${answerEffectKey}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="fixed inset-0 pointer-events-none z-40 ring-inset ring-8 ring-emerald-400/35 bg-gradient-to-t from-emerald-500/10 via-transparent to-emerald-400/10"
                  />
                )}
                {answerEffect === 'wrong' && (
                  <motion.div
                    key={`screen-wrong-${answerEffectKey}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.45, 0.85, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="fixed inset-0 pointer-events-none z-40 ring-inset ring-12 ring-rose-600/45 bg-rose-950/15"
                  />
                )}
              </AnimatePresence>

              {/* MAIN STUDY COLUMN */}
              <div
                className={`w-full flex flex-col ${
                  focusMode ? 'my-auto' : 'lg:col-span-7 xl:col-span-8'
                }`}
              >
                {/* Sleek Unified Compact Status + Timer + Interactive Progress Dots Bar */}
                {!focusMode && (
                  <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3 py-2 mb-3 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 tabular-nums overflow-x-auto no-scrollbar">
                      {/* Right: Unified Score Capsule (Single Non-Wrapping Line!) */}
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--muted)]/70 border border-[var(--border)]/60 text-xs font-extrabold whitespace-nowrap shrink-0">
                        <motion.span
                          key={`score-correct-${correctCount}`}
                          initial={{ scale: 1.35 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                          className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 whitespace-nowrap"
                          title="إجابات صحيحة"
                        >
                          <span>✓</span>
                          <span>{correctCount}</span>
                        </motion.span>
                        <span className="text-[var(--border)]">|</span>
                        <motion.span
                          key={`score-wrong-${wrongCount}`}
                          initial={{ scale: 1.35 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                          className="text-rose-500 dark:text-rose-400 inline-flex items-center gap-1 whitespace-nowrap"
                          title="إجابات خاطئة"
                        >
                          <span>✗</span>
                          <span>{wrongCount}</span>
                        </motion.span>
                        <span className="text-[var(--border)]">|</span>
                        <span
                          className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 whitespace-nowrap"
                          title="تم تخطيها"
                        >
                          <span>⏭</span>
                          <span>{skippedCount}</span>
                        </span>
                        {currentStreak >= 2 && (
                          <motion.span
                            key={`streak-${currentStreak}`}
                            initial={{ scale: 1.4 }}
                            animate={{ scale: 1 }}
                            className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-300 text-[10px] font-extrabold whitespace-nowrap"
                          >
                            🔥 {currentStreak}
                          </motion.span>
                        )}
                      </div>

                      {/* Left: Merged Card Counter + Auto-Speak Countdown + Timer (All Non-Wrapping!) */}
                      <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                        {autoSpeak5Sec && readingCountdown !== null && stage !== 'writing' && (
                          <span className="px-2 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] whitespace-nowrap shrink-0">
                            {readingCountdown > 0 ? `🔊 ${readingCountdown}ث` : '🔊 نُطقت'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowRoundDrawer(true)}
                          title="اضغط لعرض قائمة كلمات الجولة الحالية والانتقال السريع لأي كارت"
                          className="px-2.5 py-1 rounded-xl bg-[var(--muted)] hover:bg-emerald-500/15 border border-[var(--border)] text-[var(--foreground)] font-extrabold tabular-nums inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <ListChecks size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {current + 1} / {queue.length}
                          </span>
                          {round > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                              جولة {round}
                            </span>
                          )}
                        </button>
                        {stage !== 'writing' && (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold tabular-nums whitespace-nowrap shrink-0 ${
                              timerSec <= 10
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            ⏱ {timerSec}ث
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Integrated Slim Progress & Timer Bar */}
                    {stage !== 'writing' ? (
                      <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${(timerSec / TIMER_MAX) * 100}%`,
                            backgroundColor:
                              timerSec <= 10 ? '#f43f5e' : timerSec <= 20 ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${Math.round(((current + 1) / Math.max(1, queue.length)) * 100)}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Interactive Progress Dots Strip (Click any dot to jump directly to that card) */}
                    {queue.length > 1 && queue.length <= 40 && (
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                        {queue.map((item, idx) => {
                          const ans = cardAnswers[idx];
                          const isCurrent = idx === current;
                          return (
                            <button
                              id={`progress-dot-${idx}`}
                              key={`${item.fr}-dot-${idx}`}
                              type="button"
                              onClick={() => jumpToCard(idx)}
                              title={`كارت ${idx + 1}: ${item.fr}`}
                              className={`h-2 rounded-full transition-all shrink-0 ${
                                isCurrent ? 'w-6 ring-2 ring-emerald-500/40' : 'w-2 hover:w-3.5'
                              } ${
                                ans === 'correct'
                                  ? 'bg-emerald-500'
                                  : ans === 'wrong'
                                  ? 'bg-rose-500'
                                  : ans === 'skipped'
                                  ? 'bg-amber-500'
                                  : isCurrent
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {stage === 'quiz' ? (
                  /* ==========================================
                     STAGE 2: SENTENCE FLASHCARDS (3D FLIP CARD WITH INTERACTIVE LEARNED WORD)
                     ========================================== */
                  <>
                    <AnimatePresence mode="wait" custom={navDirection}>
                      <motion.div
                        key={`sentence-flashcard-${round}-${current}-${d.fr}`}
                        custom={navDirection}
                        variants={cardSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="w-full mb-3.5"
                      >
                        <motion.div
                          animate={cardKineticAnimation}
                          transition={{ duration: 0.48, ease: 'easeInOut' }}
                          className={`relative perspective-1000 w-full cursor-pointer select-none touch-pan-y ${
                            focusMode ? 'h-[400px] sm:h-[430px]' : 'h-92 sm:h-96'
                          }`}
                          onClick={() => {
                            if (isSwiping.current) return;
                            flipCard();
                          }}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          {renderCardFeedbackOverlay()}
                          <motion.div
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 260,
                              damping: 22,
                              mass: 0.85,
                            }}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="w-full h-full relative transform-style-3d rounded-3xl"
                          >
                            {/* Front of Sentence Flashcard */}
                            <div
                              className={`absolute w-full h-full backface-hidden rounded-3xl border flex flex-col justify-between p-5 sm:p-6 bg-[var(--card)] shadow-lg shadow-slate-900/5 dark:shadow-black/30 transition-shadow ${cardStatusGlow} ${
                                isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
                              }`}
                            >
                              {/* Card Top Bar: Right (Focus + Hide Challenge) | Left (Edit + Favorite) */}
                              <div className="w-full flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFocusMode((prev) => !prev);
                                    }}
                                    title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      focusMode
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)]'
                                    }`}
                                  >
                                    <Target size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHideSentenceWord((prev) => !prev);
                                      setRevealedCardWord(false);
                                    }}
                                    title={hideSentenceWord ? 'إظهار الكلمة داخل الجملة' : 'إخفاء الكلمة للتحدي'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      hideSentenceWord
                                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                                        : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                                    }`}
                                  >
                                    {hideSentenceWord ? <Eye size={16} /> : <EyeOff size={16} />}
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditWord(d);
                                        setShowQuickCardEdit(true);
                                      }}
                                      aria-label="تعديل سريع للكلمة"
                                      title="تعديل سريع للكلمة أو معناها"
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(d.fr, e)}
                                    aria-label={
                                      isCurrentFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'
                                    }
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                  >
                                    <Heart
                                      size={17}
                                      className={
                                        isCurrentFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-[var(--muted-foreground)] hover:text-rose-500'
                                      }
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Center Hero Area: Target Word Kicker + Full Sentence */}
                              <div className="flex flex-col items-center justify-center my-auto px-2">
                                <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-3 flex items-center justify-center gap-2">
                                  <span>فلاش كارت الجملة</span>
                                  {(!hideSentenceWord || revealedCardWord) && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <button
                                        type="button"
                                        onClick={(e) => speak(0.9, e)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold transition-colors"
                                        dir="ltr"
                                        title="اضغط لنطق الكلمة المستهدفة بمفردها"
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: genderInfo.color }}
                                        />
                                        <span>{d.fr}</span>
                                        <Volume2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </div>

                                <div
                                  className={`${
                                    focusMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                                  } font-bold text-center leading-relaxed tracking-normal text-[var(--foreground)] max-w-md px-2`}
                                  dir="ltr"
                                >
                                  {renderSentenceWithHighlightedWord(
                                    exampleSentence.exFr,
                                    d.fr,
                                    (e) => speak(0.9, e),
                                    hideSentenceWord && !revealedCardWord,
                                    (e) => {
                                      setRevealedCardWord(true);
                                      speak(0.9, e);
                                    }
                                  )}
                                </div>
                              </div>

                              {/* Card Bottom Dock: Sentence Audio Controls + Repeat */}
                              <div className="w-full flex items-center justify-center pt-2 border-t border-[var(--border)]/50">
                                <div className="flex items-center gap-2 justify-center">
                                  <button
                                    onClick={(e) => speakSentence(0.9, e)}
                                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                  >
                                    <Volume2 size={14} />
                                    <span>
                                      {autoSpeak5Sec && readingCountdown && readingCountdown > 0
                                        ? `نطق الجملة (${readingCountdown}ث)`
                                        : 'نطق الجملة'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={(e) => speakSentence(0.5, e)}
                                    className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs font-semibold hover:brightness-95 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Turtle size={14} /> ببطء
                                  </button>
                                  <button
                                    onClick={toggleRepeat}
                                    title={repeatActive ? 'إيقاف التكرار الصوتي' : 'تكرار صوتي تلقائي للجملة'}
                                    className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-colors ${
                                      repeatActive
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-emerald-500/40'
                                    }`}
                                  >
                                    <Repeat size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Back of Sentence Flashcard */}
                            <div
                              className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl border flex flex-col justify-between p-5 sm:p-6 shadow-lg shadow-slate-900/5 dark:shadow-black/30 overflow-hidden transition-shadow ${
                                isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
                              } ${
                                isRetryRound
                                  ? 'bg-[var(--card-back-retry)] border-amber-300/70 dark:border-amber-800'
                                  : 'bg-[var(--card-back)] border-emerald-300/70 dark:border-emerald-800'
                              } ${cardStatusGlow}`}
                            >
                              {/* Back Top Bar: Right (Focus Mode) | Left (Edit + Favorite) */}
                              <div className="w-full flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFocusMode((prev) => !prev);
                                    }}
                                    title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      focusMode
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-black/5 dark:bg-white/10 text-emerald-900/70 dark:text-emerald-100/70 hover:bg-black/10'
                                    }`}
                                  >
                                    <Target size={16} />
                                  </button>
                                  <span className="text-[11px] font-semibold text-emerald-800/70 dark:text-emerald-200/70">
                                    ترجمة الجملة
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditWord(d);
                                        setShowQuickCardEdit(true);
                                      }}
                                      aria-label="تعديل سريع للكلمة"
                                      title="تعديل سريع للكلمة أو معناها"
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/10 text-emerald-900/70 dark:text-emerald-100/70 hover:text-emerald-700 active:scale-90 transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(d.fr, e)}
                                    aria-label={
                                      isCurrentFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'
                                    }
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 active:scale-90 transition-all"
                                  >
                                    <Heart
                                      size={17}
                                      className={
                                        isCurrentFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-emerald-900/60 dark:text-emerald-100/60 hover:text-rose-500'
                                      }
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Center Content: Illustration + Sentence Arabic Translation */}
                              <div className="flex flex-col items-center justify-center my-auto px-2">
                                <div
                                  className={`relative w-full ${
                                    focusMode ? 'max-w-[200px] h-26 mb-2.5' : 'max-w-[175px] h-22 mb-2'
                                  } bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-black/5 dark:border-white/10 shadow-2xs`}
                                >
                                  <CardImage d={d} />
                                </div>

                                <div className="text-lg sm:text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 text-center leading-relaxed px-2">
                                  {exampleSentence.exAr || d.ar}
                                </div>

                                {!focusMode && h.trim() && (
                                  <div
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs font-bold max-w-[260px] truncate"
                                    title={`ملاحظتك المحفوظة: ${h}`}
                                  >
                                    <Lightbulb size={13} className="text-amber-500 shrink-0" />
                                    <span className="truncate">{h}</span>
                                  </div>
                                )}
                              </div>

                              {/* Bottom Dock: Target Word + Interactive Sentence Audio */}
                              <div className="w-full pt-2 border-t border-emerald-900/10 dark:border-white/10 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      speakText(exampleSentence.exFr || d.fr, getWordLang(d), 0.9, e)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-xs font-bold text-emerald-950 dark:text-emerald-100 transition-colors"
                                    dir="ltr"
                                    title="اضغط لنطق الجملة"
                                  >
                                    <Volume2 size={13} className="shrink-0" />
                                    <span className="truncate max-w-[230px]">
                                      {exampleSentence.exFr || d.fr}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={toggleRepeat}
                                    title={repeatActive ? 'إيقاف التكرار الصوتي' : 'تكرار صوتي تلقائي للجملة'}
                                    className={`w-7 h-7 border rounded-xl flex items-center justify-center transition-colors ${
                                      repeatActive
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-black/5 dark:bg-white/10 border-emerald-900/15 dark:border-white/15 text-emerald-950 dark:text-emerald-100 hover:bg-black/10'
                                    }`}
                                  >
                                    <Repeat size={13} />
                                  </button>
                                </div>
                                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                  الكلمة: <span dir="ltr">{d.fr}</span> = {d.ar} ({genderInfo.label})
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Feedback area */}
                    {(flipWarning || (!focusMode && currentAnswer)) && (
                      <div
                        className="text-xs sm:text-sm font-bold min-h-[22px] mb-2 text-center"
                        style={{
                          color: flipWarning
                            ? 'var(--wrong-text)'
                            : currentAnswer === 'correct'
                            ? 'var(--correct-text)'
                            : currentAnswer === 'skipped'
                            ? '#d97706'
                            : currentAnswer === 'wrong'
                            ? 'var(--wrong-text)'
                            : 'transparent',
                        }}
                      >
                        {flipWarning
                          ? flipWarning
                          : currentAnswer === 'correct'
                          ? '✓ أجبت صح — يمكنك التغيير'
                          : currentAnswer === 'skipped'
                          ? '⏭ تم التخطي (Skip) — يُحتسب في النسبة الشاملة'
                          : currentAnswer === 'wrong'
                          ? '✗ أجبت غلط — يمكنك التغيير'
                          : '...'}
                      </div>
                    )}

                    {/* Action Buttons for Stage 2 Sentence Flashcard (with Keyboard Shortcut Badges) */}
                    {!isFlipped && !answered ? (
                      <div className="flex items-center gap-2.5 w-full max-w-md mx-auto mb-3">
                        {focusMode && (
                          <button
                            type="button"
                            onClick={prevCard}
                            disabled={current === 0}
                            aria-label="السابق"
                            title="الكارت السابق"
                            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-[var(--muted)] disabled:opacity-35 transition-colors min-h-[52px]"
                          >
                            <ArrowRight size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={flipCard}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl py-3.5 px-5 text-sm font-extrabold transition-all shadow-md shadow-emerald-600/20 min-h-[52px] flex items-center justify-center gap-2"
                        >
                          <span>اقلب كارت الجملة لإظهار الترجمة</span>
                          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-white/20 font-mono">
                            Space
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 rounded-2xl py-3.5 px-4 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px] active:scale-[0.98]"
                          title="تخطي الجملة الحالية (اختصار لوحة المفاتيح: 2)"
                        >
                          <SkipForward size={16} />
                          <span>تخطي</span>
                          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 font-mono">
                            2
                          </span>
                        </button>
                        {focusMode && (
                          <button
                            type="button"
                            onClick={nextCard}
                            aria-label="التالي"
                            title="الكارت التالي"
                            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-[var(--muted)] transition-colors min-h-[52px]"
                          >
                            <ArrowLeft size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full max-w-md mx-auto mb-3 gap-2">
                        <div className="flex items-center gap-2 w-full">
                          {focusMode && (
                            <button
                              type="button"
                              onClick={prevCard}
                              disabled={current === 0}
                              aria-label="السابق"
                              title="الكارت السابق"
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-3.5 text-xs font-bold flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-35 transition-colors min-h-[52px]"
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                          {/* Action Buttons for Stage 2 Sentence Flashcard (with Keyboard Shortcut Badges) */}
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            <button
                              onClick={() => handleAnswer(true)}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px] active:scale-[0.96] ${
                                answerEffect === 'correct'
                                  ? 'bg-emerald-500 border-emerald-300 text-white scale-105 ring-4 ring-emerald-400/50 shadow-lg shadow-emerald-500/30'
                                  : currentAnswer === 'correct'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                  : 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)] hover:brightness-95'
                              }`}
                            >
                              <span>✓ عرفتها</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                1
                              </span>
                            </button>
                            <button
                              onClick={handleSkip}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-all min-h-[52px] active:scale-[0.98] ${
                                currentAnswer === 'skipped'
                                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                  : 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:brightness-95'
                              }`}
                            >
                              <SkipForward size={15} />
                              <span>تخطي</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                2
                              </span>
                            </button>
                            <button
                              onClick={() => handleAnswer(false)}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px] active:scale-[0.96] ${
                                answerEffect === 'wrong'
                                  ? 'bg-rose-600 border-rose-300 text-white scale-95 ring-4 ring-rose-500/60 shadow-lg shadow-rose-600/40'
                                  : currentAnswer === 'wrong'
                                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                  : 'bg-[var(--wrong-bg)] border-[var(--wrong-border)] text-[var(--wrong-text)] hover:brightness-95'
                              }`}
                            >
                              <span>✗ غلطت</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                3
                              </span>
                            </button>
                          </div>
                          {focusMode && (
                            <button
                              type="button"
                              onClick={nextCard}
                              aria-label="التالي"
                              title="الكارت التالي"
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-3.5 text-xs font-bold flex items-center justify-center hover:bg-[var(--muted)] transition-colors min-h-[52px]"
                            >
                              <ArrowLeft size={16} />
                            </button>
                          )}
                        </div>
                        {focusMode && answered && (
                          <button
                            type="button"
                            onClick={nextCard}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-600/35 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>الانتقال للكارت التالي</span>
                            <ArrowLeft size={14} />
                          </button>
                        )}
                      </div>
                    )}

                     {/* Bottom Navigation Controls */}
                    {!focusMode && (
                      <div className="grid grid-cols-4 gap-2 w-full max-w-md mx-auto mt-auto pt-1">
                        <button
                          onClick={prevCard}
                          disabled={current === 0}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] disabled:opacity-40 transition-colors min-h-[44px] shadow-2xs"
                        >
                          <ArrowRight size={14} /> السابق
                        </button>
                        <button
                          onClick={shuffle}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                        >
                          <Shuffle size={14} /> خلط
                        </button>
                        <button
                          onClick={() => resetAll()}
                          className={`border rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] shadow-2xs ${
                            confirmResetRound
                              ? 'bg-rose-600 border-rose-600 text-white font-bold'
                              : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          <RotateCcw size={14} /> {confirmResetRound ? 'تأكيد؟' : 'من الأول'}
                        </button>
                        <button
                          onClick={nextCard}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                        >
                          التالي <ArrowLeft size={14} />
                        </button>
                      </div>
                    )}
                  </>
                ) : stage === 'writing' ? (
                  /* ==========================================
                     STAGE 3: WRITING & DICTATION MASTERY UI
                     ========================================== */
                  (() => {
                    const structureHint = getWordStructureMask(d.fr);
                    return (
                      <>
                        {/* Writing Prompt Card */}
                        <AnimatePresence mode="wait" custom={navDirection}>
                          <motion.div
                            key={`writing-${round}-${current}-${d.fr}`}
                            custom={navDirection}
                            variants={cardSlideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="w-full mb-3.5"
                          >
                            <motion.div
                              animate={cardKineticAnimation}
                              transition={{ duration: 0.48, ease: 'easeInOut' }}
                              className={`w-full bg-[var(--card)] border rounded-3xl p-5 sm:p-6 shadow-md shadow-slate-900/5 dark:shadow-black/30 relative overflow-hidden transition-shadow ${cardStatusGlow}`}
                            >
                              {renderCardFeedbackOverlay()}
                              {/* Unified Top Bar for Stage 3: Right (Focus + Note + Audio Dictation) | Left (Edit + Favorite) */}
                              <div className="w-full flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setFocusMode((prev) => !prev)}
                                    title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      focusMode
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)]'
                                    }`}
                                  >
                                    <Target size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDictationAudioOnly(!dictationAudioOnly)}
                                    className={`h-9 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                                      dictationAudioOnly
                                        ? 'bg-emerald-600/15 border border-emerald-600/40 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                                    }`}
                                  >
                                    {dictationAudioOnly ? <EyeOff size={14} /> : <Eye size={14} />}
                                    <span>
                                      {dictationAudioOnly ? 'إملاء سمعي (مخفي)' : 'إملاء سمعي 🎧'}
                                    </span>
                                  </button>
                                  {!focusMode && h.trim() && (
                                    <span
                                      className="h-9 px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 max-w-[110px] truncate"
                                      title={`ملاحظتك المحفوظة: ${h}`}
                                    >
                                      <Lightbulb size={13} className="text-amber-500 shrink-0" />
                                      <span className="truncate">{h}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditWord(d);
                                        setShowQuickCardEdit(true);
                                      }}
                                      aria-label="تعديل سريع للكلمة"
                                      title="تعديل سريع للكلمة أو معناها"
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(d.fr, e)}
                                    aria-label={
                                      isCurrentFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'
                                    }
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                  >
                                    <Heart
                                      size={17}
                                      className={
                                        isCurrentFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-[var(--muted-foreground)] hover:text-rose-500'
                                      }
                                    />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col items-center text-center">
                                {!dictationAudioOnly || writingStatus !== 'idle' ? (
                                  <>
                                    <div className="relative w-36 h-24 mb-2 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/10 shadow-2xs">
                                      <CardImage d={d} />
                                    </div>

                                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mb-1.5">
                                      {d.ar}
                                    </div>
                                  </>
                                ) : (
                                  <div className="my-3 px-4 py-3 rounded-2xl bg-[var(--muted)] border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                                    🎧 استمع للكلمة بالصوت واكتبها في المربع أدناه!
                                  </div>
                                )}

                                {/* Interactive Live Letter-Structure Slots */}
                                {structureHint.mask && writingStatus === 'idle' && (
                                  <div className="mb-2.5 w-full flex flex-col items-center">
                                    <div className="text-[10px] text-[var(--muted-foreground)] mb-0.5 tabular-nums">
                                      مربعات الحروف التفاعلية ({structureHint.letterCount} حروف):
                                    </div>
                                    {renderInteractiveLetterSlots(d.fr, writingInput)}
                                  </div>
                                )}

                                <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)] mb-3">
                                  <span className="px-2.5 py-1 rounded-xl bg-[var(--muted)]/70 border border-[var(--border)]/60 flex items-center gap-1.5 font-bold">
                                    <span
                                      className="w-2 h-2 rounded-full inline-block"
                                      style={{ backgroundColor: genderInfo.color }}
                                    />
                                    <span style={{ color: genderInfo.color }}>{genderInfo.label}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => speak(0.9, e)}
                                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 rounded-xl px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                  >
                                    <Volume2 size={14} /> اسمع الكلمة
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => speak(0.45, e)}
                                    className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-semibold hover:brightness-95 flex items-center gap-1 text-[var(--foreground)] transition-colors"
                                  >
                                    <Turtle size={14} /> ببطء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={toggleRepeat}
                                    title={repeatActive ? 'إيقاف التكرار الصوتي' : 'تكرار صوتي تلقائي'}
                                    className={`w-8 h-8 border rounded-xl flex items-center justify-center transition-colors ${
                                      repeatActive
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-emerald-500/40'
                                    }`}
                                  >
                                    <Repeat size={14} />
                                  </button>
                                </div>

                                {/* Writing Form */}
                                <form onSubmit={handleWritingSubmit} className="w-full space-y-2.5">
                                  <input
                                    ref={writingInputRef}
                                    type="text"
                                    dir="ltr"
                                    value={writingInput}
                                    onChange={(e) => setWritingInput(e.target.value)}
                                    disabled={writingStatus !== 'idle'}
                                    placeholder="اكتب الكلمة هنا..."
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    className={`w-full text-center text-base font-bold rounded-xl px-4 py-3 border-2 outline-none transition-colors ${
                                      writingStatus === 'correct'
                                        ? 'border-green-600 bg-[var(--correct-bg)] text-[var(--correct-text)]'
                                        : writingStatus === 'wrong'
                                        ? 'border-red-500 bg-[var(--wrong-bg)] text-[var(--wrong-text)]'
                                        : 'border-[var(--border)] bg-[var(--muted)] focus:border-emerald-600'
                                    }`}
                                  />

                                  {/* French Accent & Article Helper Bar */}
                                  {isCurrentFrench && writingStatus === 'idle' && (
                                    <div className="flex flex-wrap gap-1 justify-center" dir="ltr">
                                      {[
                                        'le ',
                                        'la ',
                                        "l'",
                                        'les ',
                                        'un ',
                                        'une ',
                                        'é',
                                        'è',
                                        'ê',
                                        'à',
                                        'ç',
                                      ].map((ch) => (
                                        <button
                                          key={ch}
                                          type="button"
                                          onClick={() => insertSpecialChar(ch)}
                                          className="px-2 py-1 text-xs font-medium rounded-lg bg-[var(--muted)] hover:bg-emerald-600/15 border border-[var(--border)] transition-colors"
                                        >
                                          {ch.trim() || ch}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Answer Feedback & Example Sentence Reveal */}
                                  {writingStatus !== 'idle' && (
                                    <div
                                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                        writingStatus === 'correct'
                                          ? 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)]'
                                          : 'bg-[var(--wrong-bg)] border-[var(--wrong-border)] text-[var(--wrong-text)]'
                                      }`}
                                    >
                                      <div className="font-bold text-sm">
                                        {writingStatus === 'correct' ? (
                                          <span>✓ ممتاز! إجابة صحيحة: </span>
                                        ) : (
                                          <span>✗ الإجابة الصحيحة هي: </span>
                                        )}
                                        <span dir="ltr" className="underline underline-offset-4">
                                          {d.fr}
                                        </span>
                                      </div>

                                      {writingStatus === 'wrong' &&
                                        writingInput.trim() &&
                                        renderCharacterDiff(writingInput, d.fr)}

                                      {writingStatus === 'correct' &&
                                        getSmartWritingFeedbackNote(writingInput, d.fr) && (
                                          <div className="text-[11px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-2.5 py-1.5 rounded-lg">
                                            {getSmartWritingFeedbackNote(writingInput, d.fr)}
                                          </div>
                                        )}

                                      {studyFilter === 'weak' &&
                                        writingStatus === 'correct' &&
                                        weakWords[d.fr] && (
                                          <button
                                            type="button"
                                            onClick={(e) => removeWeakWord(d.fr, e)}
                                            className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors"
                                          >
                                            <Check size={11} />
                                            <span>أتقنتها! إزالة من نقاط الضعف</span>
                                          </button>
                                        )}

                                      {exampleSentence.exFr && (
                                        <div className="pt-1 border-t border-current/15 text-[11px] opacity-90 space-y-0.5">
                                          <div
                                            className="font-medium flex items-center justify-center gap-1.5"
                                            dir="ltr"
                                          >
                                            <span>{exampleSentence.exFr}</span>
                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                speakText(
                                                  exampleSentence.exFr,
                                                  getWordLang(d),
                                                  0.9,
                                                  e
                                                )
                                              }
                                              className="p-1 rounded hover:bg-black/10"
                                              aria-label="نطق الجملة"
                                            >
                                              <Volume2 size={12} />
                                            </button>
                                          </div>
                                          <div>{exampleSentence.exAr}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Controls for Writing: Structured 2-Row Layout */}
                                  {writingStatus === 'idle' ? (
                                    <div className="space-y-2 pt-1">
                                      <button
                                        type="submit"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm py-3.5 px-4 rounded-2xl transition-all shadow-md shadow-emerald-600/20 min-h-[48px] flex items-center justify-center gap-2"
                                      >
                                        <Check size={16} />
                                        <span>تحقق من الإجابة</span>
                                      </button>
                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          type="button"
                                          onClick={handleWritingLetterHint}
                                          className="bg-[var(--muted)] border border-[var(--border)] hover:brightness-95 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors min-h-[42px]"
                                          title="كشف أول حروف الكلمة"
                                        >
                                          <Lightbulb size={14} className="text-amber-500 shrink-0" />
                                          <span>مساعدة بحرف</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleRevealWritingAnswer}
                                          className="bg-[var(--muted)] border border-[var(--border)] hover:brightness-95 text-xs font-bold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors min-h-[42px]"
                                        >
                                          <Eye size={14} className="shrink-0 opacity-75" />
                                          <span>إظهار الكلمة</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleSkip}
                                          className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-extrabold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors min-h-[42px]"
                                          title="تخطي الكلمة الحالية (تُحتسب في النسبة الشاملة)"
                                        >
                                          <SkipForward size={14} className="shrink-0" />
                                          <span>تخطي</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={nextCard}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 min-h-[48px]"
                                    >
                                      <span>الكلمة التالية</span>
                                      <ArrowLeft size={16} />
                                    </button>
                                  )}

                                  {/* Focus Mode Navigation in Stage 3 */}
                                  {focusMode && (
                                    <div className="flex items-center justify-between gap-2 pt-2.5">
                                      <button
                                        type="button"
                                        onClick={prevCard}
                                        disabled={current === 0}
                                        className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors shadow-2xs"
                                        title="السابق"
                                      >
                                        <ArrowRight size={14} /> السابق
                                      </button>
                                      <button
                                        type="button"
                                        onClick={nextCard}
                                        className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shadow-2xs"
                                        title="التالي"
                                      >
                                        التالي <ArrowLeft size={14} />
                                      </button>
                                    </div>
                                  )}
                                </form>
                              </div>
                            </motion.div>
                          </motion.div>
                        </AnimatePresence>

                        {/* Bottom Navigation Controls */}
                        {!focusMode && (
                          <div className="grid grid-cols-4 gap-2 w-full max-w-md mx-auto mt-auto pt-1">
                            <button
                              onClick={prevCard}
                              disabled={current === 0}
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] disabled:opacity-40 transition-colors min-h-[44px] shadow-2xs"
                            >
                              <ArrowRight size={14} /> السابق
                            </button>
                            <button
                              onClick={shuffle}
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                            >
                              <Shuffle size={14} /> خلط
                            </button>
                            <button
                              onClick={() => resetAll()}
                              className={`border rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] shadow-2xs ${
                                confirmResetRound
                                  ? 'bg-rose-600 border-rose-600 text-white font-bold'
                                  : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]'
                              }`}
                            >
                              <RotateCcw size={14} /> {confirmResetRound ? 'تأكيد؟' : 'من الأول'}
                            </button>
                            <button
                              onClick={nextCard}
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                            >
                              التالي <ArrowLeft size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  /* ==========================================
                     STAGE 1: FLASHCARDS STUDY VIEW
                     ========================================== */
                  <>
                    {/* Flashcard Container with Framer Motion Transition, Wrong-Answer Shake & 3D Flip */}
                    <AnimatePresence mode="wait" custom={navDirection}>
                      <motion.div
                        key={`flashcard-${round}-${current}-${d.fr}`}
                        custom={navDirection}
                        variants={cardSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="w-full mb-3.5"
                      >
                        <motion.div
                          animate={cardKineticAnimation}
                          transition={{ duration: 0.48, ease: 'easeInOut' }}
                          className={`relative perspective-1000 w-full cursor-pointer select-none touch-pan-y ${
                            focusMode ? 'h-[400px] sm:h-[430px]' : 'h-92 sm:h-96'
                          }`}
                          onClick={() => {
                            if (isSwiping.current) return;
                            flipCard();
                          }}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          {renderCardFeedbackOverlay()}
                          <motion.div
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 260,
                              damping: 22,
                              mass: 0.85,
                            }}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="w-full h-full relative transform-style-3d rounded-3xl"
                          >
                             {/* Front */}
                            <div
                              className={`absolute w-full h-full backface-hidden rounded-3xl border flex flex-col justify-between p-5 sm:p-6 bg-[var(--card)] shadow-lg shadow-slate-900/5 dark:shadow-black/30 transition-shadow ${cardStatusGlow} ${
                                isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
                              }`}
                            >
                              {/* Card Top Bar: Right (Focus + Note) | Left (Edit + Favorite) */}
                              <div className="w-full flex items-center justify-between gap-2 z-10">
                                {/* Right side in RTL: Focus Mode + Note / Keyword */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFocusMode((prev) => !prev);
                                    }}
                                    title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      focusMode
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)]'
                                    }`}
                                  >
                                    <Target size={16} />
                                  </button>
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNoteInput((prev) => !prev);
                                      }}
                                      title={h.trim() ? `ملاحظة: ${h}` : 'ملاحظة / كلمة مفتاحية'}
                                      className={`h-9 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-90 ${
                                        h.trim() || showNoteInput
                                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35'
                                          : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                                      }`}
                                    >
                                      <Lightbulb
                                        size={14}
                                        className={h.trim() ? 'text-amber-500' : ''}
                                      />
                                      <span className="max-w-[95px] truncate">
                                        {h.trim() ? h : 'ملاحظة'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {/* Left side in RTL: Quick Edit + Favorite Heart */}
                                <div className="flex items-center gap-1.5">
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditWord(d);
                                        setShowQuickCardEdit(true);
                                      }}
                                      aria-label="تعديل سريع للكلمة"
                                      title="تعديل سريع للكلمة أو معناها"
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-emerald-600 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(d.fr, e)}
                                    aria-label={
                                      isCurrentFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'
                                    }
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--muted)]/60 hover:bg-[var(--muted)] active:scale-90 transition-all"
                                  >
                                    <Heart
                                      size={17}
                                      className={
                                        isCurrentFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-[var(--muted-foreground)] hover:text-rose-500'
                                      }
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Center Hero Area: Language/Type Kicker + Word + Collapsible Note Input */}
                              <div className="flex flex-col items-center justify-center my-auto px-2">
                                <div className="text-xs font-medium text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
                                  <span>{getLanguageLabel(d)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span style={{ color: genderInfo.color }} className="font-bold">
                                    {genderInfo.label}
                                  </span>
                                </div>

                                <div
                                  className={`${
                                    focusMode ? 'text-4xl sm:text-5xl' : 'text-4xl sm:text-5xl'
                                  } font-extrabold text-center leading-tight tracking-tight text-[var(--foreground)] select-all`}
                                  dir="ltr"
                                >
                                  {d.fr}
                                </div>

                                {/* Saved Keyword / Note Pill (Visible when user has a saved note and input is closed) */}
                                {!focusMode && !showNoteInput && h.trim() && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNoteInput(true);
                                    }}
                                    title="اضغط لتعديل الملاحظة"
                                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold max-w-[260px] truncate transition-colors"
                                  >
                                    <Lightbulb size={13} className="text-amber-500 shrink-0" />
                                    <span className="truncate">{h}</span>
                                  </button>
                                )}

                                {/* Collapsible Note Input (Appears smoothly under the word when toggled) */}
                                {!focusMode && showNoteInput && (
                                  <div
                                    className="w-full max-w-[260px] flex items-center gap-1.5 mt-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={h}
                                      onChange={handleHintChange}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                          e.preventDefault();
                                          setShowNoteInput(false);
                                        }
                                      }}
                                      placeholder="اكتب مفتاحاً يذكرك بالكلمة..."
                                      autoFocus
                                      className="w-full border border-[var(--border)] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs bg-[var(--muted)]/60 outline-none text-right placeholder-[var(--muted-foreground)] transition-colors"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowNoteInput(false)}
                                      className="p-2 rounded-xl bg-[var(--muted)]/70 hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0"
                                      title="حفظ وإخفاء الملاحظة"
                                    >
                                      <Check size={13} className="text-emerald-600" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Card Bottom Dock: Clean Audio Controls Capsule */}
                              <div className="w-full flex items-center justify-center pt-2 border-t border-[var(--border)]/50">
                                <div className="flex items-center gap-2 justify-center">
                                  <button
                                    onClick={(e) => speak(0.9, e)}
                                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                  >
                                    <Volume2 size={14} />
                                    <span>
                                      {autoSpeak5Sec && readingCountdown && readingCountdown > 0
                                        ? `نطق (${readingCountdown}ث)`
                                        : 'نطق'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={(e) => speak(0.45, e)}
                                    className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs font-semibold hover:brightness-95 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Turtle size={14} /> ببطء
                                  </button>
                                  <button
                                    onClick={toggleRepeat}
                                    title={repeatActive ? 'إيقاف التكرار الصوتي' : 'تكرار صوتي تلقائي'}
                                    className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-colors ${
                                      repeatActive
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-emerald-500/40'
                                    }`}
                                  >
                                    <Repeat size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Back */}
                            <div
                              className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl border flex flex-col justify-between p-5 sm:p-6 shadow-lg shadow-slate-900/5 dark:shadow-black/30 overflow-hidden transition-shadow ${
                                isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
                              } ${
                                isRetryRound
                                  ? 'bg-[var(--card-back-retry)] border-amber-300/70 dark:border-amber-800'
                                  : 'bg-[var(--card-back)] border-emerald-300/70 dark:border-emerald-800'
                              } ${cardStatusGlow}`}
                            >
                              {/* Back Top Bar: Right (Focus + Note) | Left (Edit + Favorite) */}
                              <div className="w-full flex items-center justify-between gap-2 z-10">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFocusMode((prev) => !prev);
                                    }}
                                    title={focusMode ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                      focusMode
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-black/5 dark:bg-white/10 text-emerald-900/70 dark:text-emerald-100/70 hover:bg-black/10'
                                    }`}
                                  >
                                    <Target size={16} />
                                  </button>
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNoteInput((prev) => !prev);
                                      }}
                                      title={h.trim() ? `ملاحظة: ${h}` : 'ملاحظة / كلمة مفتاحية'}
                                      className="h-9 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold bg-black/5 dark:bg-white/10 text-emerald-950 dark:text-emerald-100 hover:bg-black/10 transition-all active:scale-90"
                                    >
                                      <Lightbulb
                                        size={14}
                                        className={h.trim() ? 'text-amber-500' : 'opacity-70'}
                                      />
                                      <span className="max-w-[95px] truncate">
                                        {h.trim() ? h : 'ملاحظة'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!focusMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditWord(d);
                                        setShowQuickCardEdit(true);
                                      }}
                                      aria-label="تعديل سريع للكلمة"
                                      title="تعديل سريع للكلمة أو معناها"
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/10 text-emerald-900/70 dark:text-emerald-100/70 hover:text-emerald-700 active:scale-90 transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(d.fr, e)}
                                    aria-label={
                                      isCurrentFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'
                                    }
                                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 active:scale-90 transition-all"
                                  >
                                    <Heart
                                      size={17}
                                      className={
                                        isCurrentFavorite
                                          ? 'fill-rose-500 text-rose-500'
                                          : 'text-emerald-900/60 dark:text-emerald-100/60 hover:text-rose-500'
                                      }
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Back Center Content: Visual Illustration + Arabic Meaning */}
                              <div className="flex flex-col items-center justify-center my-auto px-2">
                                <div
                                  className={`relative w-full ${
                                    focusMode ? 'max-w-[220px] h-32 mb-3.5' : 'max-w-[195px] h-28 mb-3'
                                  } bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-black/5 dark:border-white/10 shadow-2xs`}
                                >
                                  <CardImage d={d} />
                                </div>

                                <div
                                  className={`${
                                    focusMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
                                  } font-extrabold text-emerald-950 dark:text-emerald-200 text-center leading-tight`}
                                >
                                  {d.ar}
                                </div>

                                {/* Saved Keyword / Note Pill on Back of Card */}
                                {!focusMode && !showNoteInput && h.trim() && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNoteInput(true);
                                    }}
                                    title="اضغط لتعديل الملاحظة"
                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs font-bold max-w-[260px] truncate transition-colors"
                                  >
                                    <Lightbulb size={13} className="text-amber-500 shrink-0" />
                                    <span className="truncate">{h}</span>
                                  </button>
                                )}

                                {!focusMode && showNoteInput && (
                                  <div
                                    className="w-full max-w-[260px] flex items-center gap-1.5 mt-2.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={h}
                                      onChange={handleHintChange}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                          e.preventDefault();
                                          setShowNoteInput(false);
                                        }
                                      }}
                                      placeholder="مفتاحك للتذكر..."
                                      autoFocus
                                      className="w-full border border-emerald-400/50 dark:border-emerald-700/60 rounded-xl px-3.5 py-1.5 text-xs bg-white/60 dark:bg-emerald-950/40 outline-none text-right text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/50 dark:placeholder-emerald-300/50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowNoteInput(false)}
                                      className="p-1.5 rounded-xl bg-white/60 dark:bg-emerald-950/40 border border-emerald-400/50 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100 transition-colors shrink-0"
                                      title="حفظ وإخفاء الملاحظة"
                                    >
                                      <Check size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Back Bottom Dock: Word & Quick Audio Reference */}
                              <div className="w-full flex items-center justify-center gap-2 pt-2 border-t border-emerald-900/10 dark:border-white/10">
                                <button
                                  type="button"
                                  onClick={(e) => speak(0.9, e)}
                                  dir="ltr"
                                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-emerald-950 dark:text-emerald-100 text-xs font-bold transition-colors"
                                >
                                  <Volume2 size={14} />
                                  <span>{d.fr}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={toggleRepeat}
                                  title={repeatActive ? 'إيقاف التكرار الصوتي' : 'تكرار صوتي تلقائي'}
                                  className={`w-8 h-8 border rounded-xl flex items-center justify-center transition-colors ${
                                    repeatActive
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'bg-black/5 dark:bg-white/10 border-emerald-900/15 dark:border-white/15 text-emerald-950 dark:text-emerald-100 hover:bg-black/10'
                                  }`}
                                >
                                  <Repeat size={14} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Feedback area */}
                    {(flipWarning || (!focusMode && currentAnswer)) && (
                      <div
                        className="text-xs sm:text-sm font-bold min-h-[22px] mb-2 text-center"
                        style={{
                          color: flipWarning
                            ? 'var(--wrong-text)'
                            : currentAnswer === 'correct'
                            ? 'var(--correct-text)'
                            : currentAnswer === 'skipped'
                            ? '#d97706'
                            : currentAnswer === 'wrong'
                            ? 'var(--wrong-text)'
                            : 'transparent',
                        }}
                      >
                        {flipWarning
                          ? flipWarning
                          : currentAnswer === 'correct'
                          ? '✓ أجبت صح — يمكنك التغيير'
                          : currentAnswer === 'skipped'
                          ? '⏭ تم التخطي (Skip) — يُحتسب في النسبة الشاملة'
                          : currentAnswer === 'wrong'
                          ? '✗ أجبت غلط — يمكنك التغيير'
                          : '...'}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isFlipped && !answered ? (
                      <div className="flex items-center gap-2.5 w-full max-w-md mx-auto mb-3">
                        {focusMode && (
                          <button
                            type="button"
                            onClick={prevCard}
                            disabled={current === 0}
                            aria-label="السابق"
                            title="الكارت السابق"
                            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-[var(--muted)] disabled:opacity-35 transition-colors min-h-[52px]"
                          >
                            <ArrowRight size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={flipCard}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl py-3.5 px-5 text-sm font-extrabold transition-all shadow-md shadow-emerald-600/20 min-h-[52px] flex items-center justify-center gap-2"
                        >
                          <span>اقلب الكارت لإظهار المعنى</span>
                          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-white/20 font-mono">
                            Space
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 rounded-2xl py-3.5 px-4 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px]"
                          title="تخطي الكارت (اختصار لوحة المفاتيح: 2)"
                        >
                          <SkipForward size={15} />
                          <span>تخطي</span>
                          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 font-mono">
                            2
                          </span>
                        </button>
                        {focusMode && (
                          <button
                            type="button"
                            onClick={nextCard}
                            aria-label="التالي"
                            title="الكارت التالي"
                            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-[var(--muted)] transition-colors min-h-[52px]"
                          >
                            <ArrowLeft size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full max-w-md mx-auto mb-3 gap-2">
                        <div className="flex items-center gap-2 w-full">
                          {focusMode && (
                            <button
                              type="button"
                              onClick={prevCard}
                              disabled={current === 0}
                              aria-label="السابق"
                              title="الكارت السابق"
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-3.5 text-xs font-bold flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-35 transition-colors min-h-[52px]"
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            <button
                              onClick={() => handleAnswer(true)}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px] active:scale-[0.96] ${
                                answerEffect === 'correct'
                                  ? 'bg-emerald-500 border-emerald-300 text-white scale-105 ring-4 ring-emerald-400/50 shadow-lg shadow-emerald-500/30'
                                  : currentAnswer === 'correct'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                  : 'bg-[var(--correct-bg)] border-[var(--correct-border)] text-[var(--correct-text)] hover:brightness-95'
                              }`}
                            >
                              <span>✓ عرفتها</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                1
                              </span>
                            </button>
                            <button
                              onClick={handleSkip}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-all min-h-[52px] active:scale-[0.98] ${
                                currentAnswer === 'skipped'
                                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                  : 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:brightness-95'
                              }`}
                            >
                              <SkipForward size={15} />
                              <span>تخطي</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                2
                              </span>
                            </button>
                            <button
                              onClick={() => handleAnswer(false)}
                              className={`border rounded-2xl px-2.5 py-3.5 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all min-h-[52px] active:scale-[0.96] ${
                                answerEffect === 'wrong'
                                  ? 'bg-rose-600 border-rose-300 text-white scale-95 ring-4 ring-rose-500/60 shadow-lg shadow-rose-600/40'
                                  : currentAnswer === 'wrong'
                                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                  : 'bg-[var(--wrong-bg)] border-[var(--wrong-border)] text-[var(--wrong-text)] hover:brightness-95'
                              }`}
                            >
                              <span>✗ غلطت</span>
                              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10 font-mono">
                                3
                              </span>
                            </button>
                          </div>
                          {focusMode && (
                            <button
                              type="button"
                              onClick={nextCard}
                              aria-label="التالي"
                              title="الكارت التالي"
                              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 py-3.5 text-xs font-bold flex items-center justify-center hover:bg-[var(--muted)] transition-colors min-h-[52px]"
                            >
                              <ArrowLeft size={16} />
                            </button>
                          )}
                        </div>
                        {focusMode && answered && (
                          <button
                            type="button"
                            onClick={nextCard}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-600/35 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>الانتقال للكارت التالي</span>
                            <ArrowLeft size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Bottom Navigation Controls (Hidden in Focus Mode) */}
                    {!focusMode ? (
                      <div className="grid grid-cols-4 gap-2 w-full max-w-md mx-auto mt-auto pt-1">
                        <button
                          onClick={prevCard}
                          disabled={current === 0}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] disabled:opacity-40 transition-colors min-h-[44px] shadow-2xs"
                        >
                          <ArrowRight size={14} /> السابق
                        </button>
                        <button
                          onClick={shuffle}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                        >
                          <Shuffle size={14} /> خلط
                        </button>
                        <button
                          onClick={() => resetAll()}
                          className={`border rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] shadow-2xs ${
                            confirmResetRound
                              ? 'bg-rose-600 border-rose-600 text-white font-bold'
                              : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          <RotateCcw size={14} /> {confirmResetRound ? 'تأكيد؟' : 'من الأول'}
                        </button>
                        <button
                          onClick={nextCard}
                          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors min-h-[44px] shadow-2xs"
                        >
                          التالي <ArrowLeft size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-[var(--muted-foreground)]/70 pt-1">
                        المسافة للقلب • 1 عرفتها • 2 تخطي • 3 غلطت • الأسهم للتنقل • R للنطق • Esc للخروج
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* DESKTOP LIVE MASTERY SIDEBAR (Visible on lg+ screens when not in Focus Mode) */}
              {!focusMode && (
                <aside className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-3.5 sticky top-4">
                  {/* Live 3-Step Comprehensive Mastery Card */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-[var(--foreground)]">
                          📊 متابعة الإتقان للثلاث خطوات
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          النسبة الشاملة الفورية ({liveTotalCorrect} / {liveTotalPossible})
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-extrabold tabular-nums">
                        {liveComprehensivePct}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${liveComprehensivePct}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-1 tabular-nums">
                      {liveStageStats.map((st) => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => switchStage(st.key)}
                          className={`w-full p-2.5 rounded-2xl border text-right flex items-center justify-between transition-all ${
                            st.key === stage
                              ? 'bg-emerald-500/10 border-emerald-500/40 font-bold'
                              : 'bg-[var(--muted)]/50 border-[var(--border)] hover:bg-[var(--muted)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                st.pct === 100
                                  ? 'bg-emerald-500'
                                  : st.key === stage
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span className="text-xs font-bold">{st.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-emerald-600 font-bold">✓{st.correct}</span>
                            <span className="text-rose-500 font-bold">✗{st.wrong}</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              ⏭{st.skipped}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--card)] text-xs font-extrabold">
                              {st.pct}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Deck Words Mini-Checklist */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[var(--foreground)]">
                        📋 كلمات الجولة الحالية ({queue.length})
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {d.cat}
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {queue.map((item, idx) => {
                        const status = cardAnswers[idx] || (stageOutcomes[stage] || {})[item.fr];
                        const isActiveCard = idx === current;
                        return (
                          <button
                            key={`${item.fr}-${idx}`}
                            type="button"
                            onClick={() => jumpToCard(idx)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors text-right ${
                              isActiveCard
                                ? 'bg-emerald-500/10 border-emerald-500/40 font-bold'
                                : 'bg-[var(--muted)]/40 border-transparent hover:bg-[var(--muted)]'
                            }`}
                          >
                            <span className="truncate text-[var(--muted-foreground)]">
                              {idx + 1}. {item.ar}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => speakWord(item, 0.9, e)}
                                title={`نطق ${item.fr}`}
                                className="p-1 rounded-lg hover:bg-emerald-500/15 text-[var(--muted-foreground)] hover:text-emerald-600 transition-colors"
                              >
                                <Volume2 size={12} />
                              </span>
                              <span className="font-bold text-[var(--foreground)]">{item.fr}</span>
                              {status === 'correct' && (
                                <span className="text-emerald-600 font-extrabold">✓</span>
                              )}
                              {status === 'wrong' && (
                                <span className="text-rose-500 font-extrabold">✗</span>
                              )}
                              {status === 'skipped' && (
                                <span className="text-amber-500 font-extrabold">⏭</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Keyboard Shortcuts Quick Guide */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 text-[11px] text-[var(--muted-foreground)] flex flex-wrap items-center justify-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono font-bold">
                      Space
                    </span>
                    <span>قلب</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                      1
                    </span>
                    <span>عرفتها</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold">
                      2
                    </span>
                    <span>تخطي</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono font-bold">
                      3
                    </span>
                    <span>غلطت</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono font-bold">
                      R
                    </span>
                    <span>نطق</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono font-bold">
                      ←/→
                    </span>
                    <span>تنقل</span>
                  </div>
                </aside>
              )}
            </div>
          );
        })()
      )}
      {/* Mobile & Desktop Quick Round Words Drawer (Opened by clicking the Card Counter X / Y) */}
      {showRoundDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowRoundDrawer(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-extrabold">
                  كلمات الجولة الحالية ({current + 1} من {queue.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoundDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)]"
                aria-label="إغلاق"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
              {queue.map((item, idx) => {
                const status = cardAnswers[idx] || (stageOutcomes[stage] || {})[item.fr];
                const isActiveCard = idx === current;
                return (
                  <button
                    key={`drawer-${item.fr}-${idx}`}
                    type="button"
                    onClick={() => jumpToCard(idx)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors text-right ${
                      isActiveCard
                        ? 'bg-emerald-500/15 border-emerald-500/50 font-extrabold'
                        : 'bg-[var(--muted)]/50 border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="truncate font-semibold">{item.ar}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" dir="ltr">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => speakWord(item, 0.9, e)}
                        title={`نطق ${item.fr}`}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-[var(--muted-foreground)] hover:text-emerald-600 transition-colors"
                      >
                        <Volume2 size={13} />
                      </span>
                      <span className="font-bold text-[var(--foreground)]">{item.fr}</span>
                      {status === 'correct' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-extrabold">
                          ✓
                        </span>
                      )}
                      {status === 'wrong' && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 font-extrabold">
                          ✗
                        </span>
                      )}
                      {status === 'skipped' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-extrabold">
                          ⏭
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Card Inline Edit Modal (from Pencil button on active card) */}
      {showQuickCardEdit && d && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowQuickCardEdit(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEditedWord(d.fr);
            }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <Pencil size={16} />
                <span>تعديل سريع للكلمة الحالية</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCardEdit(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)]"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  الكلمة:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editWordFrVal}
                  onChange={(e) => setEditWordFrVal(e.target.value)}
                  className="w-full border border-[var(--border)] focus:border-emerald-600 rounded-xl px-3 py-2 text-sm font-bold bg-[var(--muted)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  المعنى بالعربية:
                </label>
                <input
                  type="text"
                  value={editWordArVal}
                  onChange={(e) => setEditWordArVal(e.target.value)}
                  className="w-full border border-[var(--border)] focus:border-emerald-600 rounded-xl px-3 py-2 text-sm bg-[var(--muted)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  النوع:
                </label>
                <select
                  value={editWordGenderVal}
                  onChange={(e) => setEditWordGenderVal(e.target.value as Gender)}
                  className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-xs bg-[var(--muted)] outline-none"
                >
                  <option value="n">اسم (Noun)</option>
                  <option value="v">فعل (Verb)</option>
                  <option value="adj">صفة (Adj)</option>
                  <option value="m">مذكر (m)</option>
                  <option value="f">مؤنث (f)</option>
                  <option value="pl">جمع (pl)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                  ملاحظة / مفتاح تذكر (اختياري):
                </label>
                <input
                  type="text"
                  value={editWordHintVal}
                  onChange={(e) => setEditWordHintVal(e.target.value)}
                  placeholder="مثال: تشبه كلمة كذا..."
                  className="w-full border border-[var(--border)] focus:border-emerald-600 rounded-xl px-3 py-2 text-xs bg-[var(--muted)] outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                    جملة المثال:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editWordExFrVal}
                    onChange={(e) => setEditWordExFrVal(e.target.value)}
                    placeholder="Example sentence..."
                    className="w-full border border-[var(--border)] focus:border-emerald-600 rounded-xl px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">
                    ترجمة الجملة:
                  </label>
                  <input
                    type="text"
                    value={editWordExArVal}
                    onChange={(e) => setEditWordExArVal(e.target.value)}
                    placeholder="ترجمة الجملة بالعربية..."
                    className="w-full border border-[var(--border)] focus:border-emerald-600 rounded-xl px-2.5 py-1.5 text-xs bg-[var(--muted)] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
              >
                حفظ التعديل فوراً
              </button>
              <button
                type="button"
                onClick={() => setShowQuickCardEdit(false)}
                className="py-2.5 px-4 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-xs font-medium"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Cloud Account & Synchronization Modal */}
      {showCloudModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCloudModal(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Cloud size={18} className="text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-extrabold text-[var(--foreground)]">
                  الحفظ السحابي (Firebase Cloud)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)]"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            {currentUser ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center gap-2.5">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-[var(--border)] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {currentUser.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate">
                      {currentUser.displayName || 'مستخدم مسجل'}
                    </div>
                    <div className="text-[11px] text-[var(--muted-foreground)] truncate" dir="ltr">
                      {currentUser.email}
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>

                <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed space-y-1">
                  <div>✓ جميع الـ 30 درساً وكلماتك الجديدة ترتبط بحسابك.</div>
                  <div>✓ يمكنك فتح التطبيق من أي متصفح واسترجاع كل بياناتك.</div>
                  {lastCloudSyncTime && (
                    <div className="text-emerald-700 dark:text-emerald-300 font-semibold pt-1">
                      آخر مزامنة: {new Date(lastCloudSyncTime).toLocaleTimeString('ar-EG')}
                    </div>
                  )}
                </div>

                {cloudSyncMessage && (
                  <div className="p-2 rounded-lg bg-[var(--muted)] text-[11px] text-[var(--foreground)] font-medium">
                    {cloudSyncMessage}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSyncToCloud()}
                    disabled={isSyncingCloud}
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {isSyncingCloud ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
                    <span>مزامنة وحفظ على السحابة الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromCloud}
                    disabled={isSyncingCloud}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--border)]/30 disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSyncingCloud ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
                    <span>استرجاع البيانات من السحابة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSignOut();
                      setShowCloudModal(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-500/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  سجل دخولك بحساب Google ليتم حفظ جميع كلماتك الـ 30 درساً وتقدمك اليومي تلقائياً في السحابة لعدم فقدانها أبداً عند مسح المتصفح أو تغيير الجهاز.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleGoogleSignIn();
                    setShowCloudModal(false);
                  }}
                  disabled={isSyncingCloud}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {isSyncingCloud ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  <span>تسجيل الدخول بـ Google وحفظ كلماتي</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive App Download / Install Modal (PWA) */}
      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--foreground)]">
                    تحميل وتثبيت التطبيق
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    يعمل كتطبيق مستقل بدون متجر وسريع جداً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="p-2 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Benefits Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--foreground)]">
              <div className="p-2 rounded-xl bg-[var(--muted)]/60 border border-[var(--border)] flex items-center gap-1.5">
                <span>⚡</span>
                <span>شاشة كاملة وتصميم أصلي</span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--muted)]/60 border border-[var(--border)] flex items-center gap-1.5">
                <span>📶</span>
                <span>يعمل بدون إنترنت (Offline)</span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--muted)]/60 border border-[var(--border)] flex items-center gap-1.5">
                <span>☁️</span>
                <span>حفظ سحابي مستمر للكلمات</span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--muted)]/60 border border-[var(--border)] flex items-center gap-1.5">
                <span>📲</span>
                <span>أيقونة على شاشتك الرئيسية</span>
              </div>
            </div>

            {/* One-Click Native Install Button (When browser provides native trigger) */}
            {deferredInstallPrompt && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  متصفحك يدعم التثبيت المباشر الآن:
                </div>
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25"
                >
                  <Download size={16} />
                  <span>تثبيت التطبيق الآن بنقرة واحدة</span>
                </button>
              </div>
            )}

            {/* Device Tabs */}
            <div className="space-y-3 pt-1">
              <div className="flex rounded-2xl bg-[var(--muted)] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setInstallDeviceTab('android')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    installDeviceTab === 'android'
                      ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  📱 أندرويد
                </button>
                <button
                  type="button"
                  onClick={() => setInstallDeviceTab('ios')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    installDeviceTab === 'ios'
                      ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  🍏 آيفون / آيباد
                </button>
                <button
                  type="button"
                  onClick={() => setInstallDeviceTab('pc')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    installDeviceTab === 'pc'
                      ? 'bg-[var(--card)] text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  💻 كمبيوتر
                </button>
              </div>

              {/* Instructions per device */}
              {installDeviceTab === 'android' && (
                <div className="p-3.5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] text-xs text-[var(--foreground)] space-y-2.5 leading-relaxed">
                  <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
                    خطوات التثبيت على هواتف أندرويد (Chrome):
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>
                        افتح الرابط في متصفح <strong>Google Chrome</strong> على هاتفك.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>
                        اضغط على أيقونة الثلاث نقاط <strong>(⋮)</strong> أعلى يسار الشاشة.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>
                        اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        4
                      </span>
                      <span>
                        اضغط <strong>«تثبيت»</strong> وسيظهر التطبيق بأيقونته فوراً بين تطبيقاتك!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {installDeviceTab === 'ios' && (
                <div className="p-3.5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] text-xs text-[var(--foreground)] space-y-2.5 leading-relaxed">
                  <div className="font-extrabold text-sky-700 dark:text-sky-400">
                    خطوات التثبيت على آيفون وآيباد (Safari):
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>
                        تأكد من فتح الرابط في متصفح <strong>Safari</strong> (متصفح آبل الأساسي).
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span className="flex items-center gap-1 flex-wrap">
                        اضغط على زر المشاركة <strong>(Share)</strong> في أسفل الشاشة
                        <Share2 size={13} className="inline text-sky-600" />.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>
                        مرر لأسفل القائمة واضغط على <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen ➕)</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        4
                      </span>
                      <span>
                        اضغط <strong>«إضافة» (Add)</strong> في أعلى الزاوية، ومبروك تم تثبيته!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {installDeviceTab === 'pc' && (
                <div className="p-3.5 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] text-xs text-[var(--foreground)] space-y-2.5 leading-relaxed">
                  <div className="font-extrabold text-indigo-700 dark:text-indigo-400">
                    خطوات التثبيت على الكمبيوتر (Windows / Mac):
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        1
                      </span>
                      <span>
                        افتح التطبيق في متصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        2
                      </span>
                      <span>
                        انظر إلى شريط العنوان في الأعلى جهة اليسار/اليمين، ستجد أيقونة تثبيت صغيرة <strong>(⊕ أو شاشة مع سهم)</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center justify-center shrink-0">
                        3
                      </span>
                      <span>
                        اضغط عليها واختر <strong>«تثبيت» (Install)</strong>، وسيفتح التطبيق في نافذة مستقلة كبرنامج كامل على حاسوبك!
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    triggerCloudToast('تم نسخ رابط التطبيق بنجاح! 📋');
                  } catch {
                    // Fallback
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--border)]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy size={14} />
                <span>نسخ رابط التطبيق</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
