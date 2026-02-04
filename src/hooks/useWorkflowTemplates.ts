import { useState, useMemo } from 'react';
import { 
  WorkflowTemplate, 
  TemplateFilter, 
  IndustryCategory, 
  AutomationCategory, 
  WorkflowComplexity,
  workflowTemplates,
  getFeaturedTemplates,
  searchTemplates
} from '@/lib/workflowTemplates';

export function useWorkflowTemplates() {
  const [filter, setFilter] = useState<TemplateFilter>({
    industry: 'all',
    automationCategory: 'all',
    complexity: 'all',
    searchQuery: ''
  });

  const filteredTemplates = useMemo(() => {
    let results = [...workflowTemplates];

    // Search filter
    if (filter.searchQuery && filter.searchQuery.trim()) {
      results = searchTemplates(filter.searchQuery);
    }

    // Industry filter
    if (filter.industry && filter.industry !== 'all') {
      results = results.filter(t => t.industry === filter.industry);
    }

    // Automation category filter
    if (filter.automationCategory && filter.automationCategory !== 'all') {
      results = results.filter(t => t.automationCategory === filter.automationCategory);
    }

    // Complexity filter
    if (filter.complexity && filter.complexity !== 'all') {
      results = results.filter(t => t.complexity === filter.complexity);
    }

    return results;
  }, [filter]);

  const featuredTemplates = useMemo(() => getFeaturedTemplates(), []);

  const setIndustryFilter = (industry: IndustryCategory | 'all') => {
    setFilter(prev => ({ ...prev, industry }));
  };

  const setCategoryFilter = (automationCategory: AutomationCategory | 'all') => {
    setFilter(prev => ({ ...prev, automationCategory }));
  };

  const setComplexityFilter = (complexity: WorkflowComplexity | 'all') => {
    setFilter(prev => ({ ...prev, complexity }));
  };

  const setSearchQuery = (searchQuery: string) => {
    setFilter(prev => ({ ...prev, searchQuery }));
  };

  const clearFilters = () => {
    setFilter({
      industry: 'all',
      automationCategory: 'all',
      complexity: 'all',
      searchQuery: ''
    });
  };

  const hasActiveFilters = 
    filter.industry !== 'all' || 
    filter.automationCategory !== 'all' || 
    filter.complexity !== 'all' ||
    (filter.searchQuery && filter.searchQuery.trim() !== '');

  return {
    templates: filteredTemplates,
    featuredTemplates,
    filter,
    setIndustryFilter,
    setCategoryFilter,
    setComplexityFilter,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
    totalCount: workflowTemplates.length
  };
}
