import React from "react";

export interface UsageStats {
  tokens_used: number;
  quota_limit: number;
  usage_percentage: number;
  reset_date: string;
  days_until_reset: number;
  is_quota_exceeded: boolean;
  warning_level: "normal" | "warning" | "critical";
}

interface TokenUsageWidgetProps {
  stats: UsageStats | null;
  onExpand?: () => void;
}

export const TokenUsageWidget: React.FC<TokenUsageWidgetProps> = ({
  stats,
  onExpand,
}) => {
  if (!stats) {
    return null;
  }

  const formatTokens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getColorClass = (): string => {
    if (stats.warning_level === "critical") {
      return "bg-red-100 border-red-300 text-red-900";
    }
    if (stats.warning_level === "warning") {
      return "bg-yellow-100 border-yellow-300 text-yellow-900";
    }
    return "bg-green-100 border-green-300 text-green-900";
  };

  const getIconClass = (): string => {
    if (stats.warning_level === "critical") {
      return "text-red-600";
    }
    if (stats.warning_level === "warning") {
      return "text-yellow-600";
    }
    return "text-green-600";
  };

  return (
    <button
      onClick={onExpand}
      className={`w-full p-3 rounded border ${getColorClass()} transition-colors hover:shadow-md`}
      aria-label="Token usage statistics"
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <div className="font-semibold text-sm">Tokens</div>
          <div className="text-xs opacity-75">
            {formatTokens(stats.tokens_used)}/{formatTokens(stats.quota_limit)}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getIconClass()}`}>
            {stats.usage_percentage.toFixed(1)}%
          </div>
          <div className="text-xs opacity-75">
            {stats.days_until_reset}d left
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 w-full bg-gray-300 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            stats.warning_level === "critical"
              ? "bg-red-600"
              : stats.warning_level === "warning"
                ? "bg-yellow-600"
                : "bg-green-600"
          }`}
          style={{ width: `${Math.min(stats.usage_percentage, 100)}%` }}
        />
      </div>
    </button>
  );
};
