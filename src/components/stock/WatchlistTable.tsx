import { useState, useMemo } from 'react';
import { RefreshCw, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import type { Market, StockQuote } from '@/types';
import { useMarketStore } from '@/store/marketStore';
import { INDIAN_STOCKS } from '@/data/indianStocks';
import { GLOBAL_STOCKS } from '@/data/globalStocks';
import { StockRow } from './StockRow';
import { SearchBar } from '@/components/ui/SearchBar';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';

interface WatchlistTableProps {
  market: Market;
}

const SORT_FIELDS: { key: keyof StockQuote; label: string }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  { key: 'change', label: 'Change' },
  { key: 'changePercent', label: '% Change' },
  { key: 'volume', label: 'Volume' },
  { key: 'marketCap', label: 'Mkt Cap' },
];

const SECTORS = ['All', 'Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Staples', 'Consumer Discretionary', 'Materials', 'Industrials', 'Utilities', 'Communication'];

export function WatchlistTable({ market }: WatchlistTableProps) {
  const {
    indiaWatchlist, globalWatchlist, quotes, loading,
    selectedSymbol, setSelectedSymbol, removeFromWatchlist,
    addToWatchlist, refreshQuotes, setSearchQuery,
    searchQuery, sortField, sortDir, setSortField,
    filterSector, setFilterSector,
  } = useMarketStore();

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const watchlist = market === 'india' ? indiaWatchlist : globalWatchlist;
  const allStocks = market === 'india' ? INDIAN_STOCKS : GLOBAL_STOCKS;

  const watchlistSymbols = new Set(watchlist.map(w => w.symbol));

  const filteredRows = useMemo(() => {
    let rows = watchlist.map(w => ({
      entry: w,
      quote: quotes[w.symbol],
      meta: allStocks.find(s => s.symbol === w.symbol),
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        r.entry.symbol.toLowerCase().includes(q) ||
        r.meta?.name.toLowerCase().includes(q) ||
        r.meta?.sector?.toLowerCase().includes(q)
      );
    }

    if (filterSector && filterSector !== 'All') {
      rows = rows.filter(r => r.meta?.sector === filterSector);
    }

    rows.sort((a, b) => {
      const av = a.quote?.[sortField] ?? 0;
      const bv = b.quote?.[sortField] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return rows;
  }, [watchlist, quotes, searchQuery, filterSector, sortField, sortDir, allStocks]);

  const addCandidates = useMemo(() => {
    if (!showAddPanel) return [];
    return allStocks
      .filter(s => !watchlistSymbols.has(s.symbol))
      .filter(s => !addSearch || s.symbol.toLowerCase().includes(addSearch.toLowerCase()) || s.name.toLowerCase().includes(addSearch.toLowerCase()))
      .slice(0, 20);
  }, [showAddPanel, allStocks, watchlistSymbols, addSearch]);

  const SortIcon = ({ field }: { field: keyof StockQuote }) => {
    if (sortField !== field) return <ChevronUp size={10} className="text-slate-600" />;
    return sortDir === 'asc' ? <ChevronUp size={10} className="text-blue-400" /> : <ChevronDown size={10} className="text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-[#2a2d3e] flex-wrap">
        <SearchBar value={searchQuery} onChange={setSearchQuery} className="flex-1 min-w-[160px]" />
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="bg-[#1a1d26] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/60"
        >
          {SECTORS.map(s => <option key={s} value={s === 'All' ? '' : s}>{s}</option>)}
        </select>
        <button
          onClick={() => refreshQuotes(market)}
          disabled={loading.quotes}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1d26] border border-[#2a2d3e] rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading.quotes ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          onClick={() => setShowAddPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            showAddPanel ? 'bg-blue-600 text-white' : 'bg-[#1a1d26] border border-[#2a2d3e] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus size={12} />
          Add Stock
        </button>
        <Badge variant="blue">{watchlist.length} / 500</Badge>
      </div>

      {/* Add stock panel */}
      {showAddPanel && (
        <div className="border-b border-[#2a2d3e] bg-[#0f1117] p-3">
          <SearchBar value={addSearch} onChange={setAddSearch} placeholder="Search to add stocks..." className="mb-2" />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {addCandidates.map(s => (
              <div
                key={s.symbol}
                onClick={() => { addToWatchlist(s.symbol, market); }}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1e2130] cursor-pointer group"
              >
                <div>
                  <span className="text-sm font-medium text-slate-200">{s.symbol}</span>
                  <span className="text-xs text-slate-500 ml-2">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="gray">{s.sector}</Badge>
                  <Plus size={12} className="text-slate-500 group-hover:text-blue-400" />
                </div>
              </div>
            ))}
            {addCandidates.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No stocks found. All available stocks may already be in your watchlist.</p>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0f1117] z-10">
            <tr className="border-b border-[#2a2d3e]">
              <th className="pl-4 pr-2 py-2 text-left w-8">
                <span className="text-xs text-slate-600">#</span>
              </th>
              <th className="px-4 py-2 text-left">
                <button onClick={() => setSortField('symbol')} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200">
                  Symbol <SortIcon field="symbol" />
                </button>
              </th>
              {SORT_FIELDS.slice(1).map(({ key, label }) => (
                <th key={key} className="px-4 py-2 text-right">
                  <button onClick={() => setSortField(key)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 ml-auto">
                    {label} <SortIcon field={key} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">7d</th>
              <th className="px-4 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {loading.quotes && filteredRows.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)
              : filteredRows.map((row, i) =>
                  row.quote ? (
                    <StockRow
                      key={row.entry.symbol}
                      quote={row.quote}
                      watchlistEntry={row.entry}
                      isSelected={selectedSymbol === row.entry.symbol}
                      onSelect={setSelectedSymbol}
                      onRemove={() => removeFromWatchlist(row.entry.symbol, market)}
                      rank={i + 1}
                    />
                  ) : (
                    <TableRowSkeleton key={row.entry.symbol} cols={9} />
                  )
                )
            }
            {!loading.quotes && filteredRows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                  No stocks match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
