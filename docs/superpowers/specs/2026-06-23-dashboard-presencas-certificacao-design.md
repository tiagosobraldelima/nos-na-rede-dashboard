# Dashboard de Presenças e Certificação — Projeto Nós na Rede

Data de aprovação do desenho: 23 de junho de 2026  
Status: desenho aprovado para planejamento de implementação

## Objetivo

Construir um novo dashboard do Projeto Nós na Rede voltado ao controle operacional dos registros de presença, falta, dispensa e situação de certificação dos cursistas.

O painel deve preservar a identidade visual do dashboard existente do projeto, consumir diretamente a planilha Google Sheets publicada em CSV e permitir acompanhamento por turma, município, educador/formador, encontro presencial e situação de certificação.

## Fonte de dados

O dashboard usará como fonte primária o CSV publicado do Google Sheets:

`https://docs.google.com/spreadsheets/d/e/2PACX-1vQoGnE2RG9yDysuCwJubfxoJcbbdC8yfeguHrKOXwxyiIGAKxy71hvp8Uow4-3gucHLQlBOqp24NdaU/pub?gid=1700106572&single=true&output=csv`

A leitura será feita no navegador, com atualização automática no carregamento da página e revalidação periódica. O painel exibirá a data e hora da última atualização bem-sucedida.

Colunas identificadas na planilha:

- `ORD`
- `NOME`
- `CPF`
- `Nº INSCRIÇÃO`
- `STATUS DA INSCRIÇÃO`
- `MUNICÍPIO`
- `TURMA`
- `E-MAIL`
- `EDUCADOR(A)`
- `Nº ENCONTRO`
- `DATA DO ENCONTRO`
- `1º TURNO`
- `2º TURNO`
- `OBSERVAÇÕES`

O dashboard deve normalizar nomes de colunas com pequenas variações de acento, caixa ou espaços, preservando a lógica principal quando a planilha tiver ajustes não estruturais.

## Identidade visual

O novo painel deve reutilizar o padrão visual do dashboard existente:

- logomarca oficial e elementos institucionais preservados;
- paleta, tipografia e linguagem visual compatíveis com o Projeto Nós na Rede;
- cards arredondados, visual limpo, responsivo e com hierarquia clara;
- rodapé e estrutura geral alinhados ao dashboard original;
- novos componentes visuais devem seguir a mesma linguagem de cor, espaçamento, ícones e comportamento responsivo.

## Modelo de dados

A unidade analítica principal será o cursista.

Cada cursista será identificado preferencialmente por `CPF` e `Nº INSCRIÇÃO`. Quando esses campos estiverem indisponíveis, o painel usará uma chave composta segura com `NOME`, `E-MAIL`, `TURMA` e `MUNICÍPIO`.

Cada linha da planilha representa o registro de um cursista em um encontro presencial, com dois períodos:

- `1º TURNO`;
- `2º TURNO`.

O dashboard consolidará os registros em 5 encontros presenciais e 10 períodos totais previstos por cursista.

## Regras de carga horária e certificação

O Projeto Nós na Rede tem carga horária total de 120 horas:

- 90 horas a distância;
- 30 horas presenciais.

A carga presencial é composta por 5 encontros, cada um com 2 períodos, totalizando 10 períodos presenciais.

Para certificação pelo critério de frequência presencial, o cursista precisa alcançar no mínimo 75% dos períodos presenciais. Como o total é de 10 períodos, o mínimo exigido é de 7 períodos válidos.

## Regras de presença, falta e dispensa

Valores reconhecidos:

- `PRESENTE`: conta como presença e período válido;
- `AUSENTE`: conta como falta e não conta como período válido;
- `DISPENSADO`: conta como dispensa e período válido;
- `ATESTADO MÉDICO`: será tratado como dispensa e período válido;
- vazio, ausente ou sem lançamento no 1º encontro: será tratado como dispensa automática somente para o 1º encontro, conforme regra específica aprovada.

A dispensa equivale à presença para cálculo de percentual de frequência e situação de certificação.

Para encontros posteriores ao 1º encontro, períodos sem lançamento serão tratados como sem registro, não como falta automática. Eles entram na projeção de acompanhamento enquanto o projeto ainda estiver em execução.

## Cálculos por cursista

Para cada cursista, o dashboard calculará:

- períodos presenciais previstos: sempre 10;
- períodos com presença;
- períodos com falta;
- períodos com dispensa explícita;
- períodos com dispensa automática do 1º encontro;
- total de períodos válidos para frequência;
- percentual de frequência presencial, calculado como períodos válidos divididos por 10;
- períodos restantes possíveis, calculados a partir dos encontros ainda não lançados;
- situação de certificação;
- observação automática de risco.

Situação de certificação:

- `Apto pelo critério de frequência`: cursista possui 7 ou mais períodos válidos;
- `Em acompanhamento`: cursista ainda não possui 7 períodos válidos, mas ainda pode alcançar o mínimo considerando os períodos restantes;
- `Não apto pelo critério de frequência`: cursista não alcança 7 períodos válidos e já não consegue atingir o mínimo mesmo com presença em todos os períodos restantes.

Observações automáticas:

- `Apto`: já cumpriu o mínimo presencial;
- `Atenção`: ainda depende de novos registros para atingir o mínimo;
- `Risco alto`: precisa comparecer a todos ou quase todos os períodos restantes para alcançar 7;
- `Não apto`: não consegue mais atingir o mínimo de 7 períodos válidos.

## Indicadores obrigatórios

O painel exibirá, no mínimo:

- total de cursistas cadastrados;
- total de turmas;
- total de municípios;
- total de educadores/formadores;
- total de períodos presenciais previstos por cursista: 10;
- total geral de períodos previstos: cursistas filtrados multiplicados por 10;
- total de presenças registradas;
- total de faltas registradas;
- total de dispensas registradas, incluindo dispensas explícitas, atestados médicos e dispensas automáticas do 1º encontro;
- percentual geral de frequência;
- quantidade de cursistas aptos à certificação pelo critério de frequência presencial;
- quantidade de cursistas em acompanhamento;
- quantidade de cursistas não aptos à certificação pelo critério de frequência presencial;
- percentual de cursistas aptos;
- percentual de cursistas em acompanhamento;
- percentual de cursistas não aptos.

## Layout aprovado: opção A

O dashboard terá orientação operacional e foco em risco.

Estrutura principal:

1. Cabeçalho institucional com título, descrição curta, status da atualização e fonte dos dados.
2. Filtros globais por turma, município, educador/formador, encontro presencial, situação de certificação e status da inscrição.
3. Cards-resumo com indicadores principais.
4. Bloco de alerta para cursistas em risco de não certificação.
5. Visualizações sintéticas:
   - distribuição de presença, falta e dispensa por encontro;
   - situação de certificação dos cursistas;
   - acompanhamento por turma;
   - acompanhamento por município;
   - acompanhamento por educador/formador.
6. Tabela individual de cursistas com cálculos completos.
7. Listas/rankings de aptos, em acompanhamento e não aptos.
8. Rodapé institucional preservado.

## Filtros e interação

Filtros globais:

- turma;
- município;
- educador/formador;
- encontro presencial;
- situação do cursista: apto, em acompanhamento ou não apto;
- status da inscrição.

Os filtros devem atualizar cards, gráficos, listas e tabela individual de forma consistente.

A tabela individual deve permitir busca por nome, CPF, inscrição, turma, município ou educador, além de ordenação por frequência, períodos válidos, faltas e situação.

## Validação

Antes da publicação, serão validados:

- a planilha é carregada a partir do link CSV informado;
- a coluna `EDUCADOR(A)` está presente e alimenta filtro e visualizações;
- o total de períodos presenciais por cursista é 10;
- o mínimo de certificação é 7 períodos válidos;
- dispensas explícitas são somadas como períodos válidos;
- `ATESTADO MÉDICO` é contado como dispensa;
- cursistas sem lançamento no 1º encontro recebem dispensa automática para os períodos correspondentes;
- faltas não contam como períodos válidos;
- percentuais usam denominadores consistentes;
- cards, gráficos e tabela reconciliam entre si após aplicação de filtros;
- atualização automática reflete alterações da planilha publicada;
- layout funciona em desktop e dispositivos móveis;
- identidade visual original foi preservada.

## Publicação e entrega

O projeto será publicado no GitHub, preferencialmente via GitHub Pages.

O repositório deverá conter:

- código-fonte organizado;
- README com descrição do projeto;
- instruções para atualização da base de dados;
- explicação das regras de frequência, dispensa e certificação;
- link do dashboard publicado.

Ao final da implementação, será entregue um resumo técnico com:

- arquivos criados ou alterados;
- regras de cálculo implementadas;
- configuração da integração com Google Sheets;
- validações realizadas;
- link do repositório;
- link público do dashboard publicado.

## Fora de escopo

Este dashboard não calculará os demais critérios de certificação que não constam na planilha de presença, como aproveitamento em questões de múltipla escolha e entrega das atividades de vivência. Esses critérios serão mencionados apenas como referência institucional quando necessário, sem inventar dados ou inferir aprovação final completa do cursista.
