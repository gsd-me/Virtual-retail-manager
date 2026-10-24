import React, { useState } from 'react';
import {
  SlidersHorizontal,
  DollarSign,
  Layers,
  UserX,
  Target,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Globe,
} from 'lucide-react';
import {
  CurrencyConfig,
  StoreSegment,
  StoreAggregated,
} from '../types/retail';
import { STORE_NAMES_LIST } from '../utils/sampleData';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface SettingsViewProps {
  segmentConfigs: Record<string, StoreSegment>;
  onUpdateSegments: (newSegments: Record<string, StoreSegment>) => void;
  currencyConfigs: Record<string, CurrencyConfig>;
  onUpdateCurrencies: (newCurrencies: Record<string, CurrencyConfig>) => void;
  flaggedUsers: string[];
  onUpdateFlaggedUsers: (newUsers: string[]) => void;
  stores: StoreAggregated[];
  lang: 'ar' | 'en';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  segmentConfigs,
  onUpdateSegments,
  currencyConfigs,
  onUpdateCurrencies,
  flaggedUsers,
  onUpdateFlaggedUsers,
  stores,
  lang,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'segments' | 'currencies' | 'excluded_users' | 'targets'>('currencies');

  // Form states
  const [newUser, setNewUser] = useState('');
  const [targetStore, setTargetStore] = useState(stores[0]?.name || 'Alex');
  const [targetAmount, setTargetAmount] = useState('1500000');
  const [storeTargets, setStoreTargets] = useState<Record<string, number>>({
    'Mall of Tanta': 3500000,
    'Alex': 3200000,
    'Doqi': 2700000,
    'Open Air': 2500000,
    'Shbeen Elkoum': 2200000,
    'Mall of Arabia': 2100000,
    'Mansoura Toshka': 1900000,
    'Online': 1500000,
    'Shubra': 700000,
    'Fayoum': 1400000,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSegmentChange = (storeName: string, segment: StoreSegment) => {
    onUpdateSegments({
      ...segmentConfigs,
      [storeName]: segment,
    });
  };

  const handleToggleExcludeCurrency = (storeName: string) => {
    const current = currencyConfigs[storeName] || {
      storeName,
      currencyCode: 'EGP',
      exchangeRate: 1.0,
      isExcludedFromChainTotal: false,
    };
    onUpdateCurrencies({
      ...currencyConfigs,
      [storeName]: {
        ...current,
        isExcludedFromChainTotal: !current.isExcludedFromChainTotal,
      },
    });
  };

  const handleUpdateExchangeRate = (storeName: string, rate: number, code: string) => {
    const current = currencyConfigs[storeName] || {
      storeName,
      currencyCode: code,
      exchangeRate: rate,
      isExcludedFromChainTotal: false,
    };
    onUpdateCurrencies({
      ...currencyConfigs,
      [storeName]: {
        ...current,
        currencyCode: code,
        exchangeRate: rate,
      },
    });
  };

  const handleAddFlaggedUser = () => {
    if (!newUser.trim()) return;
    const norm = newUser.trim().toUpperCase();
    if (!flaggedUsers.includes(norm)) {
      onUpdateFlaggedUsers([...flaggedUsers, norm]);
    }
    setNewUser('');
  };

  const handleRemoveFlaggedUser = (username: string) => {
    onUpdateFlaggedUsers(flaggedUsers.filter(u => u !== username));
  };

  const handleSaveTarget = () => {
    const val = parseFloat(targetAmount) || 0;
    if (val > 0) {
      setStoreTargets(prev => ({
        ...prev,
        [targetStore]: val,
      }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <span>{lang === 'ar' ? 'إعدادات النظام والعملات والشرائح' : 'System Configuration & Currency Settings'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'ضبط شرائح الفروع، إدارة العملات المختلفة (فرع الدوحة)، استبعاد حسابات الكاشير العامة، وتحديد المستهدفات البيعية'
              : 'Configure store segments, Al Doha currency isolation, excluded users, and sales targets'}
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('currencies')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'currencies'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{lang === 'ar' ? 'العملات واستبعاد فرع الدوحة' : 'Currencies & Al Doha Isolation'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('segments')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'segments'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{lang === 'ar' ? 'شرائح الفروع (Segments)' : 'Store Segments'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('excluded_users')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'excluded_users'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>{lang === 'ar' ? 'حسابات الكاشير المستبعدة' : 'Excluded Non-Staff Accounts'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('targets')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'targets'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>{lang === 'ar' ? 'المستهدفات ونسب التحقيق' : 'Monthly Targets & Achievement'}</span>
        </button>
      </div>

      {/* 1. Currencies & Al Doha Isolation Tab */}
      {activeSubTab === 'currencies' && (
        <div className="space-y-4">
          {/* Al Doha Special Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'تخصيص عملة فرع "الدوحة" (Al Doha):' : 'Al Doha Store Currency Isolation:'}</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {lang === 'ar'
                ? 'متوسط سعر القطعة بفرع الدوحة يبلغ ~144 مقارنة بمتوسط السلسلة البالغ ~1,150 ج.م، مما يعني استخدام قائمة أسعار مختلفة أو عملة الريال القطري (QAR). يقوم النظام افتراضياً باستبعاد الفرع من إجمالي مبيعات السلسلة لتفادي تشويه المؤشرات حتى تقوم بتأكيد تحويل العملة أو دمجه يدوياً.'
                : 'Al Doha unit price is ~144 vs ~1,150 chain average. It is excluded by default until confirmed.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'تخصيص العملات وأسعار الصرف للفروع:' : 'Store Currency & Isolation Settings:'}
            </h3>

            <div className="space-y-3">
              {/* Al Doha Row */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">Al Doha (الدوحة)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'ar' ? 'العملة المعينة:' : 'Currency:'} QAR (ريال قطري) • سعر الصرف: 13.5 ج.م
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleExcludeCurrency('Al Doha')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      currencyConfigs['Al Doha']?.isExcludedFromChainTotal ?? true
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {currencyConfigs['Al Doha']?.isExcludedFromChainTotal ?? true
                      ? (lang === 'ar' ? 'مستبعد حالياً من إجمالي السلسلة (موصى به)' : 'Excluded from Chain Total')
                      : (lang === 'ar' ? 'مضمّن في إجمالي السلسلة' : 'Included in Chain Total')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Segments Tab */}
      {activeSubTab === 'segments' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'تعديل تصنيف الشرائح للفروع الـ 27:' : 'Assign Peer Segments to Stores:'}
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'يتم مقارنة فروع الأوتلت والأونلاين فقط مع شريحتها' : 'Outlet & Online are benchmarked only against themselves'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {STORE_NAMES_LIST.map(storeName => {
              const seg = segmentConfigs[storeName] || 'Mall';
              return (
                <div key={storeName} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{storeName}</div>
                  <select
                    value={seg}
                    onChange={e => handleSegmentChange(storeName, e.target.value as StoreSegment)}
                    className="w-full bg-slate-900 text-amber-400 border border-slate-800 p-1.5 rounded-lg outline-none font-semibold text-xs"
                  >
                    <option value="Mall">{lang === 'ar' ? 'مول تجاري (Mall)' : 'Mall'}</option>
                    <option value="Governorate">{lang === 'ar' ? 'فرع محافظة (Governorate)' : 'Governorate'}</option>
                    <option value="Outlet">{lang === 'ar' ? 'أوتلت مخفض (Outlet)' : 'Outlet'}</option>
                    <option value="Online">{lang === 'ar' ? 'متجر إلكتروني (Online)' : 'Online'}</option>
                    <option value="International">{lang === 'ar' ? 'فرع دولي (International)' : 'International'}</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Excluded Users Tab */}
      {activeSubTab === 'excluded_users' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'قائمة حسابات الكاشير المستبعدة من ترتيب البائعين:' : 'Configurable Non-Salesperson Accounts:'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ar'
                ? 'الحسابات التي تدرج مبيعاتها في إجمالي الفرع ولكن تُستبعد من كادر ومسابقات البائعين'
                : 'Kept in store totals but excluded from staff rankings'}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newUser}
              onChange={e => setNewUser(e.target.value)}
              placeholder="اسم الحساب (مثال: CASHIER2, DEMO...)"
              className="bg-slate-950 text-white border border-slate-800 px-3.5 py-2 rounded-xl text-xs outline-none flex-1 font-mono uppercase"
            />
            <button
              onClick={handleAddFlaggedUser}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {flaggedUsers.map(u => (
              <span
                key={u}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-2"
              >
                <span>{u}</span>
                <button
                  onClick={() => handleRemoveFlaggedUser(u)}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Targets & Achievement Tab */}
      {activeSubTab === 'targets' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'المستهدفات الشهرية ونسب التحقيق بالفروع:' : 'Monthly Sales Targets & Achievement:'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'حدد التارجت لكل فرع لتتبع نسبة الإنجاز فورياً' : 'Set monthly targets per store'}
              </p>
            </div>

            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تم حفظ المستهدف بنجاح' : 'Target Saved'}</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <select
              value={targetStore}
              onChange={e => setTargetStore(e.target.value)}
              className="bg-slate-900 text-white border border-slate-800 px-3 py-2 rounded-xl outline-none"
            >
              {STORE_NAMES_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
              <span className="text-slate-400 font-medium">{lang === 'ar' ? 'المستهدف:' : 'Target:'}</span>
              <input
                type="number"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                className="bg-transparent text-amber-400 font-bold outline-none w-32"
              />
              <span className="text-slate-400 font-bold">ج.م</span>
            </div>

            <button
              onClick={handleSaveTarget}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              {lang === 'ar' ? 'حفظ المستهدف' : 'Save Target'}
            </button>
          </div>

          {/* Targets Table */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {stores.map(store => {
              const target = storeTargets[store.name] || 2000000;
              const achievement = Number(((store.totalSales / target) * 100).toFixed(1));
              return (
                <div
                  key={store.name}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{store.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'ar' ? 'المحقق:' : 'Actual:'} {formatCurrency(store.totalSales, 'EGP', lang)} • {lang === 'ar' ? 'المستهدف:' : 'Target:'} {formatCurrency(target, 'EGP', lang)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${
                      achievement >= 100
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : achievement >= 85
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {achievement}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
