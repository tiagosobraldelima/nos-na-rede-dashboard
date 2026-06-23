# Instruções de deploy — GitHub Pages

Este dashboard é um site estático publicado a partir da raiz do repositório.

## Configuração do GitHub Pages

No GitHub, configure:

`Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: / (root)`

Passo a passo:

1. Faça merge das mudanças na branch `main`.
2. Acesse `Settings` no repositório.
3. Abra a seção `Pages`.
4. Em `Build and deployment`, selecione `Source: Deploy from a branch`.
5. Em `Branch`, selecione `main`.
6. Em `Folder`, selecione `/ (root)`.
7. Salve e aguarde o GitHub Pages concluir a publicação.

## Validação antes de publicar

Na raiz do repositório, execute:

```bash
npm test
npm run serve
```

Com o servidor local ativo, abra `http://localhost:8080` e confirme que o dashboard carrega os dados da planilha CSV pública, atualiza os indicadores e mantém filtros, busca, tabela e exportação CSV funcionando.
