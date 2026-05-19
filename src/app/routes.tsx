import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard";
import { CompetitorComparison } from "./pages/CompetitorComparison";
import { TopicAnalysis } from "./pages/TopicAnalysis";
import { ReviewExplorer } from "./pages/ReviewExplorer";
import { TrendsAndIssues } from "./pages/TrendsAndIssues";
import { AIInsights } from "./pages/AIInsights";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: ExecutiveDashboard },
      { path: "comparison", Component: CompetitorComparison },
      { path: "topics", Component: TopicAnalysis },
      { path: "reviews", Component: ReviewExplorer },
      { path: "trends", Component: TrendsAndIssues },
      { path: "insights", Component: AIInsights },
    ],
  },
]);
