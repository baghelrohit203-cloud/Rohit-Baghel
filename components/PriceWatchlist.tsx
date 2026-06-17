import React, { useState, useMemo } from 'react';
import { PriceArticle, PriceRecord } from '../types';

interface PriceWatchlistProps {
  articles: PriceArticle[];
  onAddArticle: (article: Omit<PriceArticle, 'id' | 'createdAt' | 'updatedAt' | 'records'> & { initialRecord: Omit<PriceRecord, 'id'> }) => void;
  onAddPriceRecord: (articleId: string, record: Omit<PriceRecord, 'id'>) => void;
  onUpdatePriceRecord: (articleId: string, record: PriceRecord) => void;
  onDeletePriceRecord: (articleId: string, recordId: string) => void;
  onDeleteArticle: (articleId: string) => void;
  onUpdateArticle: (article: PriceArticle) => void;
}

const COMMON_CATEGORIES = [
  'Vegetable', 'Fruit', 'Electronics', 'Groceries', 'Fuel', 'Construction', 
  'Metal/Commodity', 'Stock Market', 'Crypto/Equity', 'Services', 'Rent/Real Estate', 'Education', 'Medicine', 'Other'
];

interface CategoryFieldLabels {
  location: string;
  locationPl: string;
  city: string;
  cityPl: string;
  state: string;
  statePl: string;
  supplier: string;
  supplierPl: string;
  contact: string;
  contactPl: string;
  unit: string;
  unitPl: string;
}

const getCategoryFields = (cat: string): CategoryFieldLabels => {
  const isStock = cat === 'Stock Market' || cat === 'Crypto/Equity';
  if (isStock) {
    return {
      location: 'STOCK EXCHANGE / FORUM',
      locationPl: 'e.g. NSE, NASDAQ, NYSE, Binance',
      city: 'CITY / MAIN BRANCH (OPTIONAL)',
      cityPl: 'e.g. Mumbai, New York',
      state: 'COUNTRY / ZONE',
      statePl: 'e.g. India, USA, Global',
      supplier: 'BROKER / BANK / PLATFORM (OPTIONAL)',
      supplierPl: 'e.g. Zerodha, Groww, Interactive Brokers',
      contact: 'BROKER CONTACT / HELP URL (OPTIONAL)',
      contactPl: 'e.g. support@zerodha.com or website root',
      unit: 'EQUITY UNIT',
      unitPl: '1 Share, Lot of 50, 1 Contract'
    };
  }
  return {
    location: 'SUB-LOCALITY / NEIGHBORHOOD',
    locationPl: 'e.g. Durgapura, Khedli Mandi',
    city: 'CITY',
    cityPl: 'e.g. Jaipur, Alwar',
    state: 'STATE / REGION',
    statePl: 'e.g. Rajasthan, Maharashtra',
    supplier: 'SUPPLIER / VENDOR INFO',
    supplierPl: 'Gupta Wholesale Corp (Optional)',
    contact: 'CONTACTS / REFS',
    contactPl: 'Phone or Stall detail (Optional)',
    unit: 'QUANTITY UNIT',
    unitPl: '1 Kg, 1 Litre, 100g, Per Unit'
  };
};

const formatRecordLocation = (rec: PriceRecord, isStock: boolean) => {
  if (isStock) {
    const parts: string[] = [];
    if (rec.location) parts.push(rec.location);
    if (rec.city) parts.push(rec.city);
    if (rec.state) parts.push(`(${rec.state})`);
    return parts.join(' ') || 'Exchange';
  } else {
    const parts: string[] = [];
    if (rec.location && rec.city) {
      parts.push(`${rec.location} (${rec.city})`);
    } else if (rec.location) {
      parts.push(rec.location);
    } else if (rec.city) {
      parts.push(rec.city);
    }
    
    if (rec.state) {
      parts.push(rec.state);
    }
    return parts.join(', ') || 'Local Market';
  }
};

export const PriceWatchlist: React.FC<PriceWatchlistProps> = ({
  articles,
  onAddArticle,
  onAddPriceRecord,
  onUpdatePriceRecord,
  onDeletePriceRecord,
  onDeleteArticle,
  onUpdateArticle
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'name' | 'lowPrice' | 'highPrice' | 'recent' | 'reliability'>('recent');

  // Expanded article IDs to view price history / multiple prices
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // comparison sort option per expanded article (price-asc, price-desc, location, time-desc, time-asc)
  const [comparisonSorts, setComparisonSorts] = useState<Record<string, 'price-asc' | 'price-desc' | 'location' | 'time-desc' | 'time-asc'>>({});

  // Modals / Creators toggles
  const [isOpenCreator, setIsOpenCreator] = useState(false);
  const [isAddingRecordToId, setIsAddingRecordToId] = useState<string | null>(null);

  // New Article Form Fields
  const [newArtName, setNewArtName] = useState('');
  const [newArtCategory, setNewArtCategory] = useState('Vegetable');
  const [newArtCustomCategory, setNewArtCustomCategory] = useState('');
  const [newArtTagsString, setNewArtTagsString] = useState('');

  // Initial / New Price Record Fields
  const [recordPrice, setRecordPrice] = useState<number | ''>('');
  const [recordCurrency, setRecordCurrency] = useState('₹');
  const [recordUnit, setRecordUnit] = useState('1 Kg');
  const [recordLocation, setRecordLocation] = useState('Khedli Mandi');
  const [recordCity, setRecordCity] = useState('Alwar');
  const [recordState, setRecordState] = useState('Rajasthan');
  const [recordSupplier, setRecordSupplier] = useState('');
  const [recordContact, setRecordContact] = useState('');
  const [recordReliability, setRecordReliability] = useState(5);
  const [recordNotes, setRecordNotes] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing existing record
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const resetForm = () => {
    setNewArtName('');
    setNewArtCategory('Vegetable');
    setNewArtCustomCategory('');
    setNewArtTagsString('');
    setRecordPrice('');
    setRecordUnit('1 Kg');
    setRecordLocation('Khedli Mandi');
    setRecordCity('Alwar');
    setRecordState('Rajasthan');
    setRecordSupplier('');
    setRecordContact('');
    setRecordReliability(5);
    setRecordNotes('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setIsOpenCreator(false);
    setIsAddingRecordToId(null);
    setEditingRecordId(null);
    setEditingArticleId(null);
  };

  const handleExportToExcel = () => {
    const headers = [
      'Article ID',
      'Article Name',
      'Category',
      'Tags',
      'Record ID',
      'Price',
      'Currency',
      'Unit',
      'Date Recorded',
      'Location',
      'City',
      'State',
      'Supplier/Broker',
      'Contact Info',
      'Reliability (1-5)',
      'Notes'
    ];

    const rows: string[][] = [];
    articles.forEach(art => {
      const recordsToExport = art.records.length > 0 ? art.records : [{} as PriceRecord];
      recordsToExport.forEach(rec => {
        rows.push([
          art.id || '',
          art.name || '',
          art.category || '',
          (art.tags || []).join(', '),
          rec.id || '',
          rec.price !== undefined ? String(rec.price) : '',
          rec.currency || '',
          rec.unit || '',
          rec.dateRecorded || '',
          rec.location || '',
          rec.city || '',
          rec.state || '',
          rec.supplierName || '',
          rec.contact || '',
          rec.reliability !== undefined ? String(rec.reliability) : '',
          rec.notes || ''
        ]);
      });
    });

    const csvContent = [
      headers.map(val => `"${val.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Price_Watchlist_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActiveCategory = () => {
    return newArtCategory === 'Other' && newArtCustomCategory.trim() 
      ? newArtCustomCategory.trim() 
      : newArtCategory;
  };

  const creatorActiveFields = useMemo(() => {
    return getCategoryFields(getActiveCategory());
  }, [newArtCategory, newArtCustomCategory]);

  const addingArticle = useMemo(() => {
    return articles.find(a => a.id === isAddingRecordToId);
  }, [articles, isAddingRecordToId]);

  const addingActiveFields = useMemo(() => {
    return getCategoryFields(addingArticle ? addingArticle.category : 'Vegetable');
  }, [addingArticle]);

  const editingArticle = useMemo(() => {
    return articles.find(a => a.id === editingArticleId);
  }, [articles, editingArticleId]);

  const editingActiveFields = useMemo(() => {
    return getCategoryFields(editingArticle ? editingArticle.category : 'Vegetable');
  }, [editingArticle]);

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtName.trim() || recordPrice === '') return;

    const finalCategory = getActiveCategory();
    const tags = newArtTagsString
      ? newArtTagsString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    onAddArticle({
      name: newArtName.trim(),
      category: finalCategory,
      tags,
      initialRecord: {
        price: Number(recordPrice),
        currency: recordCurrency,
        dateRecorded: recordDate || new Date().toISOString().split('T')[0],
        location: recordLocation.trim() || undefined,
        city: recordCity.trim() || undefined,
        state: recordState.trim() || undefined,
        supplierName: recordSupplier.trim() || undefined,
        unit: recordUnit.trim() || undefined,
        contact: recordContact.trim() || undefined,
        reliability: recordReliability,
        notes: recordNotes.trim() || undefined
      }
    });

    resetForm();
  };

  const handleAddAdditionalRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingRecordToId || recordPrice === '') return;

    onAddPriceRecord(isAddingRecordToId, {
      price: Number(recordPrice),
      currency: recordCurrency,
      dateRecorded: recordDate || new Date().toISOString().split('T')[0],
      location: recordLocation.trim() || undefined,
      city: recordCity.trim() || undefined,
      state: recordState.trim() || undefined,
      supplierName: recordSupplier.trim() || undefined,
      unit: recordUnit.trim() || undefined,
      contact: recordContact.trim() || undefined,
      reliability: recordReliability,
      notes: recordNotes.trim() || undefined
    });

    // Make sure it expands to show the new record
    setExpandedArticleId(isAddingRecordToId);
    resetForm();
  };

  const handleSaveEditedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticleId || !editingRecordId || recordPrice === '') return;

    onUpdatePriceRecord(editingArticleId, {
      id: editingRecordId,
      price: Number(recordPrice),
      currency: recordCurrency,
      dateRecorded: recordDate || new Date().toISOString().split('T')[0],
      location: recordLocation.trim() || undefined,
      city: recordCity.trim() || undefined,
      state: recordState.trim() || undefined,
      supplierName: recordSupplier.trim() || undefined,
      unit: recordUnit.trim() || undefined,
      contact: recordContact.trim() || undefined,
      reliability: recordReliability,
      notes: recordNotes.trim() || undefined
    });

    resetForm();
  };

  const startEditRecord = (art: PriceArticle, rec: PriceRecord) => {
    setEditingArticleId(art.id);
    setEditingRecordId(rec.id);
    setRecordPrice(rec.price);
    setRecordCurrency(rec.currency);
    setRecordUnit(rec.unit || '1 Kg');
    setRecordLocation(rec.location || '');
    setRecordCity(rec.city || '');
    setRecordState(rec.state || '');
    setRecordSupplier(rec.supplierName || '');
    setRecordContact(rec.contact || '');
    setRecordReliability(rec.reliability || 5);
    setRecordNotes(rec.notes || '');
    setRecordDate(rec.dateRecorded);
  };

  // Dynamically extract all states & categories for filtering dropdowns
  const availableStates = useMemo(() => {
    const statesSet = new Set<string>();
    articles.forEach(art => {
      art.records.forEach(rec => {
        if (rec.state) statesSet.add(rec.state);
      });
    });
    return Array.from(statesSet).sort();
  }, [articles]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(art => {
      if (art.category) cats.add(art.category);
    });
    return Array.from(cats).sort();
  }, [articles]);

  // Derived calculations helper
  const getMinMaxAvgPrice = (records: PriceRecord[]) => {
    if (records.length === 0) return { min: 0, max: 0, avg: 0, latest: null };
    const sorted = [...records].sort((a, b) => a.price - b.price);
    const sum = records.reduce((accum, curr) => accum + curr.price, 0);
    const latest = [...records].sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())[0];
    return {
      min: sorted[0].price,
      max: sorted[sorted.length - 1].price,
      avg: Math.round((sum / records.length) * 10) / 10,
      latest
    };
  };

  // Perform filtration & search
  const filteredAndSortedArticles = useMemo(() => {
    let result = articles.filter(art => {
      // Category Filter
      if (activeCategoryFilter !== 'All' && art.category !== activeCategoryFilter) {
        return false;
      }

      // State Filter (Must match at least one record within the article)
      if (selectedStateFilter !== 'All') {
        const hasMatchingState = art.records.some(rec => rec.state?.toLowerCase() === selectedStateFilter.toLowerCase());
        if (!hasMatchingState) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = art.name.toLowerCase().includes(query);
        const catMatch = art.category.toLowerCase().includes(query);
        const tagsMatch = art.tags.some(t => t.toLowerCase().includes(query));
        const recordsMatch = art.records.some(rec => 
          rec.location?.toLowerCase().includes(query) || 
          rec.state?.toLowerCase().includes(query) || 
          rec.supplierName?.toLowerCase().includes(query) ||
          rec.notes?.toLowerCase().includes(query)
        );
        return nameMatch || catMatch || tagsMatch || recordsMatch;
      }

      return true;
    });

    // Sorting algorithm
    result.sort((a, b) => {
      const statsA = getMinMaxAvgPrice(a.records);
      const statsB = getMinMaxAvgPrice(b.records);

      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'lowPrice') {
        const minA = statsA.min;
        const minB = statsB.min;
        return minA - minB;
      }
      if (sortOption === 'highPrice') {
        const maxA = statsA.max;
        const maxB = statsB.max;
        return maxB - maxA; // High to Low
      }
      if (sortOption === 'reliability') {
        const relA = statsA.latest?.reliability ?? 0;
        const relB = statsB.latest?.reliability ?? 0;
        return relB - relA; // Highest first
      }
      // 'recent' by default
      const timeA = statsA.latest ? new Date(statsA.latest.dateRecorded).getTime() : 0;
      const timeB = statsB.latest ? new Date(statsB.latest.dateRecorded).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [articles, activeCategoryFilter, selectedStateFilter, searchQuery, sortOption]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 select-none">
      
      {/* HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#2b2925] dark:text-[#e5e5e5] tracking-tighter italic uppercase flex items-center gap-2">
            <span className="p-1 px-2.5 bg-[#2d6a4f] text-white rounded-xl text-xs not-italic font-black py-1.5 shadow-sm">₹</span>
            <span>Price Watchlist</span>
          </h2>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mt-1">
            Log, analyze & compare prices of vegetables, commodities, or services globally
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Export Catalog to Excel Button */}
          <button
            onClick={handleExportToExcel}
            className="px-4 py-2.5 bg-white border border-stone-200 dark:bg-stone-905 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850 rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider"
            title="Export Entire Price Catalog to Excel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Catalog</span>
          </button>

          <button
            onClick={() => {
              if (isOpenCreator || isAddingRecordToId || editingRecordId) {
                resetForm();
              } else {
                setIsOpenCreator(true);
              }
            }}
            className={`px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
              isOpenCreator || isAddingRecordToId || editingRecordId
                ? 'bg-stone-200 dark:bg-stone-850 text-stone-600 dark:text-stone-300' 
                : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332] shadow-[#2d6a4f]/10'
            }`}
          >
            {isOpenCreator || isAddingRecordToId || editingRecordId ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                <span>Cancel</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>Record Price</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK STATS INFOGRAPHIC BANNER */}
      {articles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#faf8f5] dark:bg-[#121212] p-4 rounded-3xl border border-stone-205/60 dark:border-stone-800">
          <div className="text-center md:border-r border-stone-200/40 dark:border-stone-850 p-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-1">Total Articles</span>
            <span className="text-xl font-black text-[#2b2925] dark:text-stone-200">{articles.length}</span>
          </div>
          <div className="text-center md:border-r border-stone-200/40 dark:border-stone-850 p-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-1">Price Feeds</span>
            <span className="text-xl font-black text-[#2d6a4f]">
              {articles.reduce((acc, curr) => acc + curr.records.length, 0)}
            </span>
          </div>
          <div className="text-center md:border-r border-stone-200/40 dark:border-stone-850 p-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-1">Covered Categories</span>
            <span className="text-xl font-black text-[#7a523a]">{availableCategories.length || 1}</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block mb-1">States Traversed</span>
            <span className="text-xl font-black text-[#b87d14]">{availableStates.length || 1}</span>
          </div>
        </div>
      )}

      {/* CREATION WORKSPACE FOR ARTICLE & INITIAL PRICE FEED */}
      {isOpenCreator && (
        <form onSubmit={handleCreateArticle} className="glass p-6 rounded-3xl border border-stone-200/60 bg-white/95 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-stone-200/40 pb-3">
            <h3 className="text-xs font-black text-[#2d6a4f] uppercase tracking-widest flex items-center gap-1.5">
              <span>🎯</span>
              <span>Create New Article Catalog with Initial Price</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Article / Product Name</label>
              <input 
                type="text" 
                value={newArtName} 
                onChange={(e) => setNewArtName(e.target.value)} 
                required
                placeholder="e.g. Alwar Onions, Petrol Power, Gold Bar"
                className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-3 text-sm text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Category Designation</label>
              <div className="space-y-2">
                <select
                  value={newArtCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setNewArtCategory(cat);
                    if (cat !== 'Other') setNewArtCustomCategory('');
                    if (cat === 'Stock Market' || cat === 'Crypto/Equity') {
                      setRecordUnit('1 Share');
                      setRecordLocation('NSE');
                      setRecordCity('Mumbai');
                      setRecordState('India');
                      setRecordSupplier('Zerodha');
                    } else {
                      setRecordUnit('1 Kg');
                      setRecordLocation('Durgapura');
                      setRecordCity('Jaipur');
                      setRecordState('Rajasthan');
                      setRecordSupplier('');
                    }
                  }}
                  className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-[#2b2925] outline-none cursor-pointer"
                >
                  {COMMON_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {newArtCategory === 'Other' && (
                  <input 
                    type="text"
                    value={newArtCustomCategory}
                    onChange={(e) => setNewArtCustomCategory(e.target.value)}
                    placeholder="Type custom category..."
                    required
                    className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-2 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Search Tags (Comma separated)</label>
            <input 
              type="text" 
              value={newArtTagsString} 
              onChange={(e) => setNewArtTagsString(e.target.value)} 
              placeholder="e.g. wholesale, fresh, premium, organic, imports"
              className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs text-[#2b2925] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
            />
          </div>

          {/* INITIAL FEED DECK */}
          <div className="bg-[#2d6a4f]/5 p-5 rounded-2xl border border-[#2d6a4f]/10 space-y-4">
            <span className="text-[9px] font-black uppercase text-[#2d6a4f] tracking-widest block">FEED INITIAL PRICE RECORD</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Price */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">PRICE</label>
                <div className="relative">
                  <select 
                    value={recordCurrency}
                    onChange={(e) => setRecordCurrency(e.target.value)}
                    className="absolute left-1.5 top-2 bg-transparent text-xs text-stone-600 font-bold border-none outline-none"
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                  <input 
                    type="number" 
                    step="any"
                    value={recordPrice}
                    onChange={(e) => setRecordPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    placeholder="40"
                    className="w-full bg-white border border-stone-200/80 rounded-lg pl-14 pr-2 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                  />
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.unit}</label>
                <input 
                  type="text" 
                  value={recordUnit}
                  onChange={(e) => setRecordUnit(e.target.value)}
                  placeholder={creatorActiveFields.unitPl}
                  required
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.location}</label>
                <input 
                  type="text" 
                  value={recordLocation}
                  onChange={(e) => setRecordLocation(e.target.value)}
                  placeholder={creatorActiveFields.locationPl}
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.city}</label>
                <input 
                  type="text" 
                  value={recordCity}
                  onChange={(e) => setRecordCity(e.target.value)}
                  placeholder={creatorActiveFields.cityPl}
                  required
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>

              {/* State */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.state}</label>
                <input 
                  type="text" 
                  value={recordState}
                  onChange={(e) => setRecordState(e.target.value)}
                  placeholder={creatorActiveFields.statePl}
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Supplier Info */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.supplier}</label>
                <input 
                  type="text" 
                  value={recordSupplier}
                  onChange={(e) => setRecordSupplier(e.target.value)}
                  placeholder={creatorActiveFields.supplierPl}
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>

              {/* Supplier Contact Info */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">{creatorActiveFields.contact}</label>
                <input 
                  type="text" 
                  value={recordContact}
                  onChange={(e) => setRecordContact(e.target.value)}
                  placeholder={creatorActiveFields.contactPl}
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>

              {/* Quality / Reliability Stars */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">SOURCE RELIABILITY</label>
                <div className="flex items-center gap-1.5 bg-white border border-stone-200/80 rounded-lg p-1.5 h-[34px]">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRecordReliability(star)}
                    >
                      <svg 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill={star <= recordReliability ? '#b87d14': 'none'} 
                        stroke={star <= recordReliability ? '#b87d14' : '#a39d8f'} 
                        strokeWidth="2.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                  <span className="text-[8px] mono text-stone-400 font-bold ml-auto">{recordReliability}/5</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Notes */}
              <div className="sm:col-span-3">
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">MEMO NOTES</label>
                <input 
                  type="text" 
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Recorded on morning transaction, bulk buy discount applies..."
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-xs text-[#2b2925] focus:outline-none"
                />
              </div>
              
              {/* Date */}
              <div>
                <label className="text-[9px] font-black text-stone-550 uppercase tracking-widest block mb-1.5">RECORDING DATE</label>
                <input 
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full bg-white border border-stone-200/80 rounded-lg px-2 py-1 text-xs text-[#2b2925] font-mono cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-stone-200/40">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-xs font-black text-stone-500 hover:bg-stone-100 rounded-xl"
            >
              Clear
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-[#2d6a4f] text-white text-xs font-black rounded-xl hover:bg-[#1b4332] transition-colors"
            >
              Save Catalog Info
            </button>
          </div>
        </form>
      )}

      {/* ADDITIONAL PRICE FEED FORM (COMPACT PANEL) */}
      {isAddingRecordToId && (
        <form onSubmit={handleAddAdditionalRecord} className="glass p-6 rounded-3xl border border-[#2d6a4f]/30 bg-[#2d6a4f]/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-stone-200/45 pb-2">
            <h4 className="text-xs font-black uppercase text-[#2d6a4f] tracking-wider">
              Add Record Feed to: "{articles.find(a => a.id === isAddingRecordToId)?.name}"
            </h4>
            <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-700 font-extrabold text-xs">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] font-black text-stone-550 block mb-1">PRICE</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-stone-500">{recordCurrency}</span>
                <input 
                  type="number" 
                  step="any"
                  value={recordPrice}
                  onChange={(e) => setRecordPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  placeholder="40"
                  className="w-full bg-white border border-stone-200 rounded-lg pl-6 pr-2 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.unit}</label>
              <input 
                type="text" 
                value={recordUnit} 
                placeholder={addingActiveFields.unitPl}
                onChange={(e) => setRecordUnit(e.target.value)} 
                required 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.location}</label>
              <input 
                type="text" 
                value={recordLocation} 
                placeholder={addingActiveFields.locationPl}
                onChange={(e) => setRecordLocation(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.city}</label>
              <input 
                type="text" 
                value={recordCity} 
                placeholder={addingActiveFields.cityPl}
                onChange={(e) => setRecordCity(e.target.value)} 
                required
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.state}</label>
              <input 
                type="text" 
                value={recordState} 
                placeholder={addingActiveFields.statePl}
                onChange={(e) => setRecordState(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.supplier}</label>
              <input 
                type="text" 
                value={recordSupplier} 
                placeholder={addingActiveFields.supplierPl}
                onChange={(e) => setRecordSupplier(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{addingActiveFields.contact}</label>
              <input 
                type="text" 
                value={recordContact} 
                placeholder={addingActiveFields.contactPl}
                onChange={(e) => setRecordContact(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">RELIABILITY</label>
              <div className="flex gap-1 items-center bg-white border border-stone-200 rounded-lg p-1.5 h-[34px]">
                {[1,2,3,4,5].map(star => (
                  <button type="button" key={star} onClick={() => setRecordReliability(star)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={star <= recordReliability ? '#b87d14': 'none'} stroke={star <= recordReliability ? '#b87d14' : '#a39d8f'}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[9px] font-black text-stone-500 block mb-1">NOTES</label>
              <input 
                type="text" 
                value={recordNotes} 
                onChange={(e) => setRecordNotes(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">DATE</label>
              <input 
                type="date" 
                value={recordDate} 
                onChange={(e) => setRecordDate(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-850 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200/30">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs font-black text-stone-500">Cancel</button>
            <button type="submit" className="px-5 py-1.5 bg-[#2d6a4f] text-white rounded-lg text-xs font-black">Save Price Entry</button>
          </div>
        </form>
      )}

      {/* EDITING PRICE RECORD MODE */}
      {editingRecordId && editingArticleId && (
        <form onSubmit={handleSaveEditedRecord} className="glass p-6 rounded-3xl border border-amber-600/30 bg-amber-50/10 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-amber-600/30 pb-2">
            <h4 className="text-xs font-black uppercase text-amber-700 tracking-wider">
               Edit Price Record Feed parameters
            </h4>
            <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-700 font-extrabold text-xs">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] font-black text-stone-550 block mb-1">PRICE</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-stone-500">{recordCurrency}</span>
                <input 
                  type="number" 
                  step="any"
                  value={recordPrice}
                  onChange={(e) => setRecordPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full bg-white border border-stone-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.unit}</label>
              <input 
                type="text" 
                value={recordUnit} 
                placeholder={editingActiveFields.unitPl}
                onChange={(e) => setRecordUnit(e.target.value)} 
                required 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.location}</label>
              <input 
                type="text" 
                value={recordLocation} 
                placeholder={editingActiveFields.locationPl}
                onChange={(e) => setRecordLocation(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.city}</label>
              <input 
                type="text" 
                value={recordCity} 
                placeholder={editingActiveFields.cityPl}
                onChange={(e) => setRecordCity(e.target.value)} 
                required
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.state}</label>
              <input 
                type="text" 
                value={recordState} 
                placeholder={editingActiveFields.statePl}
                onChange={(e) => setRecordState(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.supplier}</label>
              <input 
                type="text" 
                value={recordSupplier} 
                placeholder={editingActiveFields.supplierPl}
                onChange={(e) => setRecordSupplier(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">{editingActiveFields.contact}</label>
              <input 
                type="text" 
                value={recordContact} 
                placeholder={editingActiveFields.contactPl}
                onChange={(e) => setRecordContact(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">QUALITY</label>
              <div className="flex gap-1 items-center bg-white border border-stone-200 rounded-lg p-1.5 h-[34px]">
                {[1,2,3,4,5].map(star => (
                  <button type="button" key={star} onClick={() => setRecordReliability(star)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={star <= recordReliability ? '#b87d14': 'none'} stroke={star <= recordReliability ? '#b87d14' : '#a39d8f'}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[9px] font-black text-stone-500 block mb-1">REMARKS NOTES</label>
              <input 
                type="text" 
                value={recordNotes} 
                onChange={(e) => setRecordNotes(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 block mb-1">DATE</label>
              <input 
                type="date" 
                value={recordDate} 
                onChange={(e) => setRecordDate(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200/30">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs font-black text-stone-500">Cancel</button>
            <button type="submit" className="px-5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-black">Update and Save Parameters</button>
          </div>
        </form>
      )}

      {/* FILTER SEARCH & RE-ORGANIZATION CONTROL STRIP */}
      <div className="glass p-4 rounded-3xl bg-[#faf8f5]/80 dark:bg-[#121212]/30 border border-stone-205/60 dark:border-stone-800 space-y-3.5">
        
        {/* Search Input */}
        <div className="relative">
          <span className="absolute left-4 top-3.5 text-stone-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search price feeds (e.g., Alwar Onions, veggies, wholesale, Rajasthan)..."
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 rounded-2xl pl-11 pr-4 py-3 text-xs text-[#2b2925] dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-xs font-bold text-stone-400 hover:text-stone-600">
              ✕ Clear
            </button>
          )}
        </div>

        {/* Categories Scroller Buttons */}
        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          <button
            onClick={() => setActiveCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
              activeCategoryFilter === 'All'
                ? 'bg-[#2d6a4f] text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-500 dark:bg-stone-850 dark:text-stone-400'
            }`}
          >
            All Categories ({articles.length})
          </button>
          {availableCategories.map(cat => {
            const count = articles.filter(a => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                  activeCategoryFilter === cat
                    ? 'bg-[#2d6a4f] text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-500 dark:bg-stone-850 dark:text-stone-400'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Sub-Filters: sorting and state filters */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-stone-200/40">
          {/* SORT SELECTOR */}
          <div className="flex-1">
            <label className="text-[10px] font-black text-stone-450 uppercase tracking-widest block mb-1.5">SORT ARTICLES BY</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-[#2b2925] dark:text-stone-300 outline-none"
            >
              <option value="recent">🕒 Date: Most Recently Recorded</option>
              <option value="lowPrice">⬇️ Price: Lowest First</option>
              <option value="highPrice">⬆️ Price: Highest First</option>
              <option value="name">🔤 Alphabetical (A - Z)</option>
              <option value="reliability">🏆 Star Reliability Index</option>
            </select>
          </div>

          {/* STATE FILTER SELECTOR */}
          <div className="flex-1">
            <label className="text-[10px] font-black text-stone-450 uppercase tracking-widest block mb-1.5">FILTER REGIONS (STATE)</label>
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-[#2b2925] dark:text-stone-300 outline-none"
            >
              <option value="All">🌍 Globally Listed ({articles.length})</option>
              {availableStates.map(st => (
                <option key={st} value={st}>📍 {st}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* RENDERED CARDS GRID */}
      <div className="space-y-4">
        {filteredAndSortedArticles.map(art => {
          const isExpanded = expandedArticleId === art.id;
          const stats = getMinMaxAvgPrice(art.records);

          return (
            <div 
              key={art.id}
              className="glass p-5 rounded-3xl border border-stone-200/40 bg-white/95 dark:bg-[#121212]/80 relative overflow-hidden group shadow-sm transition-all hover:border-[#2d6a4f]/30"
            >
              {/* Colored Ribbon */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#2d6a4f]" />

              {/* Header section with Name / Badges / Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-[#2d6a4f]/10 text-[#2d6a4f] px-2 py-0.5 rounded-full">
                      {art.category}
                    </span>
                    {art.tags.map(t => (
                      <span key={t} className="text-[8px] font-bold tracking-widest text-[#7a523a] uppercase bg-[#7a523a]/5 px-2 py-0.5 rounded-full border border-[#7a523a]/10">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-base font-black text-[#2b2925] dark:text-stone-200 tracking-tight leading-snug">
                    {art.name}
                  </h3>
                </div>

                {/* Main Card Action Bar */}
                <div className="flex gap-2 self-end sm:self-start opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setIsAddingRecordToId(art.id)}
                    className="p-1 px-2.5 bg-[#2d6a4f]/10 hover:bg-[#2d6a4f]/20 text-[#2d6a4f] rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                    title="Add alternative cost details here"
                  >
                    + Add Price
                  </button>
                  <button 
                    onClick={() => { if(confirm('Are you sure you want to delete this article and all its price logs?')) onDeleteArticle(art.id); }}
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-850 rounded"
                    title="Delete entire article record"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              {/* Price analytics ribbon */}
              <div className="mt-4 grid grid-cols-3 gap-2 bg-stone-50 dark:bg-stone-900/30 p-2.5 rounded-2xl border border-stone-200/30">
                <div className="text-center border-r border-stone-200/40">
                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">Lowest Listed</span>
                  <span className="text-sm font-extrabold text-[#2d6a4f]">{stats.latest ? stats.latest.currency : '₹'}{stats.min}</span>
                </div>
                <div className="text-center border-r border-stone-200/40">
                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">Highest Listed</span>
                  <span className="text-sm font-extrabold text-stone-700 dark:text-stone-300">{stats.latest ? stats.latest.currency : '₹'}{stats.max}</span>
                </div>
                <div className="text-center">
                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest block">Average Listed</span>
                  <span className="text-sm font-extrabold text-[#7a523a]">{stats.latest ? stats.latest.currency : '₹'}{stats.avg}</span>
                </div>
              </div>

              {/* Compact summary of latest price record */}
              {stats.latest && (
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1">
                    <span className="text-[#2d6a4f] font-black py-0.5 px-1 bg-[#2d6a4f]/10 rounded font-mono text-xs">
                       {stats.latest.currency}{stats.latest.price}
                    </span>
                    <span>per {stats.latest.unit || (art.category === 'Stock Market' || art.category === 'Crypto/Equity' ? 'Share' : 'Kg')}</span>
                  </div>
                  <div className="text-right flex items-center gap-1 text-[9px] text-stone-400 font-mono">
                    <span>
                      { (art.category === 'Stock Market' || art.category === 'Crypto/Equity') ? '🏛️ ' : '📍 ' }
                      {formatRecordLocation(stats.latest, art.category === 'Stock Market' || art.category === 'Crypto/Equity')}
                    </span>
                    <span>• {stats.latest.dateRecorded}</span>
                  </div>
                </div>
              )}

              {/* EXPAND BUTTON */}
              <div className="mt-4 pt-3.5 border-t border-stone-200/40 flex items-center justify-between">
                <button 
                  onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                  className="text-[10px] uppercase tracking-widest text-[#7a523a] hover:text-[#5c3c26] font-black flex items-center gap-1.5 transition-colors"
                >
                  <span>📊</span>
                  <span>{isExpanded ? 'Hide dynamic comparative prices' : `Compare ${art.records.length} Listed Price Feeds`}</span>
                </button>
                <span className="text-[9px] font-mono text-stone-400 font-bold">Records logged: {art.records.length}</span>
              </div>

              {/* DETAILED PRICE FEEDS LIST (TABLE / CARDS) */}
              {isExpanded && (() => {
                const activeCompSort = comparisonSorts[art.id] || 'price-asc';
                const isStockArt = art.category === 'Stock Market' || art.category === 'Crypto/Equity';

                // Helpers for price math
                const maxPrice = Math.max(...art.records.map(r => r.price), 1);
                const minPrice = Math.min(...art.records.map(r => r.price), maxPrice);
                const avgPrice = art.records.reduce((sum, r) => sum + r.price, 0) / art.records.length;

                // Chronological sorting for trend calculation
                const chronologicalRecords = [...art.records].sort(
                  (a, b) => new Date(a.dateRecorded).getTime() - new Date(b.dateRecorded).getTime()
                );

                // Group by city for Location-wise grouping
                const groupedByCity: Record<string, PriceRecord[]> = {};
                art.records.forEach(rec => {
                  const cityKey = rec.city?.trim() || (isStockArt ? 'Exchange' : 'Unspecified City');
                  if (!groupedByCity[cityKey]) groupedByCity[cityKey] = [];
                  groupedByCity[cityKey].push(rec);
                });
                const sortedCities = Object.keys(groupedByCity).sort();

                // Sort records for non-location views
                let sortedRecords = [...art.records];
                if (activeCompSort === 'price-asc') {
                  sortedRecords.sort((a, b) => a.price - b.price);
                } else if (activeCompSort === 'price-desc') {
                  sortedRecords.sort((a, b) => b.price - a.price);
                } else if (activeCompSort === 'time-desc') {
                  sortedRecords.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime());
                } else if (activeCompSort === 'time-asc') {
                  sortedRecords.sort((a, b) => new Date(a.dateRecorded).getTime() - new Date(b.dateRecorded).getTime());
                }

                // Render block for a single record row
                const renderRecordRow = (rec: PriceRecord) => {
                  const percentOfMax = Math.round((rec.price / maxPrice) * 100);
                  const diffFromAvg = rec.price - avgPrice;
                  const diffPct = avgPrice > 0 ? Math.round((diffFromAvg / avgPrice) * 100) : 0;

                  // Find trend relative to previous chronological record
                  const chronoIndex = chronologicalRecords.findIndex(r => r.id === rec.id);
                  const prevChrono = chronoIndex > 0 ? chronologicalRecords[chronoIndex - 1] : null;
                  let trendBadgeText = '';
                  let trendType: 'up' | 'down' | 'stable' | 'initial' = 'initial';
                  if (prevChrono) {
                    const diff = rec.price - prevChrono.price;
                    const pct = Math.round((diff / prevChrono.price) * 100);
                    if (diff > 0) {
                      trendBadgeText = `📈 +${rec.currency}${diff} (+${pct}%)`;
                      trendType = 'up';
                    } else if (diff < 0) {
                      trendBadgeText = `📉 -${rec.currency}${Math.abs(diff)} (${pct}%)`;
                      trendType = 'down';
                    } else {
                      trendBadgeText = `➡️ Stable rate`;
                      trendType = 'stable';
                    }
                  } else {
                    trendBadgeText = `🌱 Initial entry`;
                    trendType = 'initial';
                  }

                  return (
                    <div 
                      key={rec.id} 
                      className="bg-[#faf8f5] dark:bg-stone-900/40 p-3.5 rounded-2xl border border-stone-200/40 hover:border-[#2d6a4f]/25 transition-all text-xs text-stone-700 dark:text-stone-300 relative group/row mb-2 last:mb-0"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[#2d6a4f] font-black text-xs font-mono">{rec.currency}{rec.price}</span>
                            <span className="text-stone-400 font-bold">per {rec.unit || (isStockArt ? 'Share' : 'Kg')}</span>

                            {/* Min/Max/Average Badges */}
                            {rec.price === minPrice && art.records.length > 1 && (
                              <span className="text-[8px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                🏆 Best Rate
                              </span>
                            )}
                            {rec.price === maxPrice && art.records.length > 1 && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                ⚠️ Highest Rate
                              </span>
                            )}

                            {rec.reliability && (
                              <div className="flex items-center gap-0.5 ml-1" title="Source rating">
                                {Array.from({ length: rec.reliability }).map((_, i) => (
                                  <svg key={i} width="8" height="8" viewBox="0 0 24 24" fill="#b87d14" stroke="none">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                ))}
                              </div>
                            )}
                          </div>

                          <p className="font-semibold text-stone-850 dark:text-stone-200 flex flex-wrap gap-x-2 text-[10px]">
                            <span>
                              {isStockArt ? '🏛️ ' : '📍 '}{formatRecordLocation(rec, isStockArt)}
                            </span>
                            {rec.supplierName && <span className={isStockArt ? "text-[#2d6a4f]" : "text-[#7a523a]"}>{isStockArt ? '💼 Broker:' : '🏢'} {rec.supplierName}</span>}
                            {rec.contact && <span className="text-stone-400 font-mono">{isStockArt ? '🔗 Support:' : '📱'} {rec.contact}</span>}
                          </p>

                          {rec.notes && (
                            <p className="text-[10px] text-stone-500 italic mt-1 font-mono leading-relaxed">
                              Remark: "{rec.notes}"
                            </p>
                          )}
                        </div>

                        {/* Edit/Delete Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                          <div className="flex gap-1.5 shrink-0 opacity-80 md:opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditRecord(art, rec)}
                              className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800"
                              title="Edit price record details"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button
                              onClick={() => {
                                if (art.records.length === 1) {
                                  alert("Cannot delete the only price record here. Delete the entire Article instead.");
                                  return;
                                }
                                if (confirm("Remove this specific price log record?")) {
                                  onDeletePriceRecord(art.id, rec.id);
                                }
                              }}
                              className="p-1 hover:bg-red-50 rounded text-stone-400 hover:text-red-500"
                              title="Delete individual price record"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 6  18 0" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                          
                          <div className="text-[8px] text-stone-400 font-mono text-right mt-1">
                            <span>{rec.dateRecorded}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Sorter Context Extras */}
                      {/* 1. Price comparison extras */}
                      {(activeCompSort === 'price-asc' || activeCompSort === 'price-desc') && art.records.length > 1 && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/40 space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold">
                            <span className="text-stone-400 font-mono">Relative Spread weight</span>
                            <span className={diffFromAvg < 0 ? 'text-green-600 font-mono' : diffFromAvg > 0 ? 'text-amber-600 font-mono' : 'text-stone-500 font-mono'}>
                              {diffFromAvg === 0 ? 'Exact average' : `${diffFromAvg > 0 ? '📈 +' : '📉 '}${diffPct}% compared to avg`}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-stone-200/60 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                diffFromAvg < 0 ? 'bg-green-500' : diffFromAvg > 0 ? 'bg-amber-500' : 'bg-stone-400'
                              }`} 
                              style={{ width: `${percentOfMax}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      {/* 2. Chronological trend extras */}
                      {(activeCompSort === 'time-desc' || activeCompSort === 'time-asc') && (
                        <div className="mt-2 pt-2 border-t border-stone-200/40 flex items-center justify-between text-[9px] font-mono">
                          <span className="text-stone-400">Chronological rate shift:</span>
                          <span className={`font-black rounded-sm px-1 py-0.2 text-[9px] ${
                            trendType === 'up' 
                              ? 'text-red-600 bg-red-50' 
                              : trendType === 'down' 
                              ? 'text-green-600 bg-green-55/10' 
                              : trendType === 'stable'
                              ? 'text-stone-500 bg-stone-50'
                              : 'text-blue-600 bg-blue-50'
                          }`}>
                            {trendBadgeText}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="mt-4 space-y-3.5 pt-3.5 border-t border-dashed border-stone-200/60 transition-all">
                    {/* Interactive Tabbed Sorters & Comparison Selection */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-3 bg-stone-100/60 dark:bg-stone-900/60 rounded-2xl border border-stone-200/40">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-black text-[#7a523a] uppercase tracking-wider">⚖️ COMPARISON MODE</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button 
                          onClick={() => setComparisonSorts(prev => ({ ...prev, [art.id]: 'price-asc' }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            activeCompSort === 'price-asc'
                              ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-xs'
                              : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 dark:border-stone-800'
                          }`}
                        >
                          📉 Price (Lowest)
                        </button>
                        <button 
                          onClick={() => setComparisonSorts(prev => ({ ...prev, [art.id]: 'price-desc' }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            activeCompSort === 'price-desc'
                              ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-xs'
                              : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 dark:border-stone-800'
                          }`}
                        >
                          📈 Price (Highest)
                        </button>
                        <button 
                          onClick={() => setComparisonSorts(prev => ({ ...prev, [art.id]: 'location' }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            activeCompSort === 'location'
                              ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-xs'
                              : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 dark:border-stone-800'
                          }`}
                        >
                          🗺️ Location-wise
                        </button>
                        <button 
                          onClick={() => setComparisonSorts(prev => ({ ...prev, [art.id]: 'time-desc' }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            activeCompSort === 'time-desc'
                              ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-xs'
                              : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 dark:border-stone-800'
                          }`}
                        >
                          ⏱️ Time (New)
                        </button>
                        <button 
                          onClick={() => setComparisonSorts(prev => ({ ...prev, [art.id]: 'time-asc' }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            activeCompSort === 'time-asc'
                              ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-xs'
                              : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 dark:border-stone-800'
                          }`}
                        >
                          🕒 Time (Old)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {activeCompSort === 'location' ? (
                        /* Location-wise Grouped View */
                        <div className="space-y-4">
                          {sortedCities.map(cityName => (
                            <div key={cityName} className="space-y-2 border-l-2 border-[#2d6a4f]/25 pl-3">
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-[#2d6a4f] uppercase tracking-wider mb-2 pt-1">
                                <span>🏛️ {cityName}</span>
                                <span className="text-[8px] bg-[#2d6a4f]/10 text-[#2d6a4f] px-1.5 py-0.5 rounded font-mono">
                                  {groupedByCity[cityName].length} dynamic listings
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {groupedByCity[cityName].sort((a, b) => a.price - b.price).map(rec => renderRecordRow(rec))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Standard listing with active sorted mode */
                        <div className="space-y-2">
                          {sortedRecords.map(rec => renderRecordRow(rec))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          );
        })}

        {filteredAndSortedArticles.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-stone-200/80 rounded-[30px] bg-white/30 text-stone-400 md:px-10">
             <div className="w-12 h-12 rounded-full border border-[#2d6a4f]/20 flex items-center justify-center bg-stone-50 mx-auto mb-4 font-black text-lg text-[#2d6a4f]">
               ₹
             </div>
             <p className="text-xs font-black uppercase tracking-[0.2em]">Watchlist is empty</p>
             <p className="text-[10px] text-stone-500 max-w-[280px] mx-auto mt-2 leading-relaxed">
               Search query returned zero articles or you haven't recorded catalog items yet. Click "Record Price" above to maintain precise, categorised articles globally.
             </p>
          </div>
        )}
      </div>

    </div>
  );
};
