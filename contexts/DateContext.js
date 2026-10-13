import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  todayKey,
  fromKey,
  weekRange,
  monthRange,
  formatShort,
  formatDayLong,
} from '../utils/dates';

const DateContext = createContext();

export const DateProvider = ({ children }) => {
  // Odabrani dan ('YYYY-MM-DD') i način prikaza: 'day' | 'week' | 'month' | 'all'
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [mode, setMode] = useState('day');

  // Povećava se kad se vježbe promijene, da se oznake u kalendaru osvježe
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const showDay = useCallback((date) => {
    setSelectedDate(date);
    setMode('day');
  }, []);

  // Cijeli tjedan (pon-ned) zadanog dana, ili trenutno odabranog
  const showWeek = useCallback((date) => {
    if (date) setSelectedDate(date);
    setMode('week');
  }, []);

  // Cijeli mjesec zadanog dana (npr. mjesec koji je otvoren u kalendaru).
  // Odabrani dan postaje danas ako je u tom mjesecu, inače prvi dan mjeseca.
  const showMonth = useCallback((date) => {
    if (date) {
      const month = monthRange(fromKey(date));
      const today = todayKey();
      setSelectedDate(today >= month.start && today <= month.end ? today : month.start);
    }
    setMode('month');
  }, []);

  const showAll = useCallback(() => setMode('all'), []);

  const resetToToday = useCallback(() => showDay(todayKey()), [showDay]);

  // Povratak u aplikaciju (iz pozadine) uvijek vraća na današnji dan
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resetToToday();
    });
    return () => subscription.remove();
  }, [resetToToday]);

  const value = useMemo(() => {
    const today = todayKey();

    // Raspon dana koji ekrani prikazuju (null = svi dani)
    let range = null;
    let rangeLabel = 'Svi dani';
    if (mode === 'day') {
      range = { start: selectedDate, end: selectedDate };
      rangeLabel =
        selectedDate === today
          ? `Danas, ${formatShort(fromKey(today))}`
          : formatDayLong(selectedDate);
    } else if (mode === 'week') {
      const week = weekRange(fromKey(selectedDate));
      range = { start: week.start, end: week.end };
      rangeLabel = `Tjedan ${formatShort(week.startDate)} – ${formatShort(week.endDate)}`;
    } else if (mode === 'month') {
      const month = monthRange(fromKey(selectedDate));
      range = { start: month.start, end: month.end };
      rangeLabel = month.label;
    }

    // Dan na koji se spremaju novi unosi: odabrani dan, a kod tjedna i mjeseca danas
    // ako je u tom razdoblju (inače odabrani dan); kod svih dana uvijek danas
    let entryDate = today;
    if (mode === 'day') entryDate = selectedDate;
    if ((mode === 'week' || mode === 'month') && !(today >= range.start && today <= range.end)) {
      entryDate = selectedDate;
    }

    return {
      selectedDate,
      mode,
      range,
      rangeLabel,
      entryDate,
      showDay,
      showWeek,
      showMonth,
      showAll,
      resetToToday,
      refreshKey,
      refresh,
    };
  }, [selectedDate, mode, refreshKey, refresh, showDay, showWeek, showMonth, showAll, resetToToday]);

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

export const useDate = () => useContext(DateContext);
