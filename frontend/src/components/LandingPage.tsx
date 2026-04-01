import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { opportunitiesService, type Opportunity, type OpportunityFilters } from '@/services/opportunities.service'
import OpportunityCard from './OpportunityCard'
import { CustomSelect } from './ui/custom-select'
import { RefreshCw, Search, X, Filter } from 'lucide-react'

export default function LandingPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<OpportunityFilters>({
    skip: 0,
    limit: 20,
    category: '',
    type: '',
    search: '',
  })
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    loadOpportunities()
  }, [filters])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if search value actually changed
      if (searchInput !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchInput, skip: 0 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  const loadOpportunities = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await opportunitiesService.getAll(filters)
      setOpportunities(response.opportunities)
    } catch (err: any) {
      console.error('Failed to load opportunities:', err)
      setError('Failed to load opportunities. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof OpportunityFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, skip: 0 }))
  }

  const handleClearFilters = () => {
    setFilters({
      skip: 0,
      limit: 20,
      category: '',
      type: '',
      search: '',
    })
    setSearchInput('')
  }

  const hasActiveFilters = filters.category || filters.type || filters.search

  const activeFilterCount = [filters.category, filters.type, filters.search].filter(Boolean).length

  const handleDelete = (opportunityId: string) => {
    setOpportunities((prev) => prev.filter((opp) => opp.id !== opportunityId))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Discover Ideas & Problems
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Explore opportunities, share your thoughts, and connect with innovators
          </p>
        </div>

        {/* Modern Filters Section */}
        <div className="mb-8">
          {/* Search Bar - Prominent */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <Input
              type="text"
              placeholder="Search for opportunities, ideas, or problems..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-12 pr-4 h-12 text-base bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all shadow-sm hover:shadow-md"
            />
          </div>

          {/* Filter Pills Section */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 dark:bg-blue-500 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
            </div>

            {/* Category Filter Pill */}
            <div className="relative">
              <CustomSelect
                value={filters.category || ''}
                onChange={(value) => handleFilterChange('category', value)}
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'farming', label: 'Farming' },
                  { value: 'food', label: 'Food' },
                  { value: 'tech', label: 'Technology' },
                  { value: 'education', label: 'Education' },
                  { value: 'health', label: 'Health' },
                  { value: 'government', label: 'Government' },
                  { value: 'environment', label: 'Environment' },
                  { value: 'infrastructure', label: 'Infrastructure' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Category"
                className="min-w-[140px]"
              />
            </div>

            {/* Type Filter Pill */}
            <div className="relative">
              <CustomSelect
                value={filters.type || ''}
                onChange={(value) => handleFilterChange('type', value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'problem', label: 'Problem' },
                  { value: 'idea', label: 'Idea' },
                  { value: 'improvement', label: 'Improvement' },
                ]}
                placeholder="Type"
                className="min-w-[130px]"
              />
            </div>

            {/* Active Filter Badges */}
            {filters.category && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-500/30">
                <span className="capitalize">{filters.category}</span>
                <button
                  onClick={() => handleFilterChange('category', '')}
                  className="hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {filters.type && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-sm font-medium border border-purple-200 dark:border-purple-500/30">
                <span className="capitalize">{filters.type}</span>
                <button
                  onClick={() => handleFilterChange('type', '')}
                  className="hover:bg-purple-100 dark:hover:bg-purple-500/20  rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Clear All */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Subtle Divider */}
        {!isLoading && opportunities.length > 0 && (
          <div className="mb-6 border-t border-slate-200 dark:border-slate-800"></div>
        )}

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 mb-4">{error}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && opportunities.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Found <span className="font-semibold text-slate-900 dark:text-slate-100">{opportunities.length}</span> {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
              {hasActiveFilters && ' matching your filters'}
            </p>
          </div>
        )}

        {isLoading && !opportunities.length ? (
          <div className="flex flex-col justify-center items-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 dark:text-cyan-400 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">
              {hasActiveFilters ? 'No opportunities match your filters' : 'No opportunities found'}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {hasActiveFilters ? 'Try adjusting your filters or search terms' : 'Check back later for new ideas and problems!'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="rounded-full"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <OpportunityCard 
                key={opportunity.id} 
                opportunity={opportunity} 
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
