import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { CustomSelect } from './ui/custom-select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { opportunitiesService } from '@/services/opportunities.service'
import { draftsService, type Draft } from '@/services/drafts.service'
import type { CreateOpportunityData } from '@/services/opportunities.service'
import { ArrowLeft, Image, Link as LinkIcon, FileText, X, Plus, Save, Loader2 } from 'lucide-react'
import DraftsModal from './DraftsModal'

const CATEGORY_OPTIONS = [
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
]

const TYPE_OPTIONS = [
  { value: 'problem', label: 'Problem' },
  { value: 'idea', label: 'Idea' },
  { value: 'improvement', label: 'Improvement' },
]

export default function CreateOpportunityPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('text')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateOpportunityData & { links?: string[] }>({
    title: '',
    description: '',
    type: 'problem',
    category: '',
    links: [''],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    category?: string
    title?: string
    description?: string
  }>({})
  const [showDraftsModal, setShowDraftsModal] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Load opportunity data if editing
  useEffect(() => {
    if (id) {
      setIsEditMode(true)
      setIsLoading(true)
      opportunitiesService.getById(id)
        .then((opportunity) => {
          setFormData({
            title: opportunity.title,
            description: opportunity.description,
            type: opportunity.type as 'problem' | 'idea' | 'improvement',
            category: opportunity.category,
            links: opportunity.link ? opportunity.link.split(',') : [''],
          })
        })
        .catch(() => {
          setError('Failed to load opportunity')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [id])

  const handleAddLink = () => {
    setFormData({ ...formData, links: [...(formData.links || []), ''] })
  }

  const handleRemoveLink = (index: number) => {
    const newLinks = formData.links?.filter((_, i) => i !== index) || []
    setFormData({ ...formData, links: newLinks.length > 0 ? newLinks : [''] })
  }

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...(formData.links || [])]
    newLinks[index] = value
    setFormData({ ...formData, links: newLinks })
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setError(null)
    setSuccess(null)
    
    try {
      const validLinks = formData.links?.filter((link) => link.trim() !== '') || []
      const linkData = validLinks.length > 0 ? validLinks.join(',') : undefined

      const draftData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        link: linkData,
      }

      if (currentDraftId) {
        // Update existing draft
        await draftsService.update(currentDraftId, draftData)
        setSuccess('Draft updated successfully!')
      } else {
        // Create new draft
        const draft = await draftsService.create(draftData)
        setCurrentDraftId(draft.id)
        setSuccess('Draft saved successfully!')
      }
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError('Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleLoadDraft = (draft: Draft) => {
    setCurrentDraftId(draft.id)
    setFormData({
      title: draft.title,
      description: draft.description,
      type: draft.type,
      category: draft.category,
      links: draft.link ? draft.link.split(',') : [''],
    })
  }

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)
    setFieldErrors({})
    
    // Validation
    const errors: typeof fieldErrors = {}
    
    if (!formData.category) {
      errors.category = 'Please select a category'
    }
    if (formData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters'
    }
    if (formData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      // Filter out empty links
      const validLinks = formData.links?.filter((link) => link.trim() !== '') || []
      const linkData = validLinks.length > 0 ? validLinks.join(',') : undefined

      const opportunityData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        link: linkData,
      }

      if (isEditMode && id) {
        await opportunitiesService.update(id, opportunityData)
      } else {
        await opportunitiesService.create(opportunityData)
        if (currentDraftId) {
          try {
            await draftsService.delete(currentDraftId)
            setCurrentDraftId(null)
          } catch {
            // Silent fail
          }
        }
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} opportunity`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">{isEditMode ? 'Edit Post' : 'Create Post'}</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDraftsModal(true)}
              className="rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={isSubmitting}
            >
              <FileText className="h-4 w-4 mr-2" />
              Drafts
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Category *
            </Label>
            <CustomSelect
              value={formData.category}
              onChange={(value) => {
                setFormData({ ...formData, category: value })
                setFieldErrors({ ...fieldErrors, category: undefined })
              }}
              options={CATEGORY_OPTIONS}
              placeholder="Select a category"
              disabled={isSubmitting}
              className="w-full"
            />
            {fieldErrors.category && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.category}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Type *
            </Label>
            <CustomSelect
              value={formData.type}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as 'problem' | 'idea' | 'improvement',
                })
              }
              options={TYPE_OPTIONS}
              placeholder="Select type"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 w-full justify-start rounded-none p-0 h-auto">
            <TabsTrigger
              value="text"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-6 py-3 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-6 py-3 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100"
            >
              <Image className="h-4 w-4 mr-2" />
              Images & Video
            </TabsTrigger>
            <TabsTrigger
              value="link"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-6 py-3 text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 data-[state=active]:dark:text-slate-100"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">
                  Title *
                </Label>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formData.title.length}/300
                </span>
              </div>
              <Input
                id="title"
                placeholder="Enter a clear and concise title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  setFieldErrors({ ...fieldErrors, title: undefined })
                }}
                maxLength={300}
                className={`bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                  fieldErrors.title ? 'border-red-500 dark:border-red-500' : ''
                }`}
                disabled={isSubmitting}
              />
              {fieldErrors.title && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-slate-700 dark:text-slate-300 mb-2 block">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Provide context, impact, and details about this opportunity..."
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value })
                  setFieldErrors({ ...fieldErrors, description: undefined })
                }}
                rows={12}
                className={`bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none ${
                  fieldErrors.description ? 'border-red-500 dark:border-red-500' : ''
                }`}
                disabled={isSubmitting}
              />
              {fieldErrors.description && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.description}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-12 text-center">
              <Image className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
              <p className="text-slate-600 dark:text-slate-400 mb-2">Image & Video support coming soon</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                This feature is currently under development
              </p>
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-700 dark:text-slate-300">Links</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAddLink}
                  disabled={isSubmitting}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Add one or more URLs related to this opportunity
              </p>
              <div className="space-y-3">
                {formData.links?.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      disabled={isSubmitting}
                    />
                    {formData.links && formData.links.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveLink(index)}
                        disabled={isSubmitting}
                        className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Posting...') : (isEditMode ? 'Update' : 'Post')}
          </Button>
        </div>
      </main>

      <DraftsModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleLoadDraft}
      />
    </div>
  )
}
