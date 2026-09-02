import React, { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Script, LeadStage } from '@/types'
import { STAGES_CONFIG } from '@/components/LeadModal'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Lock,
  Sparkles,
  ShieldAlert,
  Clock,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export default function Scripts() {
  const { scripts, isManagerOrAdmin, addScript, updateScript, deleteScript, currentUser } = useApp()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<LeadStage>('Novo')
  const [content, setContent] = useState('')

  const [errorTitle, setErrorTitle] = useState('')
  const [errorContent, setErrorContent] = useState('')

  const handleOpenCreate = () => {
    setEditingScript(null)
    setTitle('')
    setStage('Novo')
    setContent('')
    setErrorTitle('')
    setErrorContent('')
    setModalOpen(true)
  }

  const handleOpenEdit = (script: Script) => {
    setEditingScript(script)
    setTitle(script.title)
    setStage(script.stage)
    setContent(script.content)
    setErrorTitle('')
    setErrorContent('')
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (!title.trim()) {
      setErrorTitle('Informe o título do script.')
      hasError = true
    }
    if (!content.trim()) {
      setErrorContent('O conteúdo do script não pode estar vazio.')
      hasError = true
    }

    if (hasError) return

    if (editingScript) {
      updateScript(editingScript.id, {
        title: title.trim(),
        stage,
        content: content.trim(),
      })
    } else {
      addScript({
        title: title.trim(),
        stage,
        content: content.trim(),
      })
    }

    setModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (scriptToDelete) {
      deleteScript(scriptToDelete.id)
      setScriptToDelete(null)
    }
  }

  const handleCopyContent = (script: Script) => {
    navigator.clipboard.writeText(script.content)
    setCopiedId(script.id)
    toast({
      title: 'Texto copiado!',
      description: `O script "${script.title}" foi copiado para sua área de transferência.`,
    })
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scripts de Atendimento e Follow-up
          </h2>
          <p className="text-sm text-slate-500">
            Modelos e argumentos padronizados para guiar o acolhimento do CRC e a equipe em cada
            etapa
          </p>
        </div>

        {isManagerOrAdmin ? (
          <Button
            onClick={handleOpenCreate}
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo script</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Modo leitura — Edição restrita à Gerência / Administrativo</span>
          </div>
        )}
      </div>

      {/* Permission Warning Banner if not Admin */}
      {!isManagerOrAdmin && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-bold text-amber-950">Acesso em Modo de Consulta</p>
            <p className="mt-0.5 text-amber-800/90 leading-relaxed">
              Você está conectado como <strong>{currentUser?.name}</strong> (função:{' '}
              <strong>{currentUser?.roleName}</strong>). Você pode visualizar e copiar os scripts
              para utilizar nos atendimentos via WhatsApp e telefone. Apenas{' '}
              <strong>Gerência</strong> e <strong>Administrativo</strong> podem cadastrar e alterar
              roteiros.
            </p>
          </div>
        </div>
      )}

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scripts.map((script) => {
          const stageConfig = STAGES_CONFIG.find((s) => s.key === script.stage)

          return (
            <div
              key={script.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Stage badge + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: stageConfig?.bgLight,
                      color: stageConfig?.textColor,
                      borderColor: stageConfig?.borderColor,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stageConfig?.color }}
                    />
                    <span>Etapa: {script.stage}</span>
                  </span>

                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(script)}
                        className="h-8 w-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                        title="Editar script"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setScriptToDelete(script)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir script"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mt-2">{script.title}</h3>

                {/* Content text */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal max-h-56 overflow-y-auto">
                  {script.content}
                </div>
              </div>

              {/* Footer: Updated at + Copy action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  Atualizado em {script.updatedAt}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyContent(script)}
                  className="text-xs font-semibold text-teal-800 border-teal-200 hover:bg-teal-50 gap-1.5 h-8"
                >
                  {copiedId === script.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar texto</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create / Edit Script */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingScript ? 'Editar Script' : 'Novo Script de Atendimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scriptTitle" className="text-xs font-semibold text-slate-700">
                Título do Script <span className="text-red-500">*</span>
              </Label>
              <Input
                id="scriptTitle"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errorTitle) setErrorTitle('')
                }}
                placeholder="Ex.: 1º Contato WhatsApp — Boas-vindas Implantes"
                className="h-10 text-sm"
              />
              {errorTitle && <p className="text-xs text-red-500">{errorTitle}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Vincular à Etapa do Funil <span className="text-red-500">*</span>
              </Label>
              <Select value={stage} onValueChange={(val) => setStage(val as LeadStage)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES_CONFIG.map((stg) => (
                    <SelectItem key={stg.key} value={stg.key}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stg.color }}
                        />
                        <span>{stg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="scriptContent" className="text-xs font-semibold text-slate-700">
                  Texto / Conteúdo do Script <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  Dica: use [Nome do Paciente] para variáveis automáticas
                </span>
              </div>
              <Textarea
                id="scriptContent"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  if (errorContent) setErrorContent('')
                }}
                placeholder="Escreva a mensagem ou roteiro de conversa completo..."
                className="text-sm min-h-[160px] font-sans"
              />
              {errorContent && <p className="text-xs text-red-500">{errorContent}</p>}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium"
              >
                {editingScript ? 'Salvar Alterações' : 'Salvar Script'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!scriptToDelete}
        onOpenChange={(open) => !open && setScriptToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Script?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover o script "<strong>{scriptToDelete?.title}</strong>"?
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
