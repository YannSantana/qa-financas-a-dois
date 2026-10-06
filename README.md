# QA do Finanças a Dois

Este é meu projeto de testes para o [Finanças a Dois](https://github.com/YannSantana/financas-a-dois). Quis deixar registrado o caminho que segui: o que tentei, o que funcionou e o que ainda precisa de uma rodada com pessoas e contas reais de teste.

## O que já consegui testar

- **Sem login e sem banco:** a página abre, mas as rotas financeiras não entregam nem gravam dados. Também conferi o bloqueio de arquivos internos e de um pedido de logout vindo de outro site.
- **Com um banco descartável:** criei Ana e Beto, duas pessoas fictícias no mesmo espaço. Lancei despesas compartilhadas e pessoais, conferi os totais de outubro e tentei editar um lançamento da outra pessoa. Testei também o limite de uma meta ativa no plano gratuito. As sessões foram criadas só para o teste, sem passar pelo Google.
- **No navegador:** percorri a demonstração em tela grande e celular, usei busca e filtros e tentei salvar um lançamento sem conta. O aplicativo pediu login e não gravou os dados fictícios.

Na execução local de 06/10/2026, **15 testes passaram**: 11 no servidor e 4 no navegador. O teste de celular encontrou um problema no menu, que foi corrigido no [aplicativo](https://github.com/YannSantana/financas-a-dois). Os detalhes estão em [RELATORIO.md](RELATORIO.md). O [GitHub Actions](https://github.com/YannSantana/qa-financas-a-dois/actions) repete os testes a cada atualização.

## Como rodar

É preciso Node.js 22 ou superior, npm, Git e acesso à internet. Rode:

```bash
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Os testes baixam uma cópia temporária do aplicativo e apagam os dados de teste no fim. Não usam conta Google nem mexem em informações pessoais.

## Ambiente publicado para testes

A homologação está no [Render](https://financas-a-dois-qa-yannsantana.onrender.com), com um banco próprio. Em 06/10/2026, o [health check](https://financas-a-dois-qa-yannsantana.onrender.com/api/health) respondeu com `ok: true` e `database: connected`. Os 15 testes também passaram nesta [execução do GitHub Actions](https://github.com/YannSantana/qa-financas-a-dois/actions/runs/37489441329).

Use apenas dados fictícios nesse ambiente. O banco gratuito expira em **05/11/2026**; o site pode demorar para abrir depois de ficar sem uso. O login Google ainda precisa ser configurado para a rodada com duas contas de teste.

## Próximos passos

Ainda falta uma rodada na homologação com duas contas Google de teste e integrações configuradas. Login real, convite, edição e exclusão de lançamentos próprios, contribuições para metas e WhatsApp continuam no [plano](PLANO-DE-TESTES.md). Eles **não estão aprovados** só porque os testes acima passaram.
