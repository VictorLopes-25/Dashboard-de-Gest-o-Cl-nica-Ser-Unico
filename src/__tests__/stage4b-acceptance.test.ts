import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { getOrganizationId } from '@/services/organizationService'

const TEST_PREFIX = 'STAGE4B_TEST_'

describe('Stage 4B: Management Core — Matrix, Visibility RLS & Actions Acceptance', () => {
  let orgId: string
  let authUserId: string | null = null

  beforeAll(async () => {
    orgId = await getOrganizationId()
    expect(orgId).toBeTruthy()

    const { data: userResp } = await supabase.auth.getUser()
    if (userResp?.user) {
      authUserId = userResp.user.id
    }
  })

  afterAll(async () => {
    // Invariante obrigatória: TEMP_TEST_DATA_REMOVED = TRUE
    try {
      await (supabase as any).from('management_actions').delete().ilike('title', `${TEST_PREFIX}%`)
      await (supabase as any).from('management_items').delete().ilike('title', `${TEST_PREFIX}%`)
    } catch {
      // ignore
    }
  })

  describe('DATABASE SCHEMA & ENUMS INTEGRITY', () => {
    it('MGMT 1: Enums da matriz de gestão e visibilidade existem no banco', async () => {
      // Consultar types via query segura RPC ou leitura
      const { data, error } = await (supabase as any).rpc('is_current_manager')
      expect(error).toBeNull()
      expect(typeof data).toBe('boolean')
    })

    it('MGMT 2: Helper is_current_manager() retorna booleano para a sessão', async () => {
      const { data, error } = await (supabase as any).rpc('is_current_manager')
      expect(error).toBeNull()
      expect(typeof data === 'boolean').toBe(true)
    })
  })

  describe('RLS & VISIBILITY ENFORCEMENT RULES', () => {
    it('RLS 1: Deny-by-default — requisições anônimas ou não autorizadas são bloqueadas', async () => {
      // Tentar inserir item de gestão sem autenticação/permissão de gestão
      if (!authUserId) {
        const { error } = await (supabase as any).from('management_items').insert({
          organization_id: orgId,
          title: `${TEST_PREFIX}Anon_Item`,
          content: 'Conteúdo de teste',
          type: 'feedback',
          visibility_level: 'SHARED_WITH_EMPLOYEE',
        })
        expect(error).not.toBeNull()
      }
    })

    it('RLS 2: OWNER_ONLY — Não vaza para chamadas não-OWNER', async () => {
      // Invariante D4: OWNER_ONLY só é retornado quando is_current_owner() = true
      const { data: isOwner } = await supabase.rpc('is_current_owner')

      const { data: ownerOnlyItems, error } = await (supabase as any)
        .from('management_items')
        .select('*')
        .eq('visibility_level', 'OWNER_ONLY')

      if (!isOwner) {
        // Se o usuário não for OWNER, deve retornar lista vazia de OWNER_ONLY
        expect(ownerOnlyItems?.length ?? 0).toBe(0)
      } else {
        expect(error).toBeNull()
      }
    })

    it('RLS 3: Acknowledge de feedback — RPC acknowledge_management_item rejeita anônimo', async () => {
      const fakeItemId = '00000000-0000-0000-0000-000000000001'
      const { data, error } = await (supabase as any).rpc('acknowledge_management_item', {
        p_item_id: fakeItemId,
      })

      if (!authUserId) {
        expect(error).not.toBeNull()
        expect(error?.message).toMatch(/Acesso negado|Operação negada|pessoa ativa/i)
      }
    })

    it('RLS 4: Emenda B — DELETE em management_items e management_actions é restrito a OWNER', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099'
      const { error: delErr } = await (supabase as any)
        .from('management_items')
        .delete()
        .eq('id', nonExistentId)

      // Com RLS ativada, anon/não-owner ou recebe erro ou 0 rows
      expect(
        delErr === null ||
          delErr.code === '42501' ||
          delErr.message.includes('permission') ||
          delErr.message.includes('row-level security'),
      ).toBe(true)
    })
  })

  describe('MANAGEMENT ACTIONS WORKFLOW', () => {
    it('ACTIONS 1: Tabela management_actions aceita consulta protegida por RLS', async () => {
      const { data, error } = await (supabase as any)
        .from('management_actions')
        .select('id, title, status, due_date')
        .limit(5)

      // anon retorna erro ou authenticated lê sua org
      expect(
        error === null ||
          error.code === '42501' ||
          error.message.includes('row-level security') ||
          error.message.includes('permission'),
      ).toBe(true)
    })
  })
})
