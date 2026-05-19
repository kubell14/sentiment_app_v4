import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Search, Star, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { useDashboardData } from "../data/liveData";

export function ReviewExplorer() {
  const { data, isLoading, error } = useDashboardData();
  const { reviews, issuers, emotions } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedEmotion, setSelectedEmotion] = useState<string>("all");

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading reviews...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load reviews: {error}</div>;
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchTerm === "" || review.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIssuer = selectedIssuer === "all" || review.issuer === selectedIssuer;
    const matchesRating = selectedRating === "all" || review.rating.toString() === selectedRating;
    const matchesEmotion = selectedEmotion === "all" || review.emotion === selectedEmotion;
    return matchesSearch && matchesIssuer && matchesRating && matchesEmotion;
  });

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return "text-green-500";
    if (sentiment > -0.5) return "text-yellow-500";
    return "text-red-500";
  };

  const getSentimentBadge = (sentiment: number) => {
    if (sentiment > 0.5) return { label: "Positive", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (sentiment > -0.5) return { label: "Neutral", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    return { label: "Negative", className: "bg-red-500/20 text-red-400 border-red-500/30" };
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      "Frustration": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "Anger": "bg-red-500/20 text-red-400 border-red-500/30",
      "Satisfaction": "bg-green-500/20 text-green-400 border-green-500/30",
      "Trust": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "Confusion": "bg-purple-500/20 text-purple-400 border-purple-500/30"
    };
    return colors[emotion] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Review Explorer</h1>
        <p className="text-muted-foreground">Search and analyze raw customer reviews with AI-powered insights</p>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews by keyword, phrase, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-12 text-base"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Issuer</label>
              <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issuers</SelectItem>
                  {issuers.map(issuer => (
                    <SelectItem key={issuer} value={issuer}>{issuer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Emotion</label>
              <Select value={selectedEmotion} onValueChange={setSelectedEmotion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Emotions</SelectItem>
                  {emotions.map(emotion => (
                    <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map(review => {
          const sentimentBadge = getSentimentBadge(review.sentiment);
          return (
            <Card key={review.id} className="p-6 hover:border-primary/50 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-foreground">{review.issuer}</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-600"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(review.date).toLocaleDateString()}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">{review.text}</p>

              {/* Tags and Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge className={sentimentBadge.className}>{sentimentBadge.label}</Badge>
                  <Badge className={getEmotionColor(review.emotion)}>{review.emotion}</Badge>
                  {review.topics.slice(0, 3).map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className={`text-sm font-semibold ${getSentimentColor(review.sentiment)}`}>
                  {review.sentiment > 0 ? "+" : ""}{(review.sentiment * 100).toFixed(0)}% sentiment
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredReviews.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reviews found matching your criteria</p>
          </div>
        </Card>
      )}
    </div>
  );
}
