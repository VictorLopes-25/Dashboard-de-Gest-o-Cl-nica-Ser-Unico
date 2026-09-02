import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8F7] p-4">
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-md text-center max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <h2 className="text-lg font-bold text-slate-800">Página não encontrada</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          O caminho que você tentou acessar não existe no sistema Ser Único.
        </p>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
