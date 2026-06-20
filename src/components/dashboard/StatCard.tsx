import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  formatAsCurrency?: boolean;
  isPositive?: boolean;
}
const StatCard = ({ title, value, icon: Icon, formatAsCurrency = false, isPositive }: StatCardProps) => {
  const formattedValue = formatAsCurrency
    ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(value)
    : value.toString();
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  return (
    <motion.div variants={cardVariants}>
      <Card className="shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        <div className="p-1 bg-gradient-to-r from-slate-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-xl sm:text-3xl font-bold',
                isPositive === true && 'text-green-600',
                isPositive === false && 'text-red-600'
              )}
            >
              {formattedValue}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
};
export default StatCard;