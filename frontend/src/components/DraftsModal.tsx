import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { X, Edit, Trash2, FileText, Loader2 } from 'lucide-react'
import { draftsService, type Draft } from '@/services/drafts.service'
import { ConfirmDialog } from './ui/confirm-dialog'

interface DraftsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDraft: (draft: Draft) => void
}

export default function DraftsModal({ isOpen, onClose, onSelectDraft }: DraftsModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadDrafts()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const loadDrafts = async () => {
    setIsLoading(true)
    try {
      const data = await draftsService.getAll()
      setDrafts(data)
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  const handleDeleteClick = (draftId: string) => {
    setDraftToDelete(draftId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!draftToDelete) return

    try {
      await draftsService.delete(draftToDelete)
      setDrafts(drafts.filter((d) => d.id !== draftToDelete))
      setDraftToDelete(null)
    } catch {
      alert('Failed to delete draft. Please try again.')
    }
  }

  const handleEditDraft = (draft: Draft) => {
    onSelectDraft(draft)
    handleClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!isOpen && !isClosing) return null

  return (
    <>
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        
        {/* Modal */}
        <div 
          className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col transform transition-all duration-200 ${
            isClosing ? 'scale-95' : 'scale-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                My Drafts
              </h2>
              {!isLoading && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({drafts.length})
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  No drafts yet
                </p>
                <p className="text-sm text-slate-500">
                  Save your work as a draft to finish later
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="group bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-base">
                            {draft.title || 'Untitled Draft'}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                          {draft.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-500/40 shadow-sm">
                            {draft.category || 'No category'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-600/20 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-500/40 shadow-sm">
                            {draft.type}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
                            • {formatDate(draft.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleEditDraft(draft)}
                          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                          <Edit className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline font-medium">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(draft.id)}
                          className="rounded-full border-2 border-red-200 dark:border-red-800 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 shadow-sm hover:shadow-md transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full rounded-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDraftToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Draft?"
        description="Are you sure you want to delete this draft? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  )
}
