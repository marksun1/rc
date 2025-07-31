# 集成可视化组件示例

## 1. 更新 Dashboard 组件添加分析按钮

在 `Dashboard.tsx` 的第 36-38 行的 header 区域添加分析按钮：

```tsx
{/* Theme toggle in header */}
<div className="flex justify-between items-center mb-6">
  <div className="flex items-center space-x-4">
    <button
      onClick={() => onViewAnalytics()}
      className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
    >
      <i className="fas fa-chart-bar text-primary-500"></i>
      <span className="font-chinese text-gray-700 dark:text-slate-300">数据分析</span>
    </button>
  </div>
  <ThemeToggle variant="dropdown" showLabel />
</div>
```

## 2. 更新 Dashboard 组件的 Props

在 `DashboardProps` 接口中添加：

```tsx
interface DashboardProps {
  // ... 现有的 props
  onViewAnalytics: () => void;
}
```

## 3. 在 App.tsx 中添加 Analytics 视图

在 App.tsx 的 switch 语句中添加 analytics case：

```tsx
// 导入 AnalyticsView
import { AnalyticsView } from './components/AnalyticsView';

// 在 switch 语句中添加
switch (state.currentView) {
  case 'dashboard':
    return (
      <Dashboard
        chains={state.chains}
        scheduledSessions={state.scheduledSessions}
        onCreateChain={handleCreateChain}
        onStartChain={handleStartChain}
        onScheduleChain={handleScheduleChain}
        onViewChainDetail={handleViewChainDetail}
        onCancelScheduledSession={handleCancelScheduledSession}
        onDeleteChain={handleDeleteChain}
        onViewAnalytics={() => setState(prev => ({ ...prev, currentView: 'analytics' }))}
      />
    );
    
  case 'analytics':
    return (
      <AnalyticsView
        chains={state.chains}
        completionHistory={state.completionHistory}
        onBack={() => setState(prev => ({ ...prev, currentView: 'dashboard' }))}
      />
    );
    
  // ... 其他 cases
}
```

## 4. 直接使用单个组件

如果只想在现有页面中使用单个可视化组件，可以这样导入使用：

```tsx
import { StreakProgress, HabitHeatmap, HabitStats } from './components/visualizations';

// 在组件中使用
<StreakProgress
  completed={chain.currentStreak}
  goal={30}
  title="本月目标"
/>

<HabitHeatmap
  data={heatmapData}
  title="完成情况"
  startDate={startDate}
  endDate={endDate}
/>

<HabitStats
  data={statsData}
/>
```

## 5. 数据转换示例

将现有的 Chain 和 CompletionHistory 数据转换为组件所需格式：

```tsx
// 生成热力图数据
const generateHeatmapData = (chain: Chain, history: CompletionHistory[]) => {
  const dates = generateDateRange(startDate, endDate);
  return dates.map(date => ({
    date: date.toISOString().split('T')[0],
    completed: history.some(h => 
      h.chainId === chain.id && 
      h.wasSuccessful && 
      h.completedAt.toDateString() === date.toDateString()
    )
  }));
};

// 生成统计数据
const generateStatsData = (chain: Chain, history: CompletionHistory[]) => {
  const chainHistory = history.filter(h => h.chainId === chain.id);
  const successful = chainHistory.filter(h => h.wasSuccessful).length;
  
  return {
    period: "本周",
    completed: successful,
    goal: 7,
    totalAttempts: chainHistory.length,
    currentStreak: chain.currentStreak,
    bestStreak: Math.max(chain.currentStreak, chain.auxiliaryStreak),
    successRate: chainHistory.length > 0 ? Math.round((successful / chainHistory.length) * 100) : 0
  };
};
```

## 使用方式

1. **完整分析页面**: 使用 `AnalyticsView` 组件获得完整的数据分析体验
2. **个别组件**: 在现有页面中嵌入 `StreakProgress`、`HabitHeatmap` 或 `HabitStats` 组件
3. **自定义组合**: 使用 `HabitDashboard` 组件作为单个习惯的完整数据看板

所有组件都使用了与现有项目一致的 Tailwind CSS 样式和中文字体配置。