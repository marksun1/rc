import React from 'react';

interface HeatmapData {
  date: string; // YYYY-MM-DD format
  completed: boolean;
  streak?: number; // Optional: shows streak number
}

interface HabitHeatmapProps {
  data: HeatmapData[];
  title: string;
  startDate: Date;
  endDate: Date;
  className?: string;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  data,
  title,
  startDate,
  endDate,
  className = ""
}) => {
  const generateDateRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getCompletionData = (date: Date): HeatmapData | undefined => {
    const dateStr = formatDate(date);
    return data.find(d => d.date === dateStr);
  };

  const dates = generateDateRange(startDate, endDate);
  const weeks: Date[][] = [];
  
  // Group dates by weeks
  let currentWeek: Date[] = [];
  dates.forEach((date, index) => {
    currentWeek.push(date);
    if (date.getDay() === 6 || index === dates.length - 1) { // Sunday or last date
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 ${className}`}>
      <h3 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
        {title}
      </h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for weekday labels */}
            {weeks.map((week, weekIndex) => {
              const firstDay = week[0];
              const showMonth = weekIndex === 0 || firstDay.getDate() <= 7;
              return (
                <div key={weekIndex} className="flex-1 min-w-[12px]">
                  {showMonth && (
                    <div className="text-xs text-gray-500 dark:text-slate-400 font-chinese text-center">
                      {months[firstDay.getMonth()]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar grid */}
          <div className="flex">
            {/* Weekday labels */}
            <div className="flex flex-col justify-start mr-2">
              {weekdays.map((day, index) => (
                <div 
                  key={day} 
                  className={`h-3 flex items-center text-xs text-gray-500 dark:text-slate-400 font-chinese ${
                    index % 2 === 0 ? 'visible' : 'invisible'
                  }`}
                  style={{ marginBottom: '2px' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const date = week.find(d => d.getDay() === dayIndex);
                    if (!date) {
                      return (
                        <div 
                          key={dayIndex} 
                          className="w-3 h-3 rounded-sm bg-transparent"
                        />
                      );
                    }

                    const completionData = getCompletionData(date);
                    const isCompleted = completionData?.completed || false;
                    const isToday = formatDate(date) === formatDate(new Date());
                    
                    return (
                      <div
                        key={date.getTime()}
                        className={`w-3 h-3 rounded-sm border transition-all duration-200 hover:scale-110 cursor-pointer ${
                          isCompleted
                            ? 'bg-primary-500 border-primary-600'
                            : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                        } ${
                          isToday 
                            ? 'ring-2 ring-blue-400 ring-offset-1' 
                            : ''
                        }`}
                        title={`${date.toLocaleDateString('zh-CN')} ${
                          isCompleted ? '✅ 已完成' : '⭕ 未完成'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center space-x-2 font-chinese">
              <span>少</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"></div>
                <div className="w-3 h-3 rounded-sm bg-primary-200"></div>
                <div className="w-3 h-3 rounded-sm bg-primary-400"></div>
                <div className="w-3 h-3 rounded-sm bg-primary-500"></div>
                <div className="w-3 h-3 rounded-sm bg-primary-600"></div>
              </div>
              <span>多</span>
            </div>
            <div className="font-chinese">
              打卡完成情况
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};