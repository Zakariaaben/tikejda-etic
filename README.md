# Repartition Tikejda

Petite application interne developpee pour organiser la sortie vers la montagne Tikejda entre les membres du club estudiantin ETIC.

Le but est simple: repartir les participants sur `n` bus tout en respectant les groupes d'affinite. Chaque personne peut indiquer un groupe de taille maximale `m` avec lequel elle souhaite etre placee, puis l'application s'occupe de la repartition.

Ce depot est destine au GitHub prive de l'organisation ETIC.

Made with <3 by [Zakaria Benhamiche](https://github.com/zakariaaben)

## Ce que fait l'application

- gere une repartition sur plusieurs bus
- prend en compte des groupes de personnes qui veulent rester ensemble
- impose une taille maximale `m` pour ces groupes
- facilite l'organisation de la sortie de maniere plus claire et pratique

## Contexte

Cette application a ete creee pour un besoin concret: organiser une sortie a Tikejda entre nous, membres d'ETIC, avec une repartition simple et exploitable des participants.

## Lancer le projet en local

Installe les dependances:

```bash
bun install
```

Configure ensuite les variables d'environnement necessaires dans `apps/web/.env`, puis applique le schema de base de donnees:

```bash
bun run db:push
```

Lance enfin le projet:

```bash
bun run dev
```

L'application web est disponible sur `http://localhost:3000`.

## Scripts utiles

- `bun run dev` - lance le projet en developpement
- `bun run build` - build toutes les applications
- `bun run check-types` - verifie le typage TypeScript
- `bun run db:push` - pousse le schema vers la base de donnees
- `bun run db:studio` - ouvre l'interface de la base de donnees

## Structure du projet

```text
repartition-tikejda/
|- apps/
|  `- web/        # application web
`- packages/
   |- api/        # logique metier et API
   |- auth/       # authentification
   |- config/     # configuration partagee
   `- db/         # schema et acces base de donnees
```
