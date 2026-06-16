export const issuers = [
  "Avant",
  "Mission Lane",
  "Merrick Bank",
  "Credit One",
  "Concora",
  "Indigo"
];

export const sentimentCategories = [
  "APR / Interest Rates",
  "Fees",
  "Credit Lines",
  "Approval Experience",
  "Rewards & Cashback",
  "Customer Service",
  "Mobile App",
  "Fraud & Security",
  "Trust & Transparency",
  "Collections & Hardship"
];

export const emotions = [
  "Frustration",
  "Trust",
  "Anger",
  "Satisfaction",
  "Confusion"
];

// Overall sentiment scores (0-100)
export const overallSentiment = {
  "Avant": 68,
  "Mission Lane": 62,
  "Merrick Bank": 71,
  "Credit One": 45,
  "Concora": 59,
  "Indigo": 52
};

// Category-level sentiment by issuer (0-100)
export const categorySentiment: Record<string, Record<string, number>> = {
  "Avant": {
    "APR / Interest Rates": 55,
    "Fees": 62,
    "Credit Lines": 72,
    "Approval Experience": 78,
    "Rewards & Cashback": 45,
    "Customer Service": 68,
    "Mobile App": 75,
    "Fraud & Security": 82,
    "Trust & Transparency": 70,
    "Collections & Hardship": 65
  },
  "Mission Lane": {
    "APR / Interest Rates": 52,
    "Fees": 58,
    "Credit Lines": 65,
    "Approval Experience": 70,
    "Rewards & Cashback": 40,
    "Customer Service": 60,
    "Mobile App": 68,
    "Fraud & Security": 75,
    "Trust & Transparency": 62,
    "Collections & Hardship": 58
  },
  "Merrick Bank": {
    "APR / Interest Rates": 68,
    "Fees": 72,
    "Credit Lines": 75,
    "Approval Experience": 80,
    "Rewards & Cashback": 65,
    "Customer Service": 70,
    "Mobile App": 72,
    "Fraud & Security": 85,
    "Trust & Transparency": 75,
    "Collections & Hardship": 70
  },
  "Credit One": {
    "APR / Interest Rates": 35,
    "Fees": 30,
    "Credit Lines": 48,
    "Approval Experience": 55,
    "Rewards & Cashback": 38,
    "Customer Service": 42,
    "Mobile App": 50,
    "Fraud & Security": 58,
    "Trust & Transparency": 40,
    "Collections & Hardship": 45
  },
  "Concora": {
    "APR / Interest Rates": 50,
    "Fees": 55,
    "Credit Lines": 60,
    "Approval Experience": 68,
    "Rewards & Cashback": 48,
    "Customer Service": 58,
    "Mobile App": 62,
    "Fraud & Security": 70,
    "Trust & Transparency": 60,
    "Collections & Hardship": 55
  },
  "Indigo": {
    "APR / Interest Rates": 45,
    "Fees": 48,
    "Credit Lines": 55,
    "Approval Experience": 62,
    "Rewards & Cashback": 42,
    "Customer Service": 50,
    "Mobile App": 58,
    "Fraud & Security": 65,
    "Trust & Transparency": 52,
    "Collections & Hardship": 48
  }
};

// Time series data (last 6 months)
export const timeSeriesData = [
  { month: "Dec", Avant: 65, "Mission Lane": 60, "Merrick Bank": 70, "Credit One": 42, Concora: 57, Indigo: 50 },
  { month: "Jan", Avant: 66, "Mission Lane": 61, "Merrick Bank": 71, "Credit One": 43, Concora: 58, Indigo: 51 },
  { month: "Feb", Avant: 67, "Mission Lane": 61, "Merrick Bank": 70, "Credit One": 44, Concora: 58, Indigo: 51 },
  { month: "Mar", Avant: 67, "Mission Lane": 62, "Merrick Bank": 71, "Credit One": 45, Concora: 59, Indigo: 52 },
  { month: "Apr", Avant: 68, "Mission Lane": 62, "Merrick Bank": 71, "Credit One": 45, Concora: 59, Indigo: 52 },
  { month: "May", Avant: 68, "Mission Lane": 62, "Merrick Bank": 71, "Credit One": 45, Concora: 59, Indigo: 52 }
];

// Top complaint topics
export const topComplaints = [
  { topic: "Hidden Fees", mentions: 1247, sentiment: -0.72, trend: "up" },
  { topic: "High APR", mentions: 1156, sentiment: -0.68, trend: "stable" },
  { topic: "Credit Limit Decreases", mentions: 892, sentiment: -0.75, trend: "up" },
  { topic: "Customer Service Wait Times", mentions: 743, sentiment: -0.65, trend: "down" },
  { topic: "Account Closure", mentions: 628, sentiment: -0.82, trend: "up" },
  { topic: "Payment Processing Issues", mentions: 521, sentiment: -0.70, trend: "stable" },
  { topic: "Rewards Not Applied", mentions: 412, sentiment: -0.60, trend: "down" },
  { topic: "App Crashes", mentions: 387, sentiment: -0.55, trend: "down" }
];

// Mock reviews
export const mockReviews = [
  {
    id: 1,
    issuer: "Avant",
    rating: 2,
    date: "2026-05-15",
    text: "The APR is extremely high compared to what they advertised. I was approved for 29.99% when I expected something closer to 20%. The hidden fees keep piling up every month. Very disappointed.",
    sentiment: -0.65,
    topics: ["APR / Interest Rates", "Fees", "Trust & Transparency"],
    emotion: "Frustration"
  },
  {
    id: 2,
    issuer: "Avant",
    rating: 5,
    date: "2026-05-14",
    text: "Best credit card for rebuilding credit! The approval process was seamless, and I got approved when other companies rejected me. The mobile app is intuitive and easy to use.",
    sentiment: 0.85,
    topics: ["Approval Experience", "Mobile App", "Credit Lines"],
    emotion: "Satisfaction"
  },
  {
    id: 3,
    issuer: "Credit One",
    rating: 1,
    date: "2026-05-13",
    text: "Absolute worst experience. They charge fees for everything - monthly fees, annual fees, paper statement fees. Customer service is impossible to reach. Stay away!",
    sentiment: -0.90,
    topics: ["Fees", "Customer Service"],
    emotion: "Anger"
  },
  {
    id: 4,
    issuer: "Mission Lane",
    rating: 4,
    date: "2026-05-12",
    text: "Good card for credit building. The approval was quick and the credit line was reasonable. Customer service was helpful when I had questions about my statement.",
    sentiment: 0.70,
    topics: ["Approval Experience", "Customer Service", "Credit Lines"],
    emotion: "Satisfaction"
  },
  {
    id: 5,
    issuer: "Merrick Bank",
    rating: 5,
    date: "2026-05-11",
    text: "Excellent experience! They actually care about helping you build credit. Fair APR, transparent fees, and great customer support. Highly recommend.",
    sentiment: 0.88,
    topics: ["APR / Interest Rates", "Fees", "Customer Service", "Trust & Transparency"],
    emotion: "Trust"
  },
  {
    id: 6,
    issuer: "Indigo",
    rating: 2,
    date: "2026-05-10",
    text: "The credit limit is way too low and they keep denying my requests for increases. The app interface is confusing and outdated.",
    sentiment: -0.55,
    topics: ["Credit Lines", "Mobile App"],
    emotion: "Frustration"
  },
  {
    id: 7,
    issuer: "Avant",
    rating: 3,
    date: "2026-05-09",
    text: "Mixed feelings. The approval was easy but the rewards program is not great. APR could be better but I've seen worse.",
    sentiment: 0.15,
    topics: ["Approval Experience", "Rewards & Cashback", "APR / Interest Rates"],
    emotion: "Confusion"
  },
  {
    id: 8,
    issuer: "Concora",
    rating: 4,
    date: "2026-05-08",
    text: "Solid card for rebuilding. No major complaints. The fraud protection worked well when someone tried to use my card info.",
    sentiment: 0.68,
    topics: ["Fraud & Security"],
    emotion: "Trust"
  }
];

// Topic frequency data for bubble chart
export const topicFrequency = [
  { topic: "Fees", frequency: 2847, negativity: 0.72, issuer: "Avant" },
  { topic: "APR / Interest Rates", frequency: 2156, negativity: 0.68, issuer: "Avant" },
  { topic: "Customer Service", frequency: 1843, negativity: 0.52, issuer: "Avant" },
  { topic: "Credit Lines", frequency: 1592, negativity: 0.38, issuer: "Avant" },
  { topic: "Mobile App", frequency: 1247, negativity: 0.28, issuer: "Avant" },
  { topic: "Approval Experience", frequency: 1156, negativity: 0.22, issuer: "Avant" },
  { topic: "Fraud & Security", frequency: 892, negativity: 0.15, issuer: "Avant" },
  { topic: "Rewards & Cashback", frequency: 743, negativity: 0.48, issuer: "Avant" },
  { topic: "Trust & Transparency", frequency: 628, negativity: 0.55, issuer: "Avant" },
  { topic: "Collections & Hardship", frequency: 521, negativity: 0.62, issuer: "Avant" },
];

// Emerging issues (trending up)
export const emergingIssues = [
  {
    issue: "Credit Limit Reductions Without Notice",
    mentions: 127,
    monthOverMonthChange: 45,
    sentiment: -0.82,
    firstDetected: "2026-05-01",
    peakDate: "2026-05-18"
  },
  {
    issue: "Mobile App Login Failures",
    mentions: 89,
    monthOverMonthChange: 38,
    sentiment: -0.68,
    firstDetected: "2026-05-05",
    peakDate: "2026-05-17"
  },
  {
    issue: "Delayed Rewards Posting",
    mentions: 76,
    monthOverMonthChange: 32,
    sentiment: -0.55,
    firstDetected: "2026-05-03",
    peakDate: "2026-05-16"
  }
];
