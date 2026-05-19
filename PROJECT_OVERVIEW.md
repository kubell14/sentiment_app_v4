# Avant Credit Card Sentiment Intelligence Platform

A premium fintech analytics platform for competitive sentiment analysis of credit card issuers based on Trustpilot reviews.

## 🎯 Overview

This application provides executive-level competitive intelligence for Avant credit cards, comparing sentiment across:
- **Avant** (primary focus)
- Mission Lane
- Merrick Bank
- Credit One
- Concora
- Indigo

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 18.3.1
- **Routing**: React Router 7 (Data Mode)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts 2.15.2
- **UI Components**: Shadcn/UI (Radix UI primitives)
- **Icons**: Lucide React
- **Build Tool**: Vite 6.3.5

### Project Structure

```
src/
├── app/
│   ├── App.tsx                    # RouterProvider entry point
│   ├── routes.tsx                 # Route configuration
│   ├── components/
│   │   ├── layouts/
│   │   │   └── RootLayout.tsx     # Main layout with sidebar
│   │   ├── ui/                    # Shadcn UI components
│   │   └── KPICard.tsx            # Reusable KPI card
│   ├── pages/
│   │   ├── ExecutiveDashboard.tsx
│   │   ├── CompetitorComparison.tsx
│   │   ├── TopicAnalysis.tsx
│   │   ├── ReviewExplorer.tsx
│   │   ├── TrendsAndIssues.tsx
│   │   └── AIInsights.tsx
│   └── data/
│       └── mockData.ts            # Mock sentiment data
└── styles/
    ├── theme.css                   # Tailwind theme & dark mode
    └── fonts.css                   # Font imports
```

## 📊 Features & Pages

### 1. Executive Dashboard (`/`)
**Purpose**: High-level sentiment overview and competitive positioning

**Key Components**:
- AI-generated executive summary
- Overall sentiment score KPI
- Competitive ranking vs 5 competitors
- 6-month sentiment trend line chart
- Horizontal bar chart of competitor rankings
- Top complaint drivers with trend indicators

**Visualizations**:
- Line chart: Sentiment trends over time
- Bar chart: Competitive rankings
- Progress bars: Complaint negativity intensity

### 2. Competitor Comparison (`/comparison`)
**Purpose**: Interactive side-by-side competitive analysis

**Key Features**:
- Dynamic company selector (any 2 issuers)
- Split-screen KPI cards
- Radar chart for category-level comparison
- Strengths vs weaknesses matrices
- Trend comparison line chart
- AI-generated comparison summary

**Visualizations**:
- Radar chart: Multi-dimensional category comparison
- Line chart: Trend comparison
- Badge-based strength/weakness indicators

### 3. Topic Analysis (`/topics`)
**Purpose**: Deep dive into sentiment drivers across categories

**Key Features**:
- Interactive filters (issuer, sentiment, search)
- Topic frequency vs negativity bubble chart
- Category sentiment heatmap
- Color-coded sentiment scores

**Visualizations**:
- Scatter plot: Frequency vs negativity (bubble size = volume)
- Heatmap: Category × Issuer sentiment matrix
- Color scale: Green (70-100), Yellow (50-69), Red (0-49)

### 4. Review Explorer (`/reviews`)
**Purpose**: Searchable raw review database

**Key Features**:
- Full-text search across reviews
- Multi-filter support (issuer, rating, emotion)
- Sentiment badges (Positive/Neutral/Negative)
- Emotion detection labels
- Topic tags
- Star ratings
- Highlighted metadata

**Search Capabilities**:
- Keyword search
- Rating filter (1-5 stars)
- Issuer filter
- Emotion filter (Frustration, Anger, Satisfaction, Trust, Confusion)

### 5. Trends & Emerging Issues (`/trends`)
**Purpose**: Real-time complaint spike detection and anomaly monitoring

**Key Features**:
- Critical alert banner for emerging issues
- Emerging issues tracker with week-over-week change
- Issue timeline area chart
- Overall complaint volume trends
- Trend indicators (↑ Rising, ↓ Falling, → Stable)

**Visualizations**:
- Area chart: Issue timeline with gradient fill
- Line chart: Total vs urgent complaints over time
- Trend badges with directional indicators

### 6. AI Insights & Recommendations (`/insights`)
**Purpose**: Strategic recommendations and competitive gap analysis

**Key Sections**:
- **Strategic Recommendations**: Prioritized action items with timeline
  - Immediate (30 days): Fee transparency overhaul
  - Short-term (60 days): Credit limit communication
  - Medium-term (90 days): Rewards visibility
  - Long-term (120+ days): Hardship program
  
- **Competitive Gap Analysis**: Areas where competitors outperform
  - Identifies leader in each category
  - Provides specific recommendations

- **Emerging Opportunities**: Product development ideas
  - Impact/effort matrix
  - Evidence-based suggestions

- **Customer Segmentation**: Behavioral segments with sentiment
  - Credit Rebuilders (43%, sentiment 82)
  - Rate Shoppers (31%, sentiment 58)
  - Digital-First Users (18%, sentiment 76)
  - At-Risk (8%, sentiment 34)

## 🎨 Design System

### Color Palette (Dark Mode)
```css
Background:       #0a0a0f  /* Deep navy-black */
Card:             #141419  /* Slightly lighter panels */
Border:           #27272f  /* Subtle borders */
Foreground:       #f5f5f7  /* Off-white text */
Muted:            #9ca3af  /* Secondary text */

Primary:          #3b82f6  /* Blue - Avant brand */
Success:          #10b981  /* Green - positive sentiment */
Warning:          #f59e0b  /* Orange - emerging issues */
Danger:           #ef4444  /* Red - negative sentiment */
Purple:           #8b5cf6  /* Secondary competitor */
```

### Typography
- **Headings**: Medium weight (500)
- **Body**: Normal weight (400)
- **Scale**: Base 16px, responsive hierarchy

### Chart Colors
1. `#3b82f6` - Blue (Avant primary)
2. `#10b981` - Green (positive metrics)
3. `#8b5cf6` - Purple (secondary data)
4. `#f59e0b` - Orange (warnings)
5. `#ef4444` - Red (negative metrics)

### Component Patterns
- **Cards**: Rounded corners, subtle borders, hover states
- **Badges**: Color-coded by sentiment/priority
- **Charts**: Dark backgrounds, subtle gridlines, tooltips
- **Gradients**: Blue-to-purple for AI features
- **Hover States**: Subtle background transitions

## 📈 Data Categories

### Sentiment Categories (10 total)
1. APR / Interest Rates
2. Fees (annual, late, hidden, foreign transaction)
3. Credit Lines / Limit Increases
4. Approval Experience
5. Rewards & Cashback
6. Customer Service
7. Mobile App / Account Management
8. Fraud & Security
9. Trust & Transparency
10. Collections / Hardship Support

### Emotion Detection
- Frustration
- Trust
- Anger
- Satisfaction
- Confusion

## 🔄 User Flows

### Competitive Analysis Flow
1. **Executive Dashboard** - Identify overall positioning
2. **Competitor Comparison** - Deep dive into specific competitor
3. **Topic Analysis** - Understand category-level drivers
4. **AI Insights** - Review strategic recommendations

### Issue Investigation Flow
1. **Trends & Issues** - Detect emerging complaint spike
2. **Review Explorer** - Search raw reviews for context
3. **Topic Analysis** - Analyze topic prevalence
4. **AI Insights** - Review recommended actions

### Strategic Planning Flow
1. **AI Insights** - Review strategic recommendations
2. **Competitor Comparison** - Identify gaps vs leader
3. **Topic Analysis** - Understand category performance
4. **Executive Dashboard** - Monitor progress over time

## 🎯 Key Interactions

### Interactive Elements
- Company selectors with dynamic comparison
- Filters with real-time data updates
- Searchable review database
- Expandable/collapsible sections
- Hover tooltips on charts
- Clickable chart elements (future: drill-down)

### Navigation
- Sticky sidebar with route highlighting
- Breadcrumb trails (future enhancement)
- Deep linking support via React Router

## 📊 Mock Data Structure

All data is currently mocked in `src/app/data/mockData.ts`:
- `overallSentiment`: Overall scores by issuer (0-100)
- `categorySentiment`: Category × Issuer matrix
- `timeSeriesData`: 6-month historical trends
- `topComplaints`: Top complaint topics with metadata
- `mockReviews`: Sample review objects
- `emergingIssues`: Trending complaint spikes

### Future: API Integration
Replace mock data with real API calls to:
- Trustpilot API (review fetching)
- Internal sentiment analysis service
- Data warehouse for historical trends

## 🚀 Running the Application

The Vite dev server runs automatically. No manual start needed.

Access via the Figma Make preview surface (not localhost).

## 🎨 Design Inspiration

- **Stripe Dashboard**: Clean data visualization, minimal aesthetic
- **Bloomberg Terminal**: Information density, professional charts
- **Linear**: Modern UI patterns, smooth interactions
- **Notion**: Hierarchical organization, elegant typography

## 📱 Responsive Considerations

Current implementation: Desktop-first (1600px max-width)

Future enhancements:
- Mobile breakpoints for key pages
- Simplified mobile charts
- Collapsible sidebar for tablets
- Touch-optimized filters

## 🔮 Future Enhancements

### Phase 1: Data Integration
- Connect to real Trustpilot API
- Implement authentication
- Add data refresh controls
- Export capabilities (PDF, CSV)

### Phase 2: Advanced Analytics
- Time period selectors (YTD, QTD, custom ranges)
- Drill-down from charts to reviews
- Saved filters and views
- Custom alerting rules

### Phase 3: Collaboration
- Annotation system for insights
- Share/bookmark specific views
- Comment threads on issues
- Slack/email integration for alerts

### Phase 4: AI Enhancements
- Natural language query interface
- Automated insight detection
- Predictive sentiment modeling
- Recommendation prioritization engine

## 🏆 Success Metrics

The platform enables users to:
1. ✅ Understand competitive positioning at a glance
2. ✅ Identify emerging issues before they escalate
3. ✅ Prioritize product improvements based on data
4. ✅ Compare performance vs any competitor
5. ✅ Access raw review evidence for context
6. ✅ Generate executive-ready insights

---

Built with Claude Code for Figma Make
