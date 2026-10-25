// Comprehensive End-to-End Test for all AI Endpoints
const baseUrl = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log(' 🚀 STARTING FULL AI ENDPOINT TEST SUITE');
  console.log('====================================================\n');

  const results = [];

  async function testEndpoint(name, url, method, body) {
    process.stdout.write(`Testing [${name}] ... `);
    const start = Date.now();
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) {
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(url, opts);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (!res.ok) {
        const errText = await res.text();
        console.log(`❌ FAILED (${res.status}) in ${elapsed}s`);
        console.log(`   Error: ${errText.slice(0, 300)}`);
        results.push({ name, status: 'FAILED', error: errText.slice(0, 200), elapsed });
        return;
      }
      const data = await res.json();
      console.log(`✅ PASSED in ${elapsed}s`);
      results.push({ name, status: 'PASSED', data, elapsed });
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`❌ ERROR in ${elapsed}s: ${err.message}`);
      results.push({ name, status: 'ERROR', error: err.message, elapsed });
    }
  }

  // 1. Health
  await testEndpoint('1. Health Check', `${baseUrl}/api/health`, 'GET');

  // 2. Chat Advisor
  await testEndpoint('2. AI Advisor Chat', `${baseUrl}/api/gemini/chat`, 'POST', {
    message: 'ما هو متوسط سلة العميل (UPT) للسلسلة وما هو أسرع الفروع نمواً؟',
    aggregatedContext: {
      chainUpt: 2.15,
      chainAtv: 1420,
      totalSales: 45000000,
      fastestGrowing: 'Mall of Arabia'
    }
  });

  // 3. Executive Brief
  await testEndpoint('3. Executive Brief', `${baseUrl}/api/gemini/brief`, 'POST', {
    periodType: 'monthly',
    aggregatedData: {
      totalNetSales: 42500000,
      totalTrx: 29800,
      upt: 2.18,
      atv: 1426,
      topBranches: ['Mall of Arabia', 'City Stars', 'Alexandria City Centre'],
      bottomBranches: ['Tanta Outlet', 'Assiut High Street']
    },
    alerts: [
      { type: 'warning', message: 'تراجع مبيعات النصف الثاني من الشهر بنسبة 14%' },
      { type: 'info', message: 'مبيعات غير منسوبة بفرع المهندسين بنسبة 6.2%' }
    ]
  });

  // 4. Explain Store Performance
  await testEndpoint('4. Explain Store Performance', `${baseUrl}/api/gemini/explain-store`, 'POST', {
    storeData: {
      name: 'City Stars Cairo',
      segment: 'Tier-1 Malls',
      netSales: 3200000,
      trx: 1950,
      upt: 2.45,
      atv: 1641,
      unattributedSalesRatio: 0.012
    },
    segmentBenchmark: {
      avgNetSales: 2800000,
      avgUpt: 2.2,
      avgAtv: 1510
    },
    chainBenchmark: {
      avgNetSales: 1600000,
      avgUpt: 2.05,
      avgAtv: 1350
    }
  });

  // 5. Salesperson Coaching Note
  await testEndpoint('5. Salesperson Coaching Note', `${baseUrl}/api/gemini/coaching-note`, 'POST', {
    employeeData: {
      name: 'سارة محمود',
      storeName: 'Mall of Arabia',
      netSales: 410000,
      trx: 310,
      upt: 1.65,
      atv: 1320
    },
    storeBenchmark: {
      avgUpt: 2.35,
      avgAtv: 1480
    },
    quadrant: 'Low UPT / Medium ATV'
  });

  // 6. Data Quality Audit
  await testEndpoint('6. Data Quality Explainer', `${baseUrl}/api/gemini/data-quality`, 'POST', {
    dataQualitySummary: {
      unattributedSalesTotal: 125000,
      floatingEmployeesCount: 4,
      zeroSalesDays: 2,
      storesAudited: 27,
      currencyIntegrityIssues: ['Al Doha branch excluded due to QAR vs EGP rate']
    }
  });

  // 7. Discover Competitors
  await testEndpoint('7. Discover Competitors', `${baseUrl}/api/gemini/discover-competitors`, 'POST', {});

  // 8. Competitor Intelligence Scan
  await testEndpoint('8. Competitor Intelligence Scan', `${baseUrl}/api/gemini/competitor-scan`, 'POST', {
    competitorName: 'Dalydress Egypt',
    websiteUrl: 'https://dalydress.com',
    facebookUrl: 'https://facebook.com/dalydress',
    instagramUrl: 'https://instagram.com/dalydress'
  });

  // 9. Competitor Strategic Report
  await testEndpoint('9. Competitor Strategic Report', `${baseUrl}/api/gemini/competitor-report`, 'POST', {
    competitorsList: [
      { name: 'Zara Egypt', segment: 'Fast Fashion / Mid-High', threatLevel: 'High' },
      { name: 'DeFacto Egypt', segment: 'Budget Fast Fashion', threatLevel: 'Medium' }
    ],
    ourCategoryUtv: [
      { category: 'Dresses', avgPrice: 1650 },
      { category: 'Blouses', avgPrice: 850 }
    ]
  });

  // 10. Analyze Ad Screenshot (using 1x1 transparent PNG base64 for test)
  await testEndpoint('10. Analyze Ad Image', `${baseUrl}/api/gemini/analyze-ad-image`, 'POST', {
    imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    mimeType: 'image/png',
    competitorName: 'Test Brand Fashion',
    adUrl: 'https://instagram.com/p/sample123'
  });

  console.log('\n====================================================');
  console.log(' 🏁 TEST RESULTS SUMMARY');
  console.log('====================================================');
  let passedCount = 0;
  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(35)} [${r.status}] (${r.elapsed}s)`);
    if (r.status === 'PASSED') passedCount++;
  }
  console.log(`\nScore: ${passedCount} / ${results.length} PASSED`);
  console.log('====================================================');
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests();
