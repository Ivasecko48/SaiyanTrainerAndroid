import { DateProvider } from '@/contexts/DateContext';
import TabLayout from '@/components/TabLayout';

export default function ScreensLayout() {
  return (
    <DateProvider>
      <TabLayout />
    </DateProvider>
  );
}
