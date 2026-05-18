# Quality Gate

Este projeto usa um **Quality Gate determinístico** desde a fundação. A regra é simples: IA pode explicar, mas quem decide se passa ou falha são checks reproduzíveis por exit code.

## Filosofia

- Regressões bloqueiam; melhorias passam.
- O baseline aceito fica em `quality/baseline.json`.
- O baseline não deve ser atualizado em branch de feature para esconder queda de qualidade.
- AI explainers são auxiliares e nunca autorizam merge.

## O que bloqueia

| Sinal | Regra |
|---|---|
| Instalação/build | Falha bloqueia |
| Testes | Falha bloqueia |
| Coverage | Não pode cair contra baseline |
| Lint errors | Não podem aumentar |
| Duplicação | Não pode aumentar |
| Complexidade | Violações não podem aumentar |
| Arquivos grandes | Arquivo novo > 800 linhas bloqueia; arquivo oversized não pode crescer |
| Dependências | Vulnerabilidade crítica bloqueia |

Warnings continuam visíveis, mas não são escondidos.

## Rotina local

Execute no diretório `hotel-fazenda-system/`:

```bash
npm run quality:preflight
```

Esse comando roda:

1. `quality:validate`
2. `audit:report`
3. ESLint JSON
4. `npm run lint`
5. `npm run build`
6. `test:coverage:ci`
7. `duplication:ci`
8. `complexity:ci`
9. `quality:check`

Relatórios gerados ficam em `reports/` e não são versionados.

## CI ativo

O workflow ativo do monorepo é [`../../.github/workflows/quality-gate.yml`](../../.github/workflows/quality-gate.yml). Ele roda com `working-directory: hotel-fazenda-system`.

Templates antigos que estavam em `hotel-fazenda-system/.github/` foram arquivados em `../../.dev/ci-templates/` para referência e não são executados pelo GitHub.

## Atualizando baseline

Atualizar baseline é uma ação deliberada e rara:

```bash
git switch main
git pull
cd hotel-fazenda-system
npm run quality:baseline
git add quality/baseline.json
git commit -m "chore(quality): refresh baseline after reviewed improvements"
```

Use apenas após melhoria real mergeada ou regressão explicitamente aprovada em PR dedicado.

## Quando endurecer

| Quando | Próximo passo |
|---|---|
| Coverage estabilizar acima de 60% | Ativar minimums absolutos como blocking |
| Duplicação ficar consistentemente abaixo de 3% | Tornar máximo absoluto blocking |
| Lint warnings zerar | Tornar aumento de warnings blocking |

Critérios humanos complementares ficam em [`CODE_QUALITY_CRITERIA.md`](CODE_QUALITY_CRITERIA.md).
