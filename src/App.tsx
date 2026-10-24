import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { UploadModal } from './components/UploadModal';
import { ExecutiveOverview } from './views/ExecutiveOverview';
import { BranchPerformance } from './views/BranchPerformance';
import { SalespersonScorecard } from './views/SalespersonScorecard';
import { StoreManagerView } from './views/StoreManagerView';
import { CategoryAssortment } from './views/CategoryAssortment';
import { CustomerLifecycleView } from './views/CustomerLifecycleView';
import { InventoryMonitoringView } from './views/InventoryMonitoringView';
import { AIAdvisorChat } from './views/AIAdvisorChat';
import { CompetitorIntelligence } from './views/CompetitorIntelligence';
import { DataQualityView } from './views/DataQualityView';
import { SettingsView } from './views/SettingsView';

import {
  ActiveTab,
  FilterState,
  StoreSegment,
  CurrencyConfig,
  EmployeeRecord,
  DailyStoreSalesRecord,
  CategoryDCSItem,
  StyleDescItem,
  CompetitorProfile,
  CustomerRecord,
  InventoryItemRecord,
} from './types/retail';

import {
  generateRealisticSampleData,
} from './utils/sampleData';

import {
  generateRealisticCustomers,
} from './utils/customerData';

import {
  generateRealisticInventory,
} from './utils/inventoryData';

import {
  computeStoreAggregates,
  DEFAULT_EXCLUDED_USERS,
  DEFAULT_SEGMENTS,
  DEFAULT_CURRENCIES,
} from './utils/calculations';

import {
  buildDataQualityReport,
} from './utils/excelParser';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSampleData, setIsSampleData] = useState(true);

  // Global Filters
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'full',
    store: 'all',
    segment: 'all',
    department: 'all',
  });

  // Settings State
  const [segmentConfigs, setSegmentConfigs] = useState<Record<string, StoreSegment>>(DEFAULT_SEGMENTS);
  const [currencyConfigs, setCurrencyConfigs] = useState<Record<string, CurrencyConfig>>(DEFAULT_CURRENCIES);
  const [flaggedUsers, setFlaggedUsers] = useState<string[]>(DEFAULT_EXCLUDED_USERS);
  const [floatingStaffOverrides, setFloatingStaffOverrides] = useState<Record<string, string>>({});

  // Core Data in Memory
  const initialData = useMemo(() => generateRealisticSampleData(), []);
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialData.employees);
  const [dailySales, setDailySales] = useState<DailyStoreSalesRecord[]>(initialData.dailySales);
  const [categories, setCategories] = useState<CategoryDCSItem[]>(initialData.categories);
  const [styles, setStyles] = useState<StyleDescItem[]>(initialData.styles);
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>(initialData.competitors);
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => generateRealisticCustomers(120));
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>(() => generateRealisticInventory());

  // Selected Store for Drilldown cross-tab navigation
  const [selectedDrillStore, setSelectedDrillStore] = useState<string | undefined>(undefined);

  // Sync HTML dir with selected language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handle uploaded data patch
  const handleDataParsed = (payload: {
    employees?: EmployeeRecord[];
    dailySales?: DailyStoreSalesRecord[];
    categories?: CategoryDCSItem[];
    styles?: StyleDescItem[];
  }) => {
    if (payload.employees && payload.employees.length > 0) {
      setEmployees(payload.employees);
      setIsSampleData(false);
    }
    if (payload.dailySales && payload.dailySales.length > 0) {
      setDailySales(payload.dailySales);
      setIsSampleData(false);
    }
    if (payload.categories && payload.categories.length > 0) {
      setCategories(payload.categories);
      setIsSampleData(false);
    }
    if (payload.styles && payload.styles.length > 0) {
      setStyles(payload.styles);
      setIsSampleData(false);
    }
  };

  const handleResetSampleData = () => {
    const sample = generateRealisticSampleData();
    setEmployees(sample.employees);
    setDailySales(sample.dailySales);
    setCategories(sample.categories);
    setStyles(sample.styles);
    setCompetitors(sample.competitors);
    setCustomers(generateRealisticCustomers(120));
    setInventoryItems(generateRealisticInventory());
    setIsSampleData(true);
  };

  // Filter Daily Sales by date range
  const filteredDailySales = useMemo(() => {
    if (filters.dateRange === 'full') return dailySales;
    return dailySales.filter(d => {
      const dayNum = parseInt(d.dateStr.split('-')[2] || '0', 10);
      if (filters.dateRange === 'h1') return dayNum <= 15;
      if (filters.dateRange === 'h2') return dayNum > 15;
      if (filters.dateRange === 'last7') return dayNum >= 25;
      return true;
    });
  }, [dailySales, filters.dateRange]);

  // Compute Aggregates
  const { stores, chainMetrics, normalizedEmployees, alerts } = useMemo(() => {
    return computeStoreAggregates(
      filteredDailySales,
      employees,
      currencyConfigs,
      segmentConfigs,
      flaggedUsers,
      floatingStaffOverrides
    );
  }, [filteredDailySales, employees, currencyConfigs, segmentConfigs, flaggedUsers, floatingStaffOverrides]);

  // Filter Categories by department if selected
  const filteredCategories = useMemo(() => {
    if (filters.department === 'all') return categories;
    return categories.filter(c => c.department === filters.department);
  }, [categories, filters.department]);

  // Data Quality Summary
  const dataQualityReport = useMemo(() => {
    return buildDataQualityReport(
      employees,
      dailySales,
      28, // dropped subtotals count
      flaggedUsers
    );
  }, [employees, dailySales, flaggedUsers]);

  // Unique departments list for filter
  const departmentsList = useMemo(() => {
    return Array.from(new Set(categories.map(c => c.department))).filter(Boolean);
  }, [categories]);

  // Switch to store drilldown in branches view
  const handleSelectStoreFromOverview = (storeName: string) => {
    setSelectedDrillStore(storeName);
    setActiveTab('branches');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        chainMetrics={chainMetrics}
        alerts={alerts}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetSampleData={handleResetSampleData}
        isSampleData={isSampleData}
        onOpenAlerts={() => setActiveTab('overview')}
        dataQualityScore={dataQualityReport.overallScore}
      />

      {/* Global Filter Bar & Tabs Navigation */}
      <GlobalFilterBar
        filters={filters}
        onFilterChange={setFilters}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        departmentsList={departmentsList}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'overview' && (
          <ExecutiveOverview
            chainMetrics={chainMetrics}
            stores={stores}
            dailySales={filteredDailySales}
            alerts={alerts}
            lang={lang}
            onSelectStore={handleSelectStoreFromOverview}
            onOpenAdvisor={() => setActiveTab('ai_advisor')}
          />
        )}

        {activeTab === 'branches' && (
          <BranchPerformance
            stores={stores}
            dailySales={filteredDailySales}
            employees={normalizedEmployees}
            categories={filteredCategories}
            chainMetrics={chainMetrics}
            lang={lang}
            selectedStoreName={selectedDrillStore}
            onClearSelectedStore={() => setSelectedDrillStore(undefined)}
          />
        )}

        {activeTab === 'salespeople' && (
          <SalespersonScorecard
            employees={normalizedEmployees}
            stores={stores}
            chainMetrics={chainMetrics}
            lang={lang}
          />
        )}

        {activeTab === 'store_manager' && (
          <StoreManagerView
            stores={stores}
            employees={normalizedEmployees}
            chainMetrics={chainMetrics}
            lang={lang}
          />
        )}

        {activeTab === 'category_assortment' && (
          <CategoryAssortment
            categories={filteredCategories}
            styles={styles}
            stores={stores}
            chainMetrics={chainMetrics}
            lang={lang}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerLifecycleView
            customers={customers}
            lang={lang}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryMonitoringView
            inventoryItems={inventoryItems}
            lang={lang}
          />
        )}

        {activeTab === 'ai_advisor' && (
          <AIAdvisorChat
            chainMetrics={chainMetrics}
            stores={stores}
            alerts={alerts}
            lang={lang}
          />
        )}

        {activeTab === 'competitors' && (
          <CompetitorIntelligence
            competitors={competitors}
            onUpdateCompetitors={setCompetitors}
            chainMetrics={chainMetrics}
            categories={categories}
            lang={lang}
          />
        )}

        {activeTab === 'data_quality' && (
          <DataQualityView
            dataQuality={dataQualityReport}
            stores={stores}
            employees={normalizedEmployees}
            dailySales={dailySales}
            lang={lang}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            segmentConfigs={segmentConfigs}
            onUpdateSegments={setSegmentConfigs}
            currencyConfigs={currencyConfigs}
            onUpdateCurrencies={setCurrencyConfigs}
            flaggedUsers={flaggedUsers}
            onUpdateFlaggedUsers={setFlaggedUsers}
            stores={stores}
            lang={lang}
          />
        )}
      </main>

      {/* Upload Data Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        lang={lang}
        onDataParsed={handleDataParsed}
        onNavigateToDataQuality={() => setActiveTab('data_quality')}
      />
    </div>
  );
}
