# Plano de testes

## O que quero descobrir

O aplicativo foi feito para duas pessoas organizarem dinheiro no mesmo espaço. O ponto mais importante para mim é saber se cada lançamento aparece para a pessoa certa e se os valores do resumo continuam corretos depois de incluir, editar ou remover dados. Também preciso conferir se o modo de demonstração deixa claro que os números são fictícios.

## Apresentação pública e demonstração

Rodei os testes automáticos sem Google e sem banco. Eles verificam a apresentação, a demonstração no navegador e o bloqueio de rotas que dependem de dados pessoais. Os resultados estão em [RELATORIO.md](RELATORIO.md).

## Fluxo financeiro com contas de teste

Parte dos cenários já foi executada pela API com banco descartável e sessões fictícias. Para a rodada completa pela interface, ainda serão necessárias duas contas Google de teste e um ambiente de homologação separado.

| ID | Cenário | O que espero observar | Estado |
| --- | --- | --- | --- |
| FT-01 | Entrar e sair com uma conta de teste | Sessão abre e termina sem mostrar dados após o logout. | Não executado |
| FT-02 | Registrar uma entrada | Valor aparece no mês correto e aumenta o total de entradas. | Não executado |
| FT-03 | Registrar uma despesa compartilhada | As duas pessoas veem o lançamento e o resumo considera o valor uma vez. | Aprovado pela API |
| FT-04 | Registrar uma despesa pessoal | Só quem criou vê o lançamento e seu valor. | Aprovado pela API |
| FT-05 | Editar e remover um lançamento próprio | Lista e totais refletem a mudança; o registro removido deixa de aparecer. | Não executado |
| FT-06 | Tentar alterar lançamento da outra pessoa | O acesso é recusado e os dados permanecem intactos. | Aprovado pela API |
| FT-07 | Criar e aceitar convite | A segunda conta entra no mesmo espaço; o convite não pode ser reutilizado. | Não executado |
| FT-08 | Criar e contribuir para uma meta | O progresso e o estado da meta acompanham os valores registrados. | Não executado |
| FT-09 | Limite do plano gratuito | Uma segunda meta ativa é recusada com mensagem clara. | Aprovado pela API |

## Critério para encerrar a próxima etapa

Cada cenário precisará de data, ambiente, resultado observado e evidência quando houver falha. Um teste bloqueado não será contado como aprovado. Se encontrar um problema, vou reproduzi-lo e registrar passos, impacto e captura antes de chamá-lo de bug.
