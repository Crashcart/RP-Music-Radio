import React from "react";
import { UsageStats } from "./TokenUsageWidget";

interface TokenUsageModalProps {
  stats: UsageStats;
  isOpen: boolean;
  onClose: () => void;
}

export const TokenUsageModal: React.FC<TokenUsageModalProps> = ({
  stats,
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
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

  const estimatedDaysRemaining = Math.max(
    1,
    Math.floor(
      (stats.quota_limit - stats.tokens_used) /
        (stats.tokens_used / Math.max(1, 30 - stats.days_until_reset)),
    ),
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">API Token Usage</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Usage Overview */}
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600 mb-2">Monthly Usage</div>
            <div className="text-3xl font-bold mb-2">
              {stats.usage_percentage.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
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
          </div>

          {/* Token Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-xs text-gray-600">Used</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatTokens(stats.tokens_used)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600">Limit</div>
              <div className="text-lg font-semibold text-gray-600">
                {formatTokens(stats.quota_limit)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-xs text-gray-600 mb-1">Reset Date</div>
            <div className="font-semibold text-gray-800">
              {stats.reset_date}
            </div>
            <div className="text-sm text-gray-600">
              ({stats.days_until_reset} days remaining)
            </div>
          </div>

          {/* Warnings */}
          {stats.warning_level === "critical" && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <div className="font-semibold text-red-800 mb-1">⚠️ Critical</div>
              <div className="text-sm text-red-700">
                Quota is nearly exhausted. New generations may fail.
              </div>
            </div>
          )}

          {stats.warning_level === "warning" && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <div className="font-semibold text-yellow-800 mb-1">
                ⚠️ Warning
              </div>
              <div className="text-sm text-yellow-700">
                You've used {stats.usage_percentage.toFixed(1)}% of your monthly
                quota. Estimated {estimatedDaysRemaining} days until exhausted.
              </div>
            </div>
          )}

          {stats.is_quota_exceeded && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <div className="font-semibold text-red-800 mb-1">
                ❌ Quota Exhausted
              </div>
              <div className="text-sm text-red-700">
                Your monthly quota is exhausted. Check back on{" "}
                {stats.reset_date}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 text-center mt-4">
            Usage is tracked in real-time. Quota resets monthly.
          </div>
        </div>
      </div>
    </div>
  );
};
