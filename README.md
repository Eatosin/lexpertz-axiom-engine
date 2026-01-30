# lexpertz-axiom-engine
UNDER CONSTRUCTION 🚧 

```text
lexpertz-axiom-engine/
├── .github/                # CI/CD Workflows (Quality Guard)
├── client/                 # NEXT.JS 15 (The Dashboard)
│   ├── src/
│   │   ├── app/            # App Router
│   │   ├── components/     # Shadcn UI
│   │   ├── lib/            # Zod Schemas (Mirroring Pydantic)
│   │   └── hooks/          # React Query (State Management)
│   ├── package.json
│   └── tailwind.config.ts
├── server/                 # FASTAPI (The Intelligence)
│   ├── app/
│   │   ├── agents/         # LangGraph Nodes (Critic, drafter)
│   │   ├── core/           # Config & Security
│   │   ├── models/         # Pydantic Schemas (The Truth)
│   │   └── api/            # Endpoints
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml      # Orchestration (Runs both locally)
└── README.md
```
