export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys_pool: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          key_value: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          priority: number | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          key_value: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          priority?: number | null
          provider?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          key_value?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          priority?: number | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          atualizado_em: string
          aviso_pre_exclusao_enviado_em: string | null
          cancel_at_period_end: boolean
          criado_em: string
          data_congelamento: string | null
          data_fim_trial: string
          data_inadimplencia: string | null
          data_inicio_plano: string | null
          data_inicio_trial: string
          data_ultima_cobranca: string | null
          dias_inadimplente: number
          email_congelamento_enviado_em: string | null
          email_trial_enviado_em: string | null
          excluir_dados_em: string | null
          id: string
          metodo_pagamento: string | null
          plano: string
          proxima_renovacao: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          usuario_id: string
          valor_mensal: number
        }
        Insert: {
          atualizado_em?: string
          aviso_pre_exclusao_enviado_em?: string | null
          cancel_at_period_end?: boolean
          criado_em?: string
          data_congelamento?: string | null
          data_fim_trial?: string
          data_inadimplencia?: string | null
          data_inicio_plano?: string | null
          data_inicio_trial?: string
          data_ultima_cobranca?: string | null
          dias_inadimplente?: number
          email_congelamento_enviado_em?: string | null
          email_trial_enviado_em?: string | null
          excluir_dados_em?: string | null
          id?: string
          metodo_pagamento?: string | null
          plano?: string
          proxima_renovacao?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          usuario_id: string
          valor_mensal?: number
        }
        Update: {
          atualizado_em?: string
          aviso_pre_exclusao_enviado_em?: string | null
          cancel_at_period_end?: boolean
          criado_em?: string
          data_congelamento?: string | null
          data_fim_trial?: string
          data_inadimplencia?: string | null
          data_inicio_plano?: string | null
          data_inicio_trial?: string
          data_ultima_cobranca?: string | null
          dias_inadimplente?: number
          email_congelamento_enviado_em?: string | null
          email_trial_enviado_em?: string | null
          excluir_dados_em?: string | null
          id?: string
          metodo_pagamento?: string | null
          plano?: string
          proxima_renovacao?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          usuario_id?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      cards: {
        Row: {
          alternativa_a: string | null
          alternativa_b: string | null
          alternativa_c: string | null
          alternativa_correta: string | null
          alternativa_d: string | null
          alternativa_e: string | null
          atualizado_em: string
          aula_id: string | null
          baralho: string | null
          comando: string
          criado_em: string
          criado_por_usuario_id: string | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          explicacao: string
          id: string
          info_1: string | null
          info_2: string | null
          info_3: string | null
          info_4: string | null
          info_5: string | null
          modo: Database["public"]["Enums"]["modo_oq"]
          origem: Database["public"]["Enums"]["origem_card"]
          peso_importancia: number
          var_1: string | null
          var_2: string | null
          var_3: string | null
          var_4: string | null
          var_5: string | null
          verificado: boolean
        }
        Insert: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_correta?: string | null
          alternativa_d?: string | null
          alternativa_e?: string | null
          atualizado_em?: string
          aula_id?: string | null
          baralho?: string | null
          comando: string
          criado_em?: string
          criado_por_usuario_id?: string | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          explicacao: string
          id?: string
          info_1?: string | null
          info_2?: string | null
          info_3?: string | null
          info_4?: string | null
          info_5?: string | null
          modo: Database["public"]["Enums"]["modo_oq"]
          origem?: Database["public"]["Enums"]["origem_card"]
          peso_importancia?: number
          var_1?: string | null
          var_2?: string | null
          var_3?: string | null
          var_4?: string | null
          var_5?: string | null
          verificado?: boolean
        }
        Update: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_correta?: string | null
          alternativa_d?: string | null
          alternativa_e?: string | null
          atualizado_em?: string
          aula_id?: string | null
          baralho?: string | null
          comando?: string
          criado_em?: string
          criado_por_usuario_id?: string | null
          especialidade?: Database["public"]["Enums"]["especialidade"]
          explicacao?: string
          id?: string
          info_1?: string | null
          info_2?: string | null
          info_3?: string | null
          info_4?: string | null
          info_5?: string | null
          modo?: Database["public"]["Enums"]["modo_oq"]
          origem?: Database["public"]["Enums"]["origem_card"]
          peso_importancia?: number
          var_1?: string | null
          var_2?: string | null
          var_3?: string | null
          var_4?: string | null
          var_5?: string | null
          verificado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cards_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_pendentes_revisao: {
        Row: {
          criado_em: string
          geracao_id: string
          id: string
          payload: Json
          selecionado: boolean
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          geracao_id: string
          id?: string
          payload: Json
          selecionado?: boolean
          usuario_id: string
        }
        Update: {
          criado_em?: string
          geracao_id?: string
          id?: string
          payload?: Json
          selecionado?: boolean
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_pendentes_revisao_geracao_id_fkey"
            columns: ["geracao_id"]
            isOneToOne: false
            referencedRelation: "geracoes_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      desempenho_cards: {
        Row: {
          atualizado_em: string
          card_id: string
          contador_acertos: number
          contador_erros: number
          contador_vezes: number
          criado_em: string
          id: string
          nivel_pista_ultima: number
          proxima_revisao: string | null
          score_prioridade: number
          timestamp_ultima: string | null
          ultima_nota: number | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          card_id: string
          contador_acertos?: number
          contador_erros?: number
          contador_vezes?: number
          criado_em?: string
          id?: string
          nivel_pista_ultima?: number
          proxima_revisao?: string | null
          score_prioridade?: number
          timestamp_ultima?: string | null
          ultima_nota?: number | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          card_id?: string
          contador_acertos?: number
          contador_erros?: number
          contador_vezes?: number
          criado_em?: string
          id?: string
          nivel_pista_ultima?: number
          proxima_revisao?: string | null
          score_prioridade?: number
          timestamp_ultima?: string | null
          ultima_nota?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desempenho_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          desistencias: number | null
          id: string
          inadimplencias: number | null
          is_projecao: boolean | null
          lucro_total: number | null
          mes: string
          novas_captacoes: number | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          desistencias?: number | null
          id?: string
          inadimplencias?: number | null
          is_projecao?: boolean | null
          lucro_total?: number | null
          mes: string
          novas_captacoes?: number | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          desistencias?: number | null
          id?: string
          inadimplencias?: number | null
          is_projecao?: boolean | null
          lucro_total?: number | null
          mes?: string
          novas_captacoes?: number | null
        }
        Relationships: []
      }
      favoritos: {
        Row: {
          card_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          card_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          card_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      geracoes_ia: {
        Row: {
          criado_em: string
          erro: string | null
          id: string
          nome_arquivo: string | null
          qtd_abcde: number | null
          qtd_lacuna: number | null
          qtd_oq_falta: number | null
          quantidade_gerada: number
          quantidade_solicitada: number
          status: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo: string
          usar_distribuicao_ia: boolean
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          qtd_abcde?: number | null
          qtd_lacuna?: number | null
          qtd_oq_falta?: number | null
          quantidade_gerada?: number
          quantidade_solicitada: number
          status?: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo: string
          usar_distribuicao_ia?: boolean
          usuario_id: string
        }
        Update: {
          criado_em?: string
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          qtd_abcde?: number | null
          qtd_lacuna?: number | null
          qtd_oq_falta?: number | null
          quantidade_gerada?: number
          quantidade_solicitada?: number
          status?: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo?: string
          usar_distribuicao_ia?: boolean
          usuario_id?: string
        }
        Relationships: []
      }
      historico_estudo: {
        Row: {
          acertou: boolean
          card_id: string
          id: string
          nivel_pista: number | null
          nota: number
          timestamp: string | null
          usuario_id: string
        }
        Insert: {
          acertou: boolean
          card_id: string
          id?: string
          nivel_pista?: number | null
          nota: number
          timestamp?: string | null
          usuario_id: string
        }
        Update: {
          acertou?: boolean
          card_id?: string
          id?: string
          nivel_pista?: number | null
          nota?: number
          timestamp?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_estudo_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_prompts: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          id: string
          modelo_padrao: string
          prompt: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          id?: string
          modelo_padrao?: string
          prompt: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          id?: string
          modelo_padrao?: string
          prompt?: string
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          atualizado_em: string
          convertido_em: string | null
          convidado_id: string
          criado_em: string
          cupom_aplicado: boolean
          id: string
          indicador_id: string
          ip_pagamento: unknown
          ip_signup: unknown
          recompensado_em: string | null
          status: string
          stripe_credit_note_id: string | null
          valor_credito_brl: number
        }
        Insert: {
          atualizado_em?: string
          convertido_em?: string | null
          convidado_id: string
          criado_em?: string
          cupom_aplicado?: boolean
          id?: string
          indicador_id: string
          ip_pagamento?: unknown
          ip_signup?: unknown
          recompensado_em?: string | null
          status?: string
          stripe_credit_note_id?: string | null
          valor_credito_brl?: number
        }
        Update: {
          atualizado_em?: string
          convertido_em?: string | null
          convidado_id?: string
          criado_em?: string
          cupom_aplicado?: boolean
          id?: string
          indicador_id?: string
          ip_pagamento?: unknown
          ip_signup?: unknown
          recompensado_em?: string | null
          status?: string
          stripe_credit_note_id?: string | null
          valor_credito_brl?: number
        }
        Relationships: []
      }
      lista_espera: {
        Row: {
          contatado: boolean
          criado_em: string
          email: string
          id: string
          mensagem: string | null
          nome: string | null
          whatsapp: string | null
        }
        Insert: {
          contatado?: boolean
          criado_em?: string
          email: string
          id?: string
          mensagem?: string | null
          nome?: string | null
          whatsapp?: string | null
        }
        Update: {
          contatado?: boolean
          criado_em?: string
          email?: string
          id?: string
          mensagem?: string | null
          nome?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      materiais: {
        Row: {
          created_at: string
          especialidade: string
          id: string
          key_words: string | null
          link_1: string
          link_2: string | null
          nome: string
          tier: number
          tipo_1: string
          tipo_2: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          especialidade: string
          id?: string
          key_words?: string | null
          link_1: string
          link_2?: string | null
          nome: string
          tier?: number
          tipo_1?: string
          tipo_2?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          especialidade?: string
          id?: string
          key_words?: string | null
          link_1?: string
          link_2?: string | null
          nome?: string
          tier?: number
          tipo_1?: string
          tipo_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_highlights: {
        Row: {
          color: string
          created_at: string
          highlighted_text: string
          id: string
          material_id: string
          page_number: number
          position: Json
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          highlighted_text: string
          id?: string
          material_id: string
          page_number: number
          position?: Json
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          highlighted_text?: string
          id?: string
          material_id?: string
          page_number?: number
          position?: Json
          user_id?: string
        }
        Relationships: []
      }
      material_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          material_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          material_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          material_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_notes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          criado_em: string
          data_pagamento: string
          id: string
          metodo: string | null
          plano: string
          status: string
          usuario_id: string
          valor: number
        }
        Insert: {
          criado_em?: string
          data_pagamento?: string
          id?: string
          metodo?: string | null
          plano: string
          status?: string
          usuario_id: string
          valor: number
        }
        Update: {
          criado_em?: string
          data_pagamento?: string
          id?: string
          metodo?: string | null
          plano?: string
          status?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: []
      }
      problemas_admin: {
        Row: {
          atualizado_em: string
          card_id: string | null
          criado_em: string
          descricao: string | null
          id: string
          origem: string
          prioridade: Database["public"]["Enums"]["prioridade_problema"]
          report_id: string | null
          status: Database["public"]["Enums"]["status_problema"]
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          card_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          origem?: string
          prioridade?: Database["public"]["Enums"]["prioridade_problema"]
          report_id?: string | null
          status?: Database["public"]["Enums"]["status_problema"]
          titulo: string
        }
        Update: {
          atualizado_em?: string
          card_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          origem?: string
          prioridade?: Database["public"]["Enums"]["prioridade_problema"]
          report_id?: string | null
          status?: Database["public"]["Enums"]["status_problema"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "problemas_admin_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problemas_admin_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_erro"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          foto_url: string | null
          id: string
          is_banned: boolean | null
          nome: string
          objetivo_principal: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_skipped: boolean
          referral_code: string | null
          referred_by: string | null
          whatsapp: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          foto_url?: string | null
          id: string
          is_banned?: boolean | null
          nome?: string
          objetivo_principal?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
          referral_code?: string | null
          referred_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          foto_url?: string | null
          id?: string
          is_banned?: boolean | null
          nome?: string
          objetivo_principal?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_skipped?: boolean
          referral_code?: string | null
          referred_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      reports_erro: {
        Row: {
          card_id: string
          comentario: string | null
          criado_em: string
          id: string
          resolvido_em: string | null
          status: Database["public"]["Enums"]["status_report"]
          tipo: Database["public"]["Enums"]["tipo_report"]
          usuario_id: string
        }
        Insert: {
          card_id: string
          comentario?: string | null
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_report"]
          tipo: Database["public"]["Enums"]["tipo_report"]
          usuario_id: string
        }
        Update: {
          card_id?: string
          comentario?: string | null
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_report"]
          tipo?: Database["public"]["Enums"]["tipo_report"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_erro_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_questoes: {
        Row: {
          comando: string
          created_at: string | null
          especialidade: string | null
          explicacao_1: string | null
          explicacao_2: string | null
          explicacao_3: string | null
          gabarito: string
          id: string
          opcao_a: string | null
          opcao_b: string | null
          opcao_c: string | null
          opcao_d: string | null
          opcao_e: string | null
          ordem: number | null
          simulado_id: string | null
        }
        Insert: {
          comando: string
          created_at?: string | null
          especialidade?: string | null
          explicacao_1?: string | null
          explicacao_2?: string | null
          explicacao_3?: string | null
          gabarito: string
          id?: string
          opcao_a?: string | null
          opcao_b?: string | null
          opcao_c?: string | null
          opcao_d?: string | null
          opcao_e?: string | null
          ordem?: number | null
          simulado_id?: string | null
        }
        Update: {
          comando?: string
          created_at?: string | null
          especialidade?: string | null
          explicacao_1?: string | null
          explicacao_2?: string | null
          explicacao_3?: string | null
          gabarito?: string
          id?: string
          opcao_a?: string | null
          opcao_b?: string | null
          opcao_c?: string | null
          opcao_d?: string | null
          opcao_e?: string | null
          ordem?: number | null
          simulado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulado_questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_respostas_aluno: {
        Row: {
          acertou: boolean | null
          created_at: string | null
          id: string
          questao_id: string | null
          resposta_marcada: string | null
          tentativa_id: string | null
        }
        Insert: {
          acertou?: boolean | null
          created_at?: string | null
          id?: string
          questao_id?: string | null
          resposta_marcada?: string | null
          tentativa_id?: string | null
        }
        Update: {
          acertou?: boolean | null
          created_at?: string | null
          id?: string
          questao_id?: string | null
          resposta_marcada?: string | null
          tentativa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulado_respostas_aluno_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "simulado_questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulado_respostas_aluno_tentativa_id_fkey"
            columns: ["tentativa_id"]
            isOneToOne: false
            referencedRelation: "simulado_tentativas"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_tentativas: {
        Row: {
          acertos: number | null
          concluido_em: string | null
          created_at: string | null
          erros: number | null
          id: string
          simulado_id: string | null
          total_questoes: number | null
          usuario_id: string | null
        }
        Insert: {
          acertos?: number | null
          concluido_em?: string | null
          created_at?: string | null
          erros?: number | null
          id?: string
          simulado_id?: string | null
          total_questoes?: number | null
          usuario_id?: string | null
        }
        Update: {
          acertos?: number | null
          concluido_em?: string | null
          created_at?: string | null
          erros?: number | null
          id?: string
          simulado_id?: string | null
          total_questoes?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulado_tentativas_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          created_at: string | null
          criado_por: string | null
          especialidade: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_flags: {
        Row: {
          atualizado_em: string
          key: string
          value: Json
        }
        Insert: {
          atualizado_em?: string
          key: string
          value?: Json
        }
        Update: {
          atualizado_em?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      temp_oqs: {
        Row: {
          aula_id: string | null
          contexto_origem: string | null
          created_at: string
          especialidade: string
          etapa_filtro_motivo: string | null
          etapa_filtro_status: string | null
          explicacao: string | null
          id: string
          modelo_ia: string | null
          modo: string
          opcoes: Json | null
          pergunta: string
          ponto_id: string | null
          resposta: string
          user_id: string
          variacoes: string | null
        }
        Insert: {
          aula_id?: string | null
          contexto_origem?: string | null
          created_at?: string
          especialidade: string
          etapa_filtro_motivo?: string | null
          etapa_filtro_status?: string | null
          explicacao?: string | null
          id?: string
          modelo_ia?: string | null
          modo: string
          opcoes?: Json | null
          pergunta: string
          ponto_id?: string | null
          resposta: string
          user_id: string
          variacoes?: string | null
        }
        Update: {
          aula_id?: string | null
          contexto_origem?: string | null
          created_at?: string
          especialidade?: string
          etapa_filtro_motivo?: string | null
          etapa_filtro_status?: string | null
          explicacao?: string | null
          id?: string
          modelo_ia?: string | null
          modo?: string
          opcoes?: Json | null
          pergunta?: string
          ponto_id?: string | null
          resposta?: string
          user_id?: string
          variacoes?: string | null
        }
        Relationships: []
      }
      user_excluded_cards: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_excluded_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ia_usage: {
        Row: {
          count_today: number | null
          last_reset: string | null
          usuario_id: string
        }
        Insert: {
          count_today?: number | null
          last_reset?: string | null
          usuario_id: string
        }
        Update: {
          count_today?: number | null
          last_reset?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          atualizado_em: string | null
          settings: Json
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string | null
          settings?: Json
          usuario_id: string
        }
        Update: {
          atualizado_em?: string | null
          settings?: Json
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_users_view: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          data_fim_trial: string | null
          email: string | null
          foto_url: string | null
          id: string | null
          is_banned: boolean | null
          nome: string | null
          plano_status: string | null
          plano_tipo: string | null
          proxima_renovacao: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          whatsapp: string | null
        }
        Relationships: []
      }
      indicacoes_safe: {
        Row: {
          atualizado_em: string | null
          convertido_em: string | null
          convidado_id: string | null
          criado_em: string | null
          cupom_aplicado: boolean | null
          id: string | null
          indicador_id: string | null
          recompensado_em: string | null
          status: string | null
          stripe_credit_note_id: string | null
          valor_credito_brl: number | null
        }
        Insert: {
          atualizado_em?: string | null
          convertido_em?: string | null
          convidado_id?: string | null
          criado_em?: string | null
          cupom_aplicado?: boolean | null
          id?: string | null
          indicador_id?: string | null
          recompensado_em?: string | null
          status?: string | null
          stripe_credit_note_id?: string | null
          valor_credito_brl?: number | null
        }
        Update: {
          atualizado_em?: string | null
          convertido_em?: string | null
          convidado_id?: string | null
          criado_em?: string | null
          cupom_aplicado?: boolean | null
          id?: string | null
          indicador_id?: string | null
          recompensado_em?: string | null
          status?: string | null
          stripe_credit_note_id?: string | null
          valor_credito_brl?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      admin_set_subscription: {
        Args: { new_plano: string; new_status: string; target_user_id: string }
        Returns: undefined
      }
      aulas_stats: {
        Args: never
        Returns: {
          abcde: number
          aula_id: string
          especialidade: string
          irregularidades: number
          lacuna: number
          nome: string
          oq_falta: number
          sem_explicacao: number
          total: number
        }[]
      }
      can_use_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_users: { Args: never; Returns: undefined }
      daily_subscription_maintenance: { Args: never; Returns: undefined }
      extend_trial: {
        Args: { days_to_add?: number; target_user_id: string }
        Returns: undefined
      }
      gen_referral_code: { Args: never; Returns: string }
      get_daily_progress: { Args: { p_user_id: string }; Returns: number }
      get_user_plan: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_key_error: {
        Args: { _error: string; _id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_premium: {
        Args: { _min_plan?: string; _user_id: string }
        Returns: boolean
      }
      is_subscriber: { Args: { p_user_id: string }; Returns: boolean }
      reset_my_data: { Args: never; Returns: undefined }
      reset_user_data: { Args: { target_user_id: string }; Returns: undefined }
      toggle_user_ban: { Args: { target_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "usuario"
      especialidade:
        | "clinica_medica"
        | "cirurgia_geral"
        | "pediatria"
        | "ginecologia_obstetricia"
        | "medicina_preventiva"
        | "saude_mental"
      modo_oq: "abcde" | "lacuna" | "oq_falta"
      origem_card: "admin" | "usuario" | "ia_pdf" | "ia_csv" | "material_ouro"
      plano: "trial" | "prata" | "ouro"
      prioridade_problema: "baixa" | "media" | "alta" | "critica"
      status_assinatura: "ativo" | "trial" | "inadimplente" | "cancelado"
      status_geracao: "processando" | "concluido" | "erro"
      status_problema: "aberto" | "em_andamento" | "resolvido"
      status_report: "pendente" | "resolvido" | "ignorado"
      tipo_material: "pdf" | "audio"
      tipo_report:
        | "conteudo_incorreto"
        | "erro_digitacao"
        | "ambiguidade"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "usuario"],
      especialidade: [
        "clinica_medica",
        "cirurgia_geral",
        "pediatria",
        "ginecologia_obstetricia",
        "medicina_preventiva",
        "saude_mental",
      ],
      modo_oq: ["abcde", "lacuna", "oq_falta"],
      origem_card: ["admin", "usuario", "ia_pdf", "ia_csv", "material_ouro"],
      plano: ["trial", "prata", "ouro"],
      prioridade_problema: ["baixa", "media", "alta", "critica"],
      status_assinatura: ["ativo", "trial", "inadimplente", "cancelado"],
      status_geracao: ["processando", "concluido", "erro"],
      status_problema: ["aberto", "em_andamento", "resolvido"],
      status_report: ["pendente", "resolvido", "ignorado"],
      tipo_material: ["pdf", "audio"],
      tipo_report: [
        "conteudo_incorreto",
        "erro_digitacao",
        "ambiguidade",
        "outro",
      ],
    },
  },
} as const
