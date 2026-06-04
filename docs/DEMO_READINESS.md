# Demo Readiness

Demo Readiness показывает текущий operational MVP как управляемый B2B presale-процесс, а не как лендинг или набор отдельных экранов.

## Preflight

```powershell
cmd /c npm run db:health
cmd /c npm run demo:reset
cmd /c npm run demo:seed
cmd /c npm run demo:verify
cmd /c npm run dev
```

Demo data маркируется `ClientRequest.source = DEMO_READINESS`. Эти записи видны в manager queue, но исключены из business baseline / Track C readouts.

## Порядок показа на 5-7 минут

1. Открой `/admin/manager`.
2. Покажи, что в очереди есть три строки с marker `DEMO`.
3. Покажи baseline panel и проговори: demo data excluded, поэтому демо не загрязняет будущие business metrics.
4. Открой `DEMO-DR-001`.
5. Покажи strongest value: заявка без owner и без next action сразу требует внимания менеджера.
6. Вернись в очередь и открой `DEMO-DR-002`.
7. Покажи strongest value: request уже связан с qualification, recommendation, scene context, active Proposal `READY` и persisted ProposalVersion.
8. В proposal block открой PDF по ссылке `/api/proposals/pdf?proposalVersionId=...`.
9. Покажи действие “КП отправлено” как существующий process command, а не скрытую автоматизацию.
10. Вернись в очередь и открой `DEMO-DR-003`.
11. Покажи strongest value: КП уже отправлено, но outcome еще не зафиксирован, поэтому менеджеру виден follow-up и коммерческий долг.

## Demo scenarios

### DEMO-DR-001 / Новая заявка требует внимания

- `ClientRequest.status = NEEDS_REVIEW`
- owner отсутствует
- canonical `OPEN SalesAction` отсутствует
- цель: показать attention, ownership gap и отсутствие next action

### DEMO-DR-002 / КП готово к отправке

- `ClientRequest.status = IN_SALES`
- owner назначен
- есть `SelectionSession`
- есть `SceneProject`
- есть `Proposal.status = READY`
- есть latest `ProposalVersion`
- есть canonical `OPEN SalesAction`
- цель: показать связку recommendation -> scene -> proposal -> PDF -> sent path

### DEMO-DR-003 / КП отправлено, нужен итог

- `ClientRequest.status = PROPOSAL_SENT`
- owner назначен
- `Proposal.status = SENT`
- `Proposal.sentAt` заполнен
- есть canonical `OPEN SalesAction` follow-up
- `salesOutcome = null`
- цель: показать sent without outcome и handoff к выигрышу/проигрышу

## Strongest value points

- Очередь менеджера показывает не просто список заявок, а process state.
- Workspace заявки связывает клиента, квалификацию, подбор, сцену, КП, версии PDF и действия менеджера.
- PDF открывается из persisted `ProposalVersion`.
- Sales follow-through виден после отправки КП: процесс не заканчивается документом.
- Demo records не попадают в будущие Track C business baseline.

## Что не показывать как готовую production-функцию

- CRM-интеграции.
- Email automation.
- AI/RAG/vector search.
- Business analytics optimization по живым данным.
- Fake/proxy 3D.

## 3D policy

3D в DR-P0 не входит. Показывать 3D отдельно можно только если для конкретного SKU уже есть real mapped asset. Если такого asset нет, отсутствие 3D не является провалом Demo Readiness.

## Reset safety

`demo:reset` удаляет только дерево данных, корнем которого является `ClientRequest.source = DEMO_READINESS`. Existing internal manager user не удаляется.
