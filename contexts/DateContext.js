import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const DateContext = createContext();

export const DateProvider = ({ children }) => {
  // null = prikaži sve dane
  const [selectedDate, setSelectedDate] = useState(null);

  // Povećava se kad se vježbe promijene, da se oznake u kalendaru osvježe
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const value = useMemo(
    () => ({ selectedDate, setSelectedDate, refreshKey, refresh }),
    [selectedDate, refreshKey, refresh]
  );

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

export const useDate = () => useContext(DateContext);
