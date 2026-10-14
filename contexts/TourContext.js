import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useAuth } from './AuthContext';
import { TOUR_STEPS } from '../utils/tourSteps';

const TourContext = createContext(null);

/**
 * Vodič kroz aplikaciju (Flying Nimbus).
 * - Pokreće se sam nakon registracije (user.prefs.tourPending), ili ručno s Profila.
 * - Elementi iz kojih oblak izlazi prijavljuju se preko useTourTarget(id) / <TourTarget>.
 *   Isti id može imati više primjeraka (npr. zaglavlje svakog taba); overlay uzima onaj
 *   koji je stvarno na ekranu.
 */
export const TourProvider = ({ children }) => {
  const { user, setTourPending } = useAuth();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const targets = useRef(new Map()); // id -> Set(node)
  const autoStartedFor = useRef(null); // id korisnika kojem je vodič već sam pokrenut

  const register = useCallback((id, node, previous) => {
    let nodes = targets.current.get(id);
    if (!nodes) {
      nodes = new Set();
      targets.current.set(id, nodes);
    }
    if (previous) nodes.delete(previous);
    if (node) nodes.add(node);
  }, []);

  const getTargets = useCallback((id) => [...(targets.current.get(id) || [])], []);

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);

  // Kraj ili preskakanje: vodič se više ne pokreće sam
  const finish = useCallback(() => {
    setActive(false);
    if (user?.prefs?.tourPending) setTourPending(false);
  }, [user?.prefs?.tourPending, setTourPending]);

  const next = useCallback(() => {
    if (index >= TOUR_STEPS.length - 1) finish();
    else setIndex((i) => i + 1);
  }, [index, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Novi korisnik: vodič kreće sam, jednom po korisniku
  useEffect(() => {
    if (user?.prefs?.tourPending && autoStartedFor.current !== user.$id) {
      autoStartedFor.current = user.$id;
      start();
    }
  }, [user?.$id, user?.prefs?.tourPending, start]);

  const value = useMemo(
    () => ({
      active,
      index,
      step: TOUR_STEPS[index],
      total: TOUR_STEPS.length,
      start,
      next,
      back,
      finish,
      register,
      getTargets,
    }),
    [active, index, start, next, back, finish, register, getTargets]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => useContext(TourContext);

// Callback ref koji element prijavi vodiču pod zadanim id-om
export const useTourTarget = (id) => {
  const tour = useTour();
  const previous = useRef(null);
  return useCallback(
    (node) => {
      if (!tour) return;
      tour.register(id, node, previous.current);
      previous.current = node;
    },
    [id, tour?.register]
  );
};

// Omotač za elemente gdje se ref ne može dati izravno (npr. ikone tabova)
export const TourTarget = ({ id, children, style }) => {
  const ref = useTourTarget(id);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
};
