import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Clock, 
  Zap, 
  Star,
  Filter,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates';
import { 
  WorkflowTemplate, 
  INDUSTRY_LABELS, 
  AUTOMATION_LABELS,
  COMPLEXITY_CONFIG,
  IndustryCategory,
  AutomationCategory,
  WorkflowComplexity
} from '@/lib/workflowTemplates';
import { toast } from 'sonner';

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (template: WorkflowTemplate) => void;
}

export function TemplateLibrary({ open, onOpenChange, onImport }: TemplateLibraryProps) {
  const {
    templates,
    featuredTemplates,
    filter,
    setIndustryFilter,
    setCategoryFilter,
    setComplexityFilter,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
    totalCount
  } = useWorkflowTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const handleImport = (template: WorkflowTemplate) => {
    // Generate n8n-compatible JSON
    const workflowJson = {
      name: template.name,
      nodes: template.nodes,
      connections: template.connections,
      settings: { executionOrder: 'v1' },
      active: false
    };

    // Download as JSON file
    const blob = new Blob([JSON.stringify(workflowJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded "${template.name}"`, {
      description: 'Import this file into n8n to get started'
    });

    onImport?.(template);
  };

  const displayTemplates = activeTab === 'featured' ? featuredTemplates : templates;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Workflow Template Library
          </DialogTitle>
          <DialogDescription>
            Industry-specific n8n templates ready for one-click import
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={filter.searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filter.industry || 'all'}
                onValueChange={(v) => setIndustryFilter(v as IndustryCategory | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.automationCategory || 'all'}
                onValueChange={(v) => setCategoryFilter(v as AutomationCategory | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(AUTOMATION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.complexity || 'all'}
                onValueChange={(v) => setComplexityFilter(v as WorkflowComplexity | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {Object.entries(COMPLEXITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1">
                <Filter className="h-3.5 w-3.5" />
                All ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="featured" className="gap-1">
                <Star className="h-3.5 w-3.5" />
                Featured ({featuredTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-[400px] pr-4">
                {displayTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No templates match your filters</p>
                    <Button variant="link" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {displayTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => setSelectedTemplate(template)}
                        onImport={() => handleImport(template)}
                        isSelected={selectedTemplate?.id === template.id}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <TemplateDetails 
            template={selectedTemplate} 
            onClose={() => setSelectedTemplate(null)}
            onImport={() => handleImport(selectedTemplate)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onSelect: () => void;
  onImport: () => void;
  isSelected: boolean;
}

function TemplateCard({ template, onSelect, onImport, isSelected }: TemplateCardProps) {
  const complexityConfig = COMPLEXITY_CONFIG[template.complexity];

  return (
    <div 
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? 'border-primary bg-primary/5' : 'bg-card'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{template.name}</h3>
            {template.featured && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {template.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {INDUSTRY_LABELS[template.industry]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {AUTOMATION_LABELS[template.automationCategory]}
            </Badge>
            <Badge className={`text-xs ${complexityConfig.color}`}>
              {complexityConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {template.estimatedSetupTime}
            </span>
            <span className="text-xs text-muted-foreground">
              {template.nodes.length} nodes
            </span>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation();
            onImport();
          }}
          className="flex-shrink-0"
        >
          <Download className="h-4 w-4 mr-1" />
          Import
        </Button>
      </div>
    </div>
  );
}

interface TemplateDetailsProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onImport: () => void;
}

function TemplateDetails({ template, onClose, onImport }: TemplateDetailsProps) {
  const complexityConfig = COMPLEXITY_CONFIG[template.complexity];

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {template.name}
            {template.featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
          </h3>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Industry</div>
          <div className="font-medium">{INDUSTRY_LABELS[template.industry]}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Category</div>
          <div className="font-medium">{AUTOMATION_LABELS[template.automationCategory]}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Complexity</div>
          <Badge className={complexityConfig.color}>{complexityConfig.label}</Badge>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Setup Time</div>
          <div className="font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {template.estimatedSetupTime}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Required Credentials</div>
        <div className="flex flex-wrap gap-2">
          {template.requiredCredentials.map((cred, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {cred}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Workflow Nodes ({template.nodes.length})</div>
        <div className="flex flex-wrap gap-2">
          {template.nodes.map((node) => (
            <Badge key={node.id} variant="outline" className="text-xs gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {node.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onImport} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Download for n8n Import
        </Button>
      </div>
    </div>
  );
}
