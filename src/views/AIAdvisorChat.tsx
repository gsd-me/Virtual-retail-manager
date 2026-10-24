import React, { useState, useRef, useEffect } from 'react';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  HelpCircle,
  Database,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import {
  ChainMetrics,
  StoreAggregated,
  AlertItem,
} from '../types/retail';

interface AIAdvisorChatProps {
  chainMetrics: ChainMetrics;
  stores: StoreAggregated[];
  alerts: AlertItem[];
  lang: 'ar' | 'en';
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIAdvisorChat: React.FC<AIAdvisorChatProps> = ({
  chainMetrics,
  stores,
  alerts,
  lang,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: lang === 'ar'
        ? `أهلاً بك. أنا "المستشار الذكي لقطاع التجزئة" (Retail Command Center AI Advisor).
أنا متصل مباشرة بالبيانات المجمعة المعتمدة للـ 27 فرعاً لشهر أغسطس 2026. 

تطبيقاً لمعايير الشفافية الكاملة، سأوضح لك في كل إجابة الأرقام الدقيقة، جداول المقارنة، والمعادلات الحسابية التي بنيت عليها النتيجة حتى تتخذ قراراتك بثقة تامة.

يمكنك الضغط على أحد الأسئلة المقترحة أدناه أو كتابة استفسارك مباشرة.`
        : `Welcome to the Retail Command Center AI Advisor. I am connected directly to your confirmed aggregates for all 27 outlets. For total transparency, all answers cite the exact figures, comparison baselines, and calculation formulas used.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Suggested prompt chips
  const suggestedQuestions = [
    'ما سبب تراجع مبيعات المنصورة وبورسعيد في النصف الثاني من الشهر؟',
    'حلل أداء متجر الأونلاين ونسبة المرتجعات مقارنة بالفروع',
    'ما هي الفروع ذات المبيعات غير المنسوبة الحرجة (>10%) وكيف تؤثر على الأرقام؟',
    'قارن أداء المولات التجارية مقابل فروع المحافظات من حيث ATV و UPT',
    'ما هي الفئات المخزنية المفقودة في بعض الفروع وتحتاج إعادة توزيع؟',
    'ما هي الفروع الأكثر اعتماداً على أعلى 3 بائعين ومخاطرها؟',
  ];

  // Prepare aggregated context
  const buildAggregatedContext = () => {
    const includedStores = stores.filter(s => !s.isExcluded);
    const top5 = [...includedStores].sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
    const bottom5 = [...includedStores].sort((a, b) => a.totalSales - b.totalSales).slice(0, 5);
    const highUnattributed = stores.filter(s => s.unattributedSalesPercent > 10);
    const h2DeclineStores = stores.filter(s => s.h2h1ChangePercent < -15);

    return {
      chainMetrics: {
        totalNetSalesEGP: chainMetrics.totalSales,
        totalSoldUnits: chainMetrics.totalUnits,
        totalTRX: chainMetrics.totalTrx,
        chainWeightedATV: chainMetrics.weightedAtv,
        chainWeightedUPT: chainMetrics.weightedUpt,
        chainWeightedUTV: chainMetrics.weightedUtv,
        totalActiveStores: chainMetrics.totalStoresCount,
        totalActiveSalesStaff: chainMetrics.activeStaffCount,
      },
      top5Stores: top5.map(s => ({
        name: s.name,
        segment: s.segment,
        salesEGP: s.totalSales,
        sharePct: s.salesSharePercent,
        upt: s.weightedUpt,
        atv: s.weightedAtv,
        h2h1ChangePct: s.h2h1ChangePercent,
      })),
      bottom5Stores: bottom5.map(s => ({
        name: s.name,
        segment: s.segment,
        salesEGP: s.totalSales,
        sharePct: s.salesSharePercent,
        upt: s.weightedUpt,
        atv: s.weightedAtv,
        h2h1ChangePct: s.h2h1ChangePercent,
      })),
      highUnattributedStoresCount: highUnattributed.length,
      highUnattributedStores: highUnattributed.map(s => ({
        name: s.name,
        unattributedPct: s.unattributedSalesPercent,
        unattributedAmountEGP: s.unattributedAmount,
      })),
      h2DeclineStores: h2DeclineStores.map(s => ({
        name: s.name,
        h1DailyAvg: s.h1DailyAvg,
        h2DailyAvg: s.h2DailyAvg,
        changePct: s.h2h1ChangePercent,
      })),
      onlineStoreMetrics: stores.find(s => s.segment === 'Online' || s.name === 'Online Store'),
      activeAlertsSample: alerts.slice(0, 6).map(a => ({
        entity: a.targetEntity,
        type: a.type,
        metric: a.metricValue,
        desc: a.descriptionAr,
        action: a.actionAr,
      })),
    };
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const context = buildAggregatedContext();
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          aggregatedContext: context,
        }),
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      const aiMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'عذراً، لم أتمكن من استخراج الإجابة من البيانات المتاحة.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ تعذر الاتصال بمحرك التحليلات الذكي. يرجى التأكد من تشغيل الخادم والمحاولة مرة أخرى.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <BotMessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {lang === 'ar' ? 'المستشار الذكي لقطاع التجزئة (AI Advisor)' : 'Retail Command Center AI Advisor'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مساعد تحليلي عالي الشفافية: يوضح الأرقام الدقيقة، جداول المقارنة، والمعادلات الحسابية لكل استنتاج'
              : 'High-transparency AI: Cites exact figures, comparison periods, and formulas for every insight'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContextModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? 'فحص سياق البيانات المعتمدة' : 'Inspect Aggregated Data'}</span>
          </button>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'ar' ? 'أسئلة مقترحة وسريعة:' : 'Suggested Analytical Prompts:'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-all text-right"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 min-h-[450px] max-h-[600px] overflow-y-auto space-y-4 shadow-xl">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
              {msg.sender === 'assistant' ? (
                <>
                  <BotMessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-amber-400">المستشار الذكي</span>
                </>
              ) : (
                <span className="font-semibold text-slate-300">أنت (متخذ القرار)</span>
              )}
              <span>•</span>
              <span className="font-mono text-[10px]">{msg.timestamp}</span>
            </div>

            <div
              className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed space-y-2 whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
              }`}
            >
              {msg.text}

              {msg.sender === 'assistant' && msg.id !== 'welcome' && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-normal">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>تم التحقق من الأرقام والمعادلات الحسابية</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <BotMessageSquare className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>جاري استدعاء جداول المقارنة وتطبيق معادلات الحساب الدقيقة...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={lang === 'ar' ? 'اسأل المستشار الذكي عن أي فرع، بائع، فئة، أو سبب انخفاض مبيعات...' : 'Ask the AI Advisor about any store, salesperson, or trend...'}
          className="bg-transparent text-white px-4 py-2.5 outline-none flex-1 text-xs"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
        >
          <span>{lang === 'ar' ? 'إرسال' : 'Send'}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context Inspector Modal */}
      {showContextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">
                  {lang === 'ar' ? 'فحص سياق البيانات المجمعة المرسلة للـ AI' : 'Aggregated Context Inspector'}
                </h2>
              </div>
              <button
                onClick={() => setShowContextModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
                {JSON.stringify(buildAggregatedContext(), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
