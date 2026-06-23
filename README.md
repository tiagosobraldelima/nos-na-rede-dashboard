# Dashboard de presenças e certificação — Projeto Nós na Rede

Dashboard estático para acompanhar presenças, dispensas, atestados e a situação de certificação por frequência das participantes do Projeto Nós na Rede.

O painel lê dados publicados em CSV pelo Google Sheets, calcula o critério de frequência no navegador e apresenta indicadores, filtros, tabela detalhada e exportação CSV. Ele foi pensado para publicação simples via GitHub Pages, sem backend próprio.

## Fonte de dados

A fonte oficial usada pelo dashboard é a planilha pública publicada como CSV:

https://docs.google.com/spreadsheets/d/e/2PACX-1vQoGnE2RG9yDysuCwJubfxoJcbbdC8yfeguHrKOXwxyiIGAKxy71hvp8Uow4-3gucHLQlBOqp24NdaU/pub?gid=1700106572&single=true&output=csv

Quando a planilha for atualizada no Google Sheets e a publicação em CSV refletir essa alteração, o dashboard passa a consumir os novos dados automaticamente.

## Como funciona a atualização automática

O dashboard é uma página estática. Ao abrir a página, o navegador busca o CSV publicado no Google Sheets e recalcula os indicadores localmente.

Além da carga inicial, a página:

- consulta novamente a fonte CSV a cada 60 segundos;
- consulta novamente quando a aba ou janela volta a ficar ativa;
- reaplica filtros, cartões, gráficos e tabela quando detecta dados atualizados.

Como a fonte é uma publicação CSV do Google Sheets, pode haver um pequeno intervalo entre editar a planilha original e a versão publicada refletir a mudança.

## Regras de frequência e certificação

O cálculo implementado considera apenas o critério de frequência disponível nessa planilha.

Regras exatas:

- São 10 períodos presenciais no total.
- A pessoa precisa ter no mínimo 7 períodos válidos.
- `PRESENTE`, `DISPENSADO`, `ATESTADO MÉDICO` e a dispensa automática do 1º encontro contam como períodos válidos.
- `AUSENTE` não conta como período válido.
- Campos vazios em encontros posteriores ao 1º encontro ficam como sem registro.

Demais critérios de certificação, como questões e atividades de vivência, estão fora do cálculo porque não constam nessa planilha.

## Uso local

Na raiz do repositório, rode:

```bash
npm test
npm run serve
```

Depois de iniciar o servidor local, abra:

```text
http://localhost:8080
```

## Publicação via GitHub Pages

O projeto é publicado como site estático a partir da raiz do repositório.

Configuração recomendada no GitHub:

1. Faça merge das mudanças na branch `main`.
2. No repositório, acesse `Settings`.
3. Abra `Pages`.
4. Em `Build and deployment`, selecione `Source: Deploy from a branch`.
5. Configure `Branch: main`.
6. Configure `Folder: / (root)`.
7. Salve a configuração e aguarde o GitHub Pages concluir a publicação.

O arquivo de entrada publicado é `index.html`, localizado na raiz do repositório.

## Checklist de validação

Antes de publicar ou após alterar a planilha/fonte, valide:

- `npm test` passa sem falhas.
- `npm run serve` inicia o servidor local.
- A página abre em `http://localhost:8080`.
- Os dados carregam a partir da URL pública CSV correta.
- Os cartões e tabelas refletem 10 períodos presenciais e mínimo de 7 períodos válidos.
- `PRESENTE`, `DISPENSADO`, `ATESTADO MÉDICO` e dispensa automática do 1º encontro contam como válidos.
- `AUSENTE` não conta como válido.
- Vazios em encontros posteriores aparecem como sem registro.
- Filtros, busca e exportação CSV continuam funcionando.
- A publicação no GitHub Pages está configurada com `main` e `/ (root)`.
