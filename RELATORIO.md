# Relatório da primeira execução

- **Data:** 06/10/2026
- **Ambiente:** Windows, Node.js 24.19.0; servidor iniciado localmente sem banco nem Google.
- **Aplicativo testado:** [Finanças a Dois](https://github.com/YannSantana/financas-a-dois).
- **Comando:** `npm test`

| Resultado | Quantidade |
| --- | ---: |
| Testes automáticos executados | 8 |
| Passaram | 8 |
| Falharam | 0 |
| Bloqueados | 0 |

## O que observei

A apresentação respondeu normalmente, e os arquivos internos consultados retornaram acesso negado. Sem banco, o aplicativo informou que a sessão não estava disponível e recusou gravações de dados financeiros. Sem as integrações configuradas, o login Google e a verificação do WhatsApp não abriram acesso. O logout recusou uma origem externa.

## Limite do resultado

Esta rodada verifica o comportamento do aplicativo **sem serviços configurados**. Ela não prova que cálculos, permissões entre duas pessoas, metas ou convites funcionem em um ambiente conectado ao banco. Esses cenários estão no [plano](PLANO-DE-TESTES.md) e continuam não executados.
