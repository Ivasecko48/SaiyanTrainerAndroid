import { DateProvider } from '@/contexts/DateContext';
import { TourProvider } from '@/contexts/TourContext';
import TabLayout from '@/components/TabLayout';

export default function ScreensLayout() {
  return (
    <DateProvider>
      <TourProvider>
        <TabLayout />
      </TourProvider>
    </DateProvider>
  );
}
