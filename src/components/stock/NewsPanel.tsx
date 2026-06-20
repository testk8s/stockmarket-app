import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NewsItem } from '@/types';
import { timeAgo } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';

interface NewsPanelProps {
  news: NewsItem[];
  filterSymbol?: string;
  loading?: boolean;
}

function SentimentIcon({ sentiment }: { sentiment: NewsItem['sentiment'] }) {
  if (sentiment === 'positive') return <TrendingUp size={12} className="text-green-400" />;
  if (sentiment === 'negative') return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-slate-400" />;
}

function sentimentVariant(s: NewsItem['sentiment']): 'green' | 'red' | 'gray' {
  return s === 'positive' ? 'green' : s === 'negative' ? 'red' : 'gray';
}

function SentimentBar({ score }: { score: number }) {
  const pct = Math.abs(score) * 100;
  const isPos = score >= 0;
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-[#2a2d3e] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(100, pct)}%`, marginLeft: isPos ? '50%' : `${50 - pct}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums ${isPos ? 'text-green-400' : 'text-red-400'}`}>
        {isPos ? '+' : ''}{(score * 100).toFixed(0)}
      </span>
    </div>
  );
}

export function NewsPanel({ news, filterSymbol, loading }: NewsPanelProps) {
  const filtered = filterSymbol
    ? news.filter(n => n.relatedSymbols.includes(filterSymbol))
    : news;

  const avgSentiment = filtered.length > 0
    ? filtered.reduce((s, n) => s + n.sentimentScore, 0) / filtered.length
    : 0;

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-1/4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sentiment summary */}
      {filtered.length > 0 && (
        <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-400 font-medium">News Sentiment ({filtered.length} articles)</p>
            <Badge variant={avgSentiment > 0.1 ? 'green' : avgSentiment < -0.1 ? 'red' : 'gray'}>
              {avgSentiment > 0.1 ? 'Positive' : avgSentiment < -0.1 ? 'Negative' : 'Neutral'}
            </Badge>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400">{filtered.filter(n => n.sentiment === 'positive').length} positive</span>
            <span className="text-red-400">{filtered.filter(n => n.sentiment === 'negative').length} negative</span>
            <span className="text-slate-500">{filtered.filter(n => n.sentiment === 'neutral').length} neutral</span>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">No news articles found.</div>
      ) : (
        filtered.map(item => (
          <div key={item.id} className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4 hover:border-[#3a3d4e] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <SentimentIcon sentiment={item.sentiment} />
                  <Badge variant={sentimentVariant(item.sentiment)}>
                    {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                  </Badge>
                  <span className="text-xs text-slate-500">{item.source}</span>
                  <span className="text-xs text-slate-600">{timeAgo(item.publishedAt)}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-200 leading-snug mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.summary}</p>
                <SentimentBar score={item.sentimentScore} />
                <div className="flex items-center gap-1.5 mt-2">
                  {item.relatedSymbols.map(s => (
                    <Badge key={s} variant="blue" size="sm">{s.replace('.NS', '').replace('.L', '')}</Badge>
                  ))}
                </div>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex-shrink-0 text-slate-600 hover:text-blue-400 transition-colors mt-0.5">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
