# QA do Finanças a Dois

Criei este repositório para testar o [Finanças a Dois](https://github.com/YannSantana/financas-a-dois) sem misturar o trabalho de QA com o código do aplicativo. A ideia é mostrar não só se um teste passou, mas **o que foi verificado, por que isso importa e o que ainda falta testar**.

## O que testei de verdade

A suíte automática sobe uma cópia temporária do aplicativo **sem Google e sem banco de dados**. Nesse modo, a apresentação deve continuar acessível, mas ninguém deve conseguir consultar ou gravar dados financeiros. Também verifico que arquivos internos não ficam disponíveis pela web e que uma origem externa não consegue acionar o logout.

Os testes cobrem:

1. Página inicial e imagem da apresentação.
2. Avisos de integrações desativadas e estado do banco.
3. Bloqueio de leitura de sessão e gravação de lançamentos, metas e limites sem banco.
4. Bloqueio do login Google e da verificação do WhatsApp quando não configurados.
5. Proteção de arquivos internos e validação da origem no logout.

Na primeira execução, **8 testes passaram, 0 falharam e 0 foram bloqueados**. Veja o [relatório](RELATORIO.md) para o ambiente e o limite dessa conclusão.

## Como repetir

Você precisa de Node.js 22 ou superior, npm, Git e internet para baixar uma cópia temporária do aplicativo. Depois:

```bash
npm test
```

O teste baixa o repositório do aplicativo, instala as dependências nessa cópia temporária, inicia o servidor em uma porta local, faz as verificações e limpa os arquivos temporários ao terminar. Ele não usa sua conta Google nem altera seus dados.

## O que falta

Este é um teste do **modo demonstração**, não da aplicação inteira. Ainda preciso validar login real, lançamentos compartilhados e pessoais, cálculo dos totais, convites e metas com um banco e contas de teste. Deixei esses cenários descritos em [Plano de testes](PLANO-DE-TESTES.md), com status **não executado**. Não apresento esses fluxos como aprovados antes de testá-los.
