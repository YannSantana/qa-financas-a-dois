# Relatório de execução — 06/10/2026

Executei os testes no Windows com Node.js 24.19.0 e Chromium instalado pelo Playwright. O aplicativo foi iniciado localmente a partir de uma cópia temporária do [repositório original](https://github.com/YannSantana/financas-a-dois). Para os cenários financeiros, usei um banco PostgreSQL compatível e descartável, com duas pessoas fictícias. Nenhum dado de produção foi usado.

| Conjunto | Passaram | Falharam |
| --- | ---: | ---: |
| Servidor sem banco nem Google | 8 | 0 |
| API financeira com banco descartável | 3 | 0 |
| Navegador, incluindo tela de celular | 4 | 0 |
| **Total** | **15** | **0** |

## O que vi

Na demonstração, a apresentação abriu, os filtros e a busca mostraram as linhas esperadas e a tentativa de salvar sem conta pediu login. Sem banco, a API recusou leitura e gravação de informações financeiras. Com banco, o gasto compartilhado apareceu para Ana e Beto; o gasto pessoal de Ana não apareceu para Beto nem entrou no total pessoal dele. A tentativa de Beto editar um gasto criado por Ana recebeu resposta 404 e não mudou o registro. A segunda meta ativa do plano gratuito foi bloqueada.

## Problema encontrado e corrigido

No primeiro teste em largura de celular, o menu abria, mas a seção “Recursos” não respondia ao toque porque o conteúdo da página ficava sobre o menu. Ajustei a posição do menu no aplicativo e repeti o teste: os quatro cenários de navegador passaram. Esse é um exemplo concreto de como um teste de interface pode encontrar algo que a verificação da API não vê.

## Até onde vai esta conclusão

As duas sessões usadas no teste financeiro foram criadas diretamente no banco. Isso permite verificar permissões e cálculos, mas **não testa o login com Google**. Convite, edição ou exclusão de lançamento próprio, contribuição para meta e WhatsApp seguem abertos no [plano](PLANO-DE-TESTES.md).

## Homologação e execução no GitHub

Publiquei um ambiente separado no [Render](https://financas-a-dois-qa-yannsantana.onrender.com), com banco próprio. O deploy ficou ativo e o health check público respondeu `{"ok":true,"database":"connected"}` em 06/10/2026. Isso confirma que o servidor consegue consultar o banco; os fluxos autenticados ainda precisam de uma rodada com Google configurado.

Os 15 testes passaram também nesta [execução no GitHub Actions](https://github.com/YannSantana/qa-financas-a-dois/actions/runs/37489441329). O banco gratuito de homologação expira em 05/11/2026. O ambiente usa dados de teste e não deve receber informações financeiras reais.
