import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconBg: string;
}

export function StatCard({ title, value, change, changeType, icon: Icon, iconBg }: StatCardProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-green-600'
      : changeType === 'negative'
      ? 'text-red-600'
      : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg lg:rounded-xl p-4 lg:p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate">{title}</p>
          <p className="text-lg lg:text-2xl font-bold text-gray-900 mb-1 lg:mb-2 truncate">{value}</p>
          {change && (
            <p className={`text-xs lg:text-sm font-medium ${changeColor}`}>{change}</p>
          )}
        </div>
        <div className={`p-2 lg:p-3 ${iconBg} rounded-lg lg:rounded-xl flex-shrink-0`}>
          <Icon className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
