import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle } from "lucide-react";

export function RecentPosts() {
  const [confidence, setConfidence] = useState([0]);
  
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-6">Recent Posts</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Coins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coins</SelectItem>
              <SelectItem value="btc">Bitcoin</SelectItem>
              <SelectItem value="eth">Ethereum</SelectItem>
            </SelectContent>
          </Select>
          
          <Input placeholder="Search post content..." className="flex-1" />
        </div>
        
        <div className="flex gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">Sources:</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="post-twitter" />
                <Label htmlFor="post-twitter" className="text-sm cursor-pointer">Twitter</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="post-reddit" defaultChecked />
                <Label htmlFor="post-reddit" className="text-sm cursor-pointer">Reddit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="post-news" />
                <Label htmlFor="post-news" className="text-sm cursor-pointer">News</Label>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground font-medium">Min Conf:</Label>
            <span className="text-xs font-medium">{confidence[0].toFixed(1)}</span>
          </div>
          <Slider
            value={confidence}
            onValueChange={setConfidence}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          Compare
        </Button>
      </div>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Breaking</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Major crypto exchange announces new security measures...
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-success mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Trending</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Bitcoin adoption reaches new milestone in institutional sector...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
